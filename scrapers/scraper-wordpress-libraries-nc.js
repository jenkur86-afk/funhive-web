// 9 entries removed 2026-08-09 (MASTER-PLAN Defect A): their {city}library.org
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
 * North Carolina Public Libraries Scraper - Coverage: All North Carolina public libraries
 */
const LIBRARIES = [
  { name: 'Hazel W. Guilford Memorial Library', url: 'https://bhmlib.org/', eventsUrl: 'https://bhmlib.org/', city: 'Aurora', state: 'NC', zipCode: '00000', county: 'Beaufort County'},
  { name: 'Bath Community Library', url: 'https://bhmlib.org/', eventsUrl: 'https://bhmlib.org/', city: 'Bath', state: 'NC', zipCode: '00000', county: 'Beaufort County'},
  { name: 'Belmont Branch Library', url: 'https://gastonlibrary.org/', eventsUrl: 'https://gastonlibrary.org/calendar.aspx', city: 'Belmont', state: 'NC', zipCode: '00000', county: 'Gaston County'},
  { name: 'Mary Duncan Public Library', url: 'https://www.pljcs.org/', eventsUrl: 'https://www.pljcs.org/monthly-calendar', city: 'Benson', state: 'NC', zipCode: '00000', county: 'Johnston County'},
  { name: 'Margaret Little Blount Library', url: 'https://www.sheppardlibrary.org/', eventsUrl: 'https://www.sheppardlibrary.org/calendar.aspx', city: 'Bethel', state: 'NC', zipCode: '00000', county: 'Pitt County'},
  { name: 'Black Creek Branch Library', url: 'https://www.wilsoncountypubliclibrary.org/', eventsUrl: 'https://www.wilsoncountypubliclibrary.org/events/library-calendar', city: 'Black Creek', state: 'NC', zipCode: '00000', county: 'Wilson County'},
  { name: 'Watauga County Public Library', url: 'https://www.boonelibrary.org', eventsUrl: 'https://www.boonelibrary.org/events', city: 'Boone', state: 'NC', zipCode: '00000', county: 'Watauga'},
  { name: 'Boonville Community Public Library', url: 'https://www.nwrl.org/', eventsUrl: 'https://nwrl.org/regional-library-events/', city: 'Boonville', state: 'NC', zipCode: '00000', county: 'Yadkin County'},
  { name: 'Bunn Branch Library', url: 'https://www.bunnlibrary.org', eventsUrl: 'https://www.bunnlibrary.org/events', city: 'Bunn', state: 'NC', zipCode: '00000', county: 'Franklin'},
  // REMOVED 2026-08-11 (MASTER-PLAN Defect A): configured host serves a library in PA, not NC. Confirmed live in reports/verification-comments.json. Removed now rather than later because today's date-extraction fixes mean this scraper CAN now read pages it previously failed on, which would have started importing another state's events under this name. RECORDED COVERAGE GAP - restore when a real URL is verified.
  // { name: 'Canton Branch Library', url: 'https://www.cantonlibrary.org', eventsUrl: 'https://www.cantonlibrary.org/events', city: 'Canton', state: 'NC', zipCode: '00000', county: 'Haywood'},
  // Moore County Library REMOVED 2026-08-07: srls.info 301-redirects to LibGuides
  // (Sandhill Regional Library System), a platform this WordPress DOM scraper
  // cannot read. Real coverage rebuilt in scraper-sandhill-regional-library-nc.js
  // (SandhillRegional-NC), which reads the system's embedded LibCal calendar.
  { name: 'Cary Branch Library', url: 'https://www.carylibrary.org', eventsUrl: 'https://www.carylibrary.org/events', city: 'Cary', state: 'NC', zipCode: '00000', county: 'Wake'},
  { name: 'Beatties Ford Road Branch Library', url: 'https://www.cmlibrary.org/', eventsUrl: 'https://www.cmlibrary.org/programs-and-events', city: 'Charlotte', state: 'NC', zipCode: '00000', county: 'Mecklenburg County'},
  { name: 'Claremont Branch Library', url: 'https://www.catawbacountync.gov/county-services/library/', eventsUrl: 'https://www.catawbacountync.gov/county-services/library/calendar-of-events/', city: 'Claremont', state: 'NC', zipCode: '00000', county: 'Catawba County'},
  // REMOVED 2026-08-11 (MASTER-PLAN Defect A): configured host serves a library in CA, not NC. Confirmed live in reports/verification-comments.json. Removed now rather than later because today's date-extraction fixes mean this scraper CAN now read pages it previously failed on, which would have started importing another state's events under this name. RECORDED COVERAGE GAP - restore when a real URL is verified.
  // { name: 'Hocutt Ellington Memorial Library', url: 'https://www.claytonlibrary.org', eventsUrl: 'https://www.claytonlibrary.org/events', city: 'Clayton', state: 'NC', zipCode: '00000', county: 'Johnston'},
  { name: 'J.C. Holliday Library', url: 'https://www.clintonlibrary.org', eventsUrl: 'https://www.clintonlibrary.org/events', city: 'Clinton', state: 'NC', zipCode: '00000', county: 'Sampson', urlCollision: 'clintonlibrary.org is dead or serves an unrelated site — no state entry is correct' },
  // 2026-08-05: was columbialibrary.org, a domain also claimed by AL/CT/IL/KY/MS/PA/SC entries.
  // Per the State Library of NC directory, Tyrrell County Library is a branch of Pettigrew
  // Regional Library — same verified system site as the Plymouth entry below.
  { name: 'Tyrrell County Library', url: 'https://pettigrewlibraries.org/', eventsUrl: 'https://pettigrewlibraries.org/', city: 'Columbia', state: 'NC', zipCode: '27925', county: 'Tyrrell County'},
  { name: 'Polk County Public Library', url: 'https://www.columbuslibrary.org', eventsUrl: 'https://www.columbuslibrary.org/events', city: 'Columbus', state: 'NC', zipCode: '28722', county: 'Columbus County', urlCollision: 'columbuslibrary.org is OH, not NC' },
  { name: 'Dallas Branch Library', url: 'https://gastonlibrary.org/', eventsUrl: 'https://gastonlibrary.org/calendar.aspx', city: 'Dallas', state: 'NC', zipCode: '00000', county: 'Gaston County'},
  { name: 'Danbury Public Library', url: 'https://www.nwrl.org/', eventsUrl: 'https://nwrl.org/regional-library-events/', city: 'Danbury', state: 'NC', zipCode: '00000', county: 'Stokes County'},
  { name: 'Florence S. Shanklin Branch Library', url: 'https://www.denverlibrary.org', eventsUrl: 'https://www.denverlibrary.org/events', city: 'Denver', state: 'NC', zipCode: '00000', county: 'Lincoln'},
  { name: 'Dobson Community Library', url: 'https://www.dobsonlibrary.org', eventsUrl: 'https://www.dobsonlibrary.org/events', city: 'Dobson', state: 'NC', zipCode: '00000', county: 'Surry'},
  { name: 'Farmville Public Library', url: 'https://farmvillelibrary.libguides.com/', eventsUrl: 'https://farmvillelibrary.libguides.com/home', city: 'Farmville', state: 'NC', zipCode: '27828', county: 'Pitt'},
  // REMOVED 2026-08-16 — fayettevillelibrary.org is HIJACKED and now serves an
  // Indonesian gambling site, verified live. Same guessed domain was configured in
  // GA, NC and NY simultaneously. Bordeaux Branch is real: it belongs to Cumberland
  // County Public Library (cumberlandcountync.gov/library), which is NOT WordPress —
  // so this is a relocation job, not a URL swap. OPEN COVERAGE GAP until then.
  { name: 'Macon County Public Library', url: 'https://www.franklinlibrary.org', eventsUrl: 'https://www.franklinlibrary.org/events', city: 'Franklin', state: 'NC', zipCode: '00000', county: 'Franklin County', urlCollision: 'franklinlibrary.org is dead or serves an unrelated site — no state entry is correct' },
  // URL corrected 2026-08-11 (was franklinvillelibrary.org): Randolph County Public Library branch page: 111 Sumner Place, Franklinville NC 27248, phone 336-685-3100; also called Franklinville Public L
  { name: 'John W. Clark Public Library', url: 'https://randolphlibrary.libguides.com/c.php?g=247617', eventsUrl: 'https://randolphlibrary.libguides.com/c.php?g=1204272&p=8808824', city: 'Franklinville', state: 'NC', zipCode: '00000', county: 'Randolph'},
  // URL corrected 2026-08-11 (was fremontlibrary.org): Wayne County NC system; Fremont branch now the Northern Wayne Library, 609 S Wilson St Fremont NC 27830, ph 919-705-1892; wcpl.org linked fr
  { name: 'Wayne County Public Library, Fremont', url: 'https://wcpl.org/', eventsUrl: 'https://wcpl.org/events', city: 'Fremont', state: 'NC', zipCode: '00000', county: 'Wayne'},
  { name: 'Graham Public Library', url: 'https://library.alamancecountync.gov/', eventsUrl: 'https://library.alamancecountync.gov/calendar/', city: 'Graham', state: 'NC', zipCode: '00000', county: 'Alamance County'},
  { name: 'Blanche Benjamin Branch Library', url: 'https://www.greensborolibrary.org', eventsUrl: 'https://www.greensborolibrary.org/events', city: 'Greensboro', state: 'NC', zipCode: '00000', county: 'Guilford'},
  { name: 'Carver Branch Library', url: 'https://www.sheppardlibrary.org/', eventsUrl: 'https://www.sheppardlibrary.org/calendar.aspx', city: 'Greenville', state: 'NC', zipCode: '00000', county: 'Pitt County'},
  // REMOVED 2026-08-11 (MASTER-PLAN Defect A): configured host serves a library in NH, not NC. Confirmed live in reports/verification-comments.json. Removed now rather than later because today's date-extraction fixes mean this scraper CAN now read pages it previously failed on, which would have started importing another state's events under this name. RECORDED COVERAGE GAP - restore when a real URL is verified.
  // { name: 'Hampstead Branch Library', url: 'https://www.hampsteadlibrary.org/', eventsUrl: 'https://www.hampsteadlibrary.org/', city: 'Hampstead', state: 'NC', zipCode: '00000', county: 'Pender'},
  { name: 'Harmony Branch Library', url: 'https://www.harmonylibrary.org', eventsUrl: 'https://www.harmonylibrary.org/events', city: 'Harmony', state: 'NC', zipCode: '00000', county: 'Iredell', urlCollision: 'harmonylibrary.org is dead or serves an unrelated site — no state entry is correct' },
  // REMOVED 2026-08-11 — seed-data URL collision (MASTER-PLAN Defect A).
  // harrisburglibrary.org is Harrisburg DISTRICT Library, 2 W Walnut Street,
  // Harrisburg, ILLINOIS 62946 (area code 618) — verified live. Not Harrisburg
  // NC. Illinois is not even in the active region, so had extraction succeeded
  // this would have imported Illinois events labelled North Carolina; it instead
  // produced 12 of WordPress-NC's remaining invalid dates.
  //
  // THIS LEAVES A REAL COVERAGE GAP, it is not a replacement. Harrisburg NC is
  // served by Cabarrus County Public Library (~216,000 people), which has NO
  // active coverage: scraper-activecalendar-cabarrus-nc.js exists but is not in
  // scraper-registry.js, its ActiveCalendar platform is deprecated, and the
  // SirsiDynix site it migrated to (cabarrus-cep.bc.sirsidynix.net/events/list/)
  // sits behind a Cloudflare challenge that Puppeteer did not clear. Tracked as
  // an open gap in reports/fix-notes.json.
  { name: 'Havelock-Craven County Public', url: 'https://citylibrary.com/', eventsUrl: 'https://citylibrary.com/public-libraries/havelock-public-library/', city: 'Havelock', state: 'NC', zipCode: '00000', county: 'Craven'},
  // REMOVED 2026-08-11 (MASTER-PLAN Defect A): configured host serves a library in TN, not NC. Confirmed live in reports/verification-comments.json. Removed now rather than later because today's date-extraction fixes mean this scraper CAN now read pages it previously failed on, which would have started importing another state's events under this name. RECORDED COVERAGE GAP - restore when a real URL is verified.
  // { name: 'Henderson County Public Library', url: 'https://youseemore.com/', eventsUrl: 'https://youseemore.com/hendersonville/', city: 'Hendersonville', state: 'NC', zipCode: '28739', county: 'Henderson'},
  { name: 'Hickory Public Library', url: 'https://www.hickorylibrary.org', eventsUrl: 'https://www.hickorylibrary.org/events', city: 'Hickory', state: 'NC', zipCode: '28601', county: 'Catawba'},
  { name: 'Hudson Branch Library', url: 'https://www.hudsonlibrary.org', eventsUrl: 'https://www.hudsonlibrary.org/events', city: 'Hudson', state: 'NC', zipCode: '00000', county: 'Caldwell', urlCollision: 'hudsonlibrary.org is OH, not NC' },
  { name: 'Union West Branch Library', url: 'https://www.indiantraillibrary.org', eventsUrl: 'https://www.indiantraillibrary.org/events', city: 'Indian Trail', state: 'NC', zipCode: '00000', county: 'Union'},
  { name: 'King Public Library', url: 'https://www.kinglibrary.org', eventsUrl: 'https://www.kinglibrary.org/events', city: 'King', state: 'NC', zipCode: '00000', county: 'Stokes'},
  { name: 'La Grange Branch Library', url: 'https://lagrangelibrary.org/', eventsUrl: 'https://lagrangelibrary.org/', city: 'La Grange', state: 'NC', zipCode: '00000', county: 'Lenoir', urlCollision: 'lagrangelibrary.org is IL, not NC' },
  { name: 'Leland Branch Library', url: 'https://www.lelandlibrary.org', eventsUrl: 'https://www.lelandlibrary.org/events', city: 'Leland', state: 'NC', zipCode: '00000', county: 'Brunswick', urlCollision: 'lelandlibrary.org is MI, not NC' },
  { name: 'Davidson County Public Library System', url: 'https://www.lexingtonlibrary.org', eventsUrl: 'https://www.lexingtonlibrary.org/events', city: 'Lexington', state: 'NC', zipCode: '27292', county: 'Davidson', urlCollision: 'lexingtonlibrary.org is dead or serves an unrelated site — no state entry is correct' },
  // REMOVED 2026-08-11 (MASTER-PLAN Defect A): configured host serves a library in TX (not a library — Liberty Library Project, a political nonprofit in Conroe TX), not NC. Confirmed live in reports/verification-comments.json. Removed now rather than later because today's date-extraction fixes mean this scraper CAN now read pages it previously failed on, which would have started importing another state's events under this name. RECORDED COVERAGE GAP - restore when a real URL is verified.
  // { name: 'Liberty Public Library', url: 'https://libertylibrary.org/', eventsUrl: 'https://libertylibrary.org/', city: 'Liberty', state: 'NC', zipCode: '00000', county: 'Randolph'},
  { name: 'Littleton Public Library (Wc Jones Memorial)', url: 'https://www.littletonlibrary.org', eventsUrl: 'https://www.littletonlibrary.org/events', city: 'Littleton', state: 'NC', zipCode: '00000', county: 'Halifax', urlCollision: 'littletonlibrary.org is MA, not NC' },
  { name: 'Franklin County Library', url: 'https://www.louisburglibrary.org', eventsUrl: 'https://www.louisburglibrary.org/events', city: 'Louisburg', state: 'NC', zipCode: '27549', county: 'Franklin'},
  { name: 'Lowell Branch Library', url: 'https://gastonlibrary.org/', eventsUrl: 'https://gastonlibrary.org/calendar.aspx', city: 'Lowell', state: 'NC', zipCode: '00000', county: 'Gaston County'},
  { name: 'Madison Branch Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'NC', zipCode: '00000', county: 'Madison County', urlCollision: 'madisonlibrary.org is KY, not NC' },
  // REMOVED 2026-08-11 (MASTER-PLAN Defect A): configured host serves a library in MA, not NC. Confirmed live in reports/verification-comments.json. Removed now rather than later because today's date-extraction fixes mean this scraper CAN now read pages it previously failed on, which would have started importing another state's events under this name. RECORDED COVERAGE GAP - restore when a real URL is verified.
  // { name: 'Florence Gallier Library', url: 'https://www.magnolialibrary.org', eventsUrl: 'https://www.magnolialibrary.org/events', city: 'Magnolia', state: 'NC', zipCode: '00000', county: 'Duplin'},
  { name: 'Mcdowell County Law Library', url: 'https://www.marionlibrary.org/', eventsUrl: 'https://www.marionlibrary.org/', city: 'Marion', state: 'NC', zipCode: '00000', county: 'McDowell', urlCollision: 'marionlibrary.org is OH, not NC' },
  { name: 'Madison County Public Library', url: 'https://www.marshalllibrary.org', eventsUrl: 'https://www.marshalllibrary.org/events', city: 'Marshall', state: 'NC', zipCode: '28753', county: 'Madison'},
  // Matthews Branch Library REMOVED 2026-08-23 — genuinely redundant, proven not assumed.
  // cmlibrary.org runs BiblioCommons, so this WordPress entry could never read an event
  // from it. BiblioCommons-NC already scrapes cmlibrary.bibliocommons.com and holds 102
  // rows from that host, 18 of them under the venue "Matthews".
  // Verified with scripts/verify-coverage.js --state=NC --exclude-scraper=WordPress-NC
  // --host=cmlibrary.bibliocommons.com -> VERDICT: COVERED. Identity is by source_url host,
  // and the audited scraper's own 152 rows were excluded from the evidence.
  //
  // The sibling entry above (Beatties Ford Road Branch, same cmlibrary.org URL) is
  // DELIBERATELY LEFT IN PLACE: no row under that venue name exists in the BiblioCommons
  // window, and an absence is not proof of coverage. It stays as an explained gap.
  // REMOVED 2026-08-11 (MASTER-PLAN Defect A): configured host serves a library in MO, not NC. Confirmed live in reports/verification-comments.json. Removed now rather than later because today's date-extraction fixes mean this scraper CAN now read pages it previously failed on, which would have started importing another state's events under this name. RECORDED COVERAGE GAP - restore when a real URL is verified.
  // { name: 'Maysville Public Library', url: 'https://www.maysvillelibrary.org', eventsUrl: 'https://www.maysvillelibrary.org/events', city: 'Maysville', state: 'NC', zipCode: '00000', county: 'Jones'},
  { name: 'Union County Public Library', url: 'https://www.monroelibrary.org', eventsUrl: 'https://www.monroelibrary.org/events', city: 'Monroe', state: 'NC', zipCode: '28112', county: 'Union', urlCollision: 'monroelibrary.org is dead or serves an unrelated site — no state entry is correct' },
  { name: 'Mooresville Public Library', url: 'https://www.mooresvillelibrary.org/', eventsUrl: 'https://www.mooresvillelibrary.org/', city: 'Mooresville', state: 'NC', zipCode: '28115', county: 'Iredell'},
  // URL corrected 2026-08-11 (was newbernlibrary.org): Now named Craven-Pamlico Regional Library (Carteret gone); New Bern branch 400 Johnson Street, New Bern NC 28560, phone 252-638-7800
  { name: 'Craven-Pamlico-Carteret Regional Library', url: 'https://mycprl.org', eventsUrl: 'https://mycprl.org/events/all-library-events', city: 'New Bern', state: 'NC', zipCode: '28560', county: 'Craven'},
  { name: 'Catawba County Library', url: 'https://www.catawbacountync.gov/county-services/library/', eventsUrl: 'https://www.catawbacountync.gov/county-services/library/calendar-of-events/', city: 'Newton', state: 'NC', zipCode: '28658', county: 'Catawba County'},
  { name: 'Norwood Branch Library', url: 'https://norwoodlibrary.org/', eventsUrl: 'https://norwoodlibrary.org/', city: 'Norwood', state: 'NC', zipCode: '00000', county: 'Stanly', urlCollision: 'norwoodlibrary.org is MA, not NC' },
  // REMOVED 2026-08-11 (MASTER-PLAN Defect A): configured host serves a library in WI, not NC. Confirmed live in reports/verification-comments.json. Removed now rather than later because today's date-extraction fixes mean this scraper CAN now read pages it previously failed on, which would have started importing another state's events under this name. RECORDED COVERAGE GAP - restore when a real URL is verified.
  // { name: 'Berea Branch Library', url: 'https://oxfordlibrary.org/', eventsUrl: 'https://oxfordlibrary.org/', city: 'Oxford', state: 'NC', zipCode: '00000', county: 'Granville'},
  // REMOVED 2026-08-11 (MASTER-PLAN Defect A): configured host serves a library in ME, not NC. Confirmed live in reports/verification-comments.json. Removed now rather than later because today's date-extraction fixes mean this scraper CAN now read pages it previously failed on, which would have started importing another state's events under this name. RECORDED COVERAGE GAP - restore when a real URL is verified.
  // { name: 'Pembroke Public Library', url: 'https://www.pembrokelibrary.org/', eventsUrl: 'https://www.pembrokelibrary.org/upcoming-events', city: 'Pembroke', state: 'NC', zipCode: '00000', county: 'Robeson'},
  // Pinebluff Public Library REMOVED 2026-08-07: see SandhillRegional-NC (same
  // srls.info -> LibGuides migration as Moore County Library above).
  // 2026-08-05: was https://plymouthlibrary.org/ — that domain is Plymouth District Library,
  // MICHIGAN. Verified correct site is pettigrewlibraries.org (regional office at 201 E 3rd St,
  // Plymouth NC 27962; serves Chowan, Perquimans, Tyrrell, Washington counties).
  { name: 'Pettigrew Regional Library', url: 'https://pettigrewlibraries.org/', eventsUrl: 'https://pettigrewlibraries.org/', city: 'Plymouth', state: 'NC', zipCode: '27962', county: 'Washington County'},
  { name: 'Princeton Public Library', url: 'https://www.pljcs.org/', eventsUrl: 'https://www.pljcs.org/monthly-calendar', city: 'Princeton', state: 'NC', zipCode: '00000', county: 'Johnston County'},
  { name: 'Roanoke Rapids Public Library', url: 'https://www.roanokerapidslibrary.org/', eventsUrl: 'https://www.roanokerapidslibrary.org/', city: 'Roanoke Rapids', state: 'NC', zipCode: '27870', county: 'Halifax'},
  // Robbins Area Branch and Leath Memorial Library REMOVED 2026-08-07: see
  // SandhillRegional-NC (same srls.info -> LibGuides migration).
  { name: 'Rowan Public Library', url: 'https://www.salisburylibrary.org/', eventsUrl: 'https://www.salisburylibrary.org/', city: 'Salisbury', state: 'NC', zipCode: '28145', county: 'Rowan', urlCollision: 'salisburylibrary.org is MA, not NC' },
  { name: 'Selma Public Library', url: 'https://www.pljcs.org/', eventsUrl: 'https://www.pljcs.org/monthly-calendar', city: 'Selma', state: 'NC', zipCode: '00000', county: 'Johnston County'},
  // URL corrected 2026-08-11 (was shelbylibrary.org): Cleveland County NC government library page, phone 704-484-4900, PO Box 1210 Shelby NC 28151; branch at 104 Howie Dr Shelby NC 28150
  { name: 'Cleveland County Memorial Library', url: 'https://www.clevelandcounty.com/main/departments/library/index.php', eventsUrl: 'https://www.clevelandcounty.com/main/departments/library/index.php', city: 'Shelby', state: 'NC', zipCode: '28150', county: 'Cleveland'},
  { name: 'Public Library Of Johnston County Smithfield', url: 'https://www.pljcs.org/', eventsUrl: 'https://www.pljcs.org/monthly-calendar', city: 'Smithfield', state: 'NC', zipCode: '27577', county: 'Johnston County'},
  { name: 'Brunswick County Library', url: 'https://www.southportlibrary.org', eventsUrl: 'https://www.southportlibrary.org/events', city: 'Southport', state: 'NC', zipCode: '28461', county: 'Brunswick', urlCollision: 'southportlibrary.org is ME, not NC' },
  { name: 'Alleghany County Public Library', url: 'https://www.nwrl.org/', eventsUrl: 'https://nwrl.org/regional-library-events/', city: 'Sparta', state: 'NC', zipCode: '00000', county: 'Alleghany County'},
  { name: 'Spring Lake Branch', url: 'https://www.springlakelibrary.org', eventsUrl: 'https://www.springlakelibrary.org/events', city: 'Spring Lake', state: 'NC', zipCode: '00000', county: 'Cumberland', urlCollision: 'springlakelibrary.org is NJ, not NC' },
  { name: 'Stanley Branch Library', url: 'https://gastonlibrary.org/', eventsUrl: 'https://gastonlibrary.org/calendar.aspx', city: 'Stanley', state: 'NC', zipCode: '00000', county: 'Gaston County'},
  { name: 'Star Branch', url: 'https://www.starlibrary.org', eventsUrl: 'https://www.starlibrary.org/events', city: 'Star', state: 'NC', zipCode: '00000', county: 'Montgomery'},
  // Montgomery County Library REMOVED 2026-08-07: see SandhillRegional-NC (same
  // srls.info -> LibGuides migration).
  { name: 'Warsaw-Kornegay Public Library', url: 'https://www.warsawlibrary.org/', eventsUrl: 'https://www.warsawlibrary.org/', city: 'Warsaw', state: 'NC', zipCode: '00000', county: 'Duplin', urlCollision: 'warsawlibrary.org is IN, not NC' },
  // URL corrected 2026-08-11 (was wilmingtonlibrary.org): New Hanover County Public Library, 230 Grace St Wilmington NC 28401. NOTE Myrtle Grove branch was replaced by the Pine Valley Branch - branc
  { name: 'Myrtle Grove Branch', url: 'https://www.nhcgov.com/2628/Library', eventsUrl: 'https://www.nhcgov.com/2628/Library', city: 'Wilmington', state: 'NC', zipCode: '00000', county: 'New Hanover'},
  { name: 'East Branch Library', url: 'https://www.wilsoncountypubliclibrary.org/', eventsUrl: 'https://www.wilsoncountypubliclibrary.org/events/library-calendar', city: 'Wilson', state: 'NC', zipCode: '00000', county: 'Wilson County'},
  { name: 'Lawrence Memorial Library', url: 'https://www.windsorlibrary.org', eventsUrl: 'https://www.windsorlibrary.org/events', city: 'Windsor', state: 'NC', zipCode: '00000', county: 'Bertie', urlCollision: 'windsorlibrary.org is VT, not NC' },
];

const SCRAPER_NAME = 'wordpress-NC';

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
      // Try the site's TEC REST API before falling back to DOM scraping —
      // see helpers/tec-rest-helper.js for why (2026-07-31 diagnosis).
      const tecEvents = await tryFetchTecEvents(library.url, library.name);
      if (tecEvents) {
        tecEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', platform: 'generic', state: 'NC', city: library.city, zipCode: library.zipCode, needsReview: true }}));
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
            state: 'NC',
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
            state: event.state || library.state || 'NC',
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
                  date: resolveEventDate(card),
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
      }, library.name, RESOLVER_SRC);

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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressNCCloudFunction };
