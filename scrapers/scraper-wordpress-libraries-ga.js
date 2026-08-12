// 6 entries removed 2026-08-09 (MASTER-PLAN Defect A): their {city}library.org
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
const axios = require('axios');
/**
 * Georgia Public Libraries Scraper - Coverage: All Georgia public libraries
 */

// Thomas County Public Library System (tcpls.org) embeds LibCal as a widget on its
// own site rather than serving a standalone tcpls.libcal.com/calendar/{slug} page
// (that path 404s — confirmed live 2026-08-09), so neither tryFetchTecEvents (this
// isn't TEC) nor the generic DOM scraper below can reach it. Its own front end
// calls this exact AJAX endpoint to render the widget, and it returns clean
// structured JSON keyed by branch ("camps" = LibCal's campus/branch filter),
// confirmed live: real titles, startdt/enddt, description, url, per Boston Library.
async function tryFetchLibCalAjaxList(origin, campsId, libName) {
  try {
    const res = await axios.get(`${origin}/ajax/calendar/list?c=-1&audience=&cats=&camps=${campsId}&inc=0`, {
      timeout: 8000,
      headers: { Accept: 'application/json' },
      validateStatus: null
    });
    if (!res || res.status !== 200 || typeof res.data !== 'object' || !Array.isArray(res.data.results)) return null;
    return res.data.results.map(ev => ({
      title: ev.title || '',
      date: ev.startdt || ev.date || '',
      startTime: ev.start || null,
      endTime: ev.end || null,
      description: (ev.shortdesc || ev.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      url: ev.url || '',
      venueName: libName,
      location: libName
    })).filter(e => e.title && e.date);
  } catch {
    return null;
  }
}
const LIBRARIES = [
  // URL corrected 2026-08-11 (was abbevillelibrary.org): Ocmulgee Regional Library System branch page lists 104 North Broad Street, Abbeville GA 31001, phone 229-467-2075
  { name: 'Wilcox County Public Library', url: 'https://orls.org/library/wilcox-county-public-library/', eventsUrl: 'https://orls.org/calendar/', city: 'Abbeville', state: 'GA', zipCode: '00000', county: 'Wilcox'},
  // Wheeler County Library: alamolibrary.org resolved (200) but its entire body
  // was a parked-domain redirect stub — dead domain, confirmed live 2026-08-09.
  // Real institution: part of the Ocmulgee Regional Library System (orls.org),
  // which runs TEC but groups branches by CATEGORY rather than venue — its REST
  // API accepts &categories=wheeler-county-library and returns only this branch's
  // events (confirmed live: "(WHE) Afterschool Parents Meeting", "(WHE) Plant a
  // Seed & Watch It Grow Storytime", etc, real Aug 2026 dates). tecCategory wires
  // through to tryFetchTecEvents's new optional 3rd param.
  { name: 'Wheeler County Library', url: 'https://orls.org', eventsUrl: 'https://orls.org/calendar/', tecCategory: 'wheeler-county-library', city: 'Alamo', state: 'GA', zipCode: '30411', county: 'Wheeler'},
  { name: 'Alma-Bacon County Public Library', url: 'https://www.almalibrary.org', eventsUrl: 'https://www.almalibrary.org/events', city: 'Alma', state: 'GA', zipCode: '00000', county: 'Bacon'},
  { name: 'Athens Regional Library System', url: 'https://www.athenslibrary.org', eventsUrl: 'https://www.athenslibrary.org/events', city: 'Athens', state: 'GA', zipCode: '30606', county: 'Clarke'},
  // Auburn Library REMOVED 2026-08-09: auburnlibrary.org is Auburn, MASSACHUSETTS
  // Public Library (369 Southbridge Street, Auburn, MA 01501 — confirmed live via
  // its own embedded Assabet Interactive calendar's JSON-LD address), not Auburn,
  // Georgia — the same {city}library.org generator collision documented throughout
  // this file. The real Auburn, GA library is Auburn Public Library, part of the
  // Piedmont Regional Library System (same system as Banks County above), moved to
  // LibCal-GA with its own branch-filtered URL, confirmed live 2026-08-09.
  { name: 'Appleby Branch', url: 'https://www.augustalibrary.org', eventsUrl: 'https://www.augustalibrary.org/events', city: 'Augusta', state: 'GA', zipCode: '00000', county: 'Richmond'},
  // Decatur County - Gilbert H. Gragg Library MOVED OUT 2026-08-09, not dropped:
  // bainbridgelibrary.org times out (confirmed twice) and the real institution — the
  // Southwest Georgia Regional Library System — serves its calendar as a FullCalendar.js
  // widget this DOM extractor cannot read. Now covered by SouthwestGeorgia-GA, which reads
  // the Revize JSON feed behind that widget and picks up all three of the system's
  // branches (Decatur, Miller, Seminole) instead of only this one.
  // Boston Carnegie Library: bostonlibrary.org resolved (200) but was a
  // parked/for-sale placeholder page — dead domain, confirmed live 2026-08-09.
  // Real institution: Thomas County Public Library System (tcpls.org), which
  // embeds LibCal (tcpls.libcal.com) as a widget rather than serving a standalone
  // calendar page. libcalCamps: 9124 found live from tcpls.libcal.com's own
  // branch-filter dropdown (`<option value="9124" data-cal_id="9124">Boston
  // Library</option>`); tryFetchLibCalAjaxList() confirmed 32 real events
  // ("Quiddler Club", "Nature Journaling Workshop", real Aug 2026 dates).
  { name: 'Boston Carnegie Library', url: 'https://tcpls.libcal.com', libcalCamps: 9124, eventsUrl: 'https://tcpls.org/connect_with_community/activities___event_calendar.php', address: '250 South Main Street', city: 'Boston', state: 'GA', zipCode: '31626', county: 'Thomas'},
  { name: 'Bowman Branch', url: 'https://www.bowmanlibrary.org', eventsUrl: 'https://www.bowmanlibrary.org/events', city: 'Bowman', state: 'GA', zipCode: '00000', county: 'Elbert'},
  // Warren P. Sewell Memorial Library-Bremen: bremenlibrary.org's TLS certificate
  // named only bremenlibrary.org and bremenmainelibrary.org as alt-names — this
  // was Bremen, MAINE's library, confirmed live 2026-08-09. Real institution: the
  // SAME West Georgia Regional Library System as New Georgia Public Library above
  // (wgrls.org/locations confirms a Bremen branch at 315 Hamilton Ave, Bremen GA
  // 30110, slug /warren-p-sewell-memorial-library-in-bremen, tribe_venues id=75 —
  // note WGRLS also has a DIFFERENT same-named branch in Bowdon, GA at a
  // different address; venue 75 is specifically the Bremen one). REST is
  // 403-blocked site-wide same as New Georgia, so this falls through to
  // tryDomScrapeTecEvents. Confirmed live: venue 75 genuinely has 0 events
  // scheduled right now (real "No results found", not a filter bug) — correct
  // institution, just nothing programmed this window.
  { name: 'Warren P. Sewell Memorial Library-Bremen', url: 'https://wgrls.org', eventsUrl: 'https://wgrls.org/events/list/?tribe_venues%5B%5D=75', city: 'Bremen', state: 'GA', zipCode: '30110', county: 'Haralson'},
  { name: 'Brunswick Glynn County Regional Library', url: 'https://www.brunswicklibrary.org', eventsUrl: 'https://www.brunswicklibrary.org/events', city: 'Brunswick', state: 'GA', zipCode: '00000', county: 'Glynn'},
  { name: 'Marion County Library', url: 'https://www.buenavistalibrary.org', eventsUrl: 'https://www.buenavistalibrary.org/events', city: 'Buena Vista', state: 'GA', zipCode: '00000', county: 'Marion'},
  { name: 'Butler Public Library', url: 'https://www.butlerlibrary.org', eventsUrl: 'https://www.butlerlibrary.org/events', city: 'Butler', state: 'GA', zipCode: '00000', county: 'Taylor'},
  { name: 'Byron Public Library', url: 'https://www.byronlibrary.org', eventsUrl: 'https://www.byronlibrary.org/events', city: 'Byron', state: 'GA', zipCode: '00000', county: 'Peach'},
  // REMOVED 2026-08-11 (MASTER-PLAN Defect A): configured host serves a library in NY, not GA. Confirmed live in reports/verification-comments.json. Removed now rather than later because today's date-extraction fixes mean this scraper CAN now read pages it previously failed on, which would have started importing another state's events under this name. RECORDED COVERAGE GAP - restore when a real URL is verified.
  // { name: 'Roddenbery Memorial Library System', url: 'https://cairolibrary.org/', eventsUrl: 'https://cairolibrary.org/calendar/', city: 'Cairo', state: 'GA', zipCode: '39828', county: 'Grady'},
  // URL corrected 2026-08-11 (was cantonlibrary.org): Sequoyah Regional Library System branch, 2740 East Cherokee Dr Canton GA, ph 770-345-7565, Cherokee County
  { name: 'Hickory Flat Public Library', url: 'https://www.sequoyahregionallibrary.org/hickoryflat', eventsUrl: 'https://www.sequoyahregionallibrary.org/events', city: 'Canton', state: 'GA', zipCode: '00000', county: 'Cherokee'},
  { name: 'Cedartown Library', url: 'https://www.cedartownlibrary.org/', eventsUrl: 'https://www.cedartownlibrary.org/', city: 'Cedartown', state: 'GA', zipCode: '00000', county: 'Polk'},
  // URL corrected 2026-08-11 (was centervillelibrary.org): Houston County Public Library system site lists Centerville Branch, 206 Gunn Road, Centerville GA 31028, phone 478-953-4500
  { name: 'Centerville Branch Library', url: 'https://houpl.org', eventsUrl: 'https://houpl.org', city: 'Centerville', state: 'GA', zipCode: '00000', county: 'Houston'},
  { name: 'Clarkesville-Habersham Co. Lib.', url: 'https://clarkesvillelibrary.org/', eventsUrl: 'https://clarkesvillelibrary.org/library-events', city: 'Clarkesville', state: 'GA', zipCode: '00000', county: 'Habersham'},
  { name: 'Clarkston Branch', url: 'https://www.clarkstonlibrary.org', eventsUrl: 'https://www.clarkstonlibrary.org/events', city: 'Clarkston', state: 'GA', zipCode: '00000', county: 'DeKalb'},
  // REMOVED 2026-08-11 (MASTER-PLAN Defect A): configured host serves a library in CA, not GA. Confirmed live in reports/verification-comments.json. Removed now rather than later because today's date-extraction fixes mean this scraper CAN now read pages it previously failed on, which would have started importing another state's events under this name. RECORDED COVERAGE GAP - restore when a real URL is verified.
  // { name: 'Rabun Co. Public Library', url: 'https://www.claytonlibrary.org', eventsUrl: 'https://www.claytonlibrary.org/events', city: 'Clayton', state: 'GA', zipCode: '00000', county: 'Clayton County'},
  { name: 'Clermont Library', url: 'https://www.clermontlibrary.org/', eventsUrl: 'https://www.clermontlibrary.org/', city: 'Clermont', state: 'GA', zipCode: '00000', county: 'Hall'},
  { name: 'White County Public Library-Cleveland Branch', url: 'https://clevelandlibrary.org/', eventsUrl: 'https://clevelandlibrary.org/', city: 'Cleveland', state: 'GA', zipCode: '00000', county: 'White'},
  { name: 'Chattahoochee Valley Regional Library System', url: 'https://www.columbuslibrary.org', eventsUrl: 'https://www.columbuslibrary.org/events', city: 'Columbus', state: 'GA', zipCode: '31906', county: 'Muscogee'},
  { name: 'Commerce Public Library', url: 'https://www.commercelibrary.org/', eventsUrl: 'https://www.commercelibrary.org/', city: 'Commerce', state: 'GA', zipCode: '00000', county: 'Jackson'},
  { name: 'Coolidge Public Library', url: 'https://www.coolidgelibrary.org', eventsUrl: 'https://www.coolidgelibrary.org/events', city: 'Coolidge', state: 'GA', zipCode: '00000', county: 'Thomas'},
  { name: 'Cornelia-Habersham Co. Lib.', url: 'https://www.cornelialibrary.org', eventsUrl: 'https://www.cornelialibrary.org/events', city: 'Cornelia', state: 'GA', zipCode: '00000', county: 'Habersham'},
  // dallaslibrary.org now redirects to the Dallas, TEXAS public library (wrong-state
  // domain collision). Real institution verified 2026-08-07: New Georgia Public
  // Library, 94 Ridge Road, Dallas GA 30157, Paulding County — a branch of the West
  // Georgia Regional Library System (wgrls.org, WordPress + The Events Calendar).
  // eventsUrl points at the branch-filtered list view (tribe_venues[]=87, confirmed
  // live) so extraction isn't mixed with the other 4 WGRLS counties.
  { name: 'New Georgia Public Library', url: 'https://wgrls.org', eventsUrl: 'https://wgrls.org/events/list/?tribe_venues%5B%5D=87', city: 'Dallas', state: 'GA', zipCode: '30157', county: 'Paulding'},
  { name: 'Dalton-Whitfield County Public Library', url: 'https://www.daltonlibrary.org', eventsUrl: 'https://www.daltonlibrary.org/events', city: 'Dalton', state: 'GA', zipCode: '00000', county: 'Whitfield'},
  { name: 'Ida Hilton Public Library', url: 'https://www.darienlibrary.org', eventsUrl: 'https://www.darienlibrary.org/events', city: 'Darien', state: 'GA', zipCode: '00000', county: 'McIntosh'},
  // URL corrected 2026-08-11 (was decaturlibrary.org): DeKalb County Public Library Covington Library, 3500 Covington Highway Decatur GA 30032, phone 404-508-7180
  { name: 'Covington Branch', url: 'https://dekalblibrary.org/locations/covi', eventsUrl: 'https://events.dekalblibrary.org/events?v=list&r=thisweek', city: 'Decatur', state: 'GA', zipCode: '00000', county: 'Decatur County'},
  // URL corrected 2026-08-11 (was douglaslibrary.org): Satilla Regional Library System page gives 200 Madison Avenue S Suite D, Douglas GA 31533, phone 912-384-4667
  { name: 'Douglas-Coffee County Public Library', url: 'https://srlsys.org/douglas-coffee-county-public-library/', eventsUrl: 'https://srlsys.org/calendar/', city: 'Douglas', state: 'GA', zipCode: '00000', county: 'Douglas County'},
  { name: 'Laurens County Library', url: 'https://www.dublinlibrary.org/', eventsUrl: 'https://www.dublinlibrary.org/', city: 'Dublin', state: 'GA', zipCode: '00000', county: 'Laurens'},
  { name: 'Duluth', url: 'https://duluthlibrary.org/', eventsUrl: 'https://duluthlibrary.org/', city: 'Duluth', state: 'GA', zipCode: '00000', county: 'Gwinnett'},
  { name: 'Gibbs Memorial Library', url: 'https://www.evanslibrary.org', eventsUrl: 'https://www.evanslibrary.org/events', city: 'Evans', state: 'GA', zipCode: '00000', county: 'Evans County'},
  { name: 'Fayette County Public Library', url: 'https://www.fayettevillelibrary.org', eventsUrl: 'https://www.fayettevillelibrary.org/events', city: 'Fayetteville', state: 'GA', zipCode: '00000', county: 'Fayette'},
  { name: 'Monroe County Library', url: 'https://www.forsythlibrary.org', eventsUrl: 'https://www.forsythlibrary.org/events', city: 'Forsyth', state: 'GA', zipCode: '00000', county: 'Forsyth County'},
  { name: 'Heard County Public Library', url: 'https://www.franklinlibrary.org', eventsUrl: 'https://www.franklinlibrary.org/events', city: 'Franklin', state: 'GA', zipCode: '00000', county: 'Franklin County'},
  { name: 'Gordon Public Library', url: 'https://gordonlibrary.org/', eventsUrl: 'https://gordonlibrary.org/', city: 'Gordon', state: 'GA', zipCode: '00000', county: 'Gordon County'},
  { name: 'Grantville Public Library', url: 'https://cowt.ent.sirsi.net/', eventsUrl: 'https://cowt.ent.sirsi.net/client/en_US/default/', city: 'Grantville', state: 'GA', zipCode: '00000', county: 'Coweta'},
  { name: 'Greene County Library', url: 'https://www.greensborolibrary.org', eventsUrl: 'https://www.greensborolibrary.org/events', city: 'Greensboro', state: 'GA', zipCode: '00000', county: 'Greene'},
  { name: 'Greenville Area Public Library', url: 'https://www.greenvillelibrary.org', eventsUrl: 'https://www.greenvillelibrary.org/events', city: 'Greenville', state: 'GA', zipCode: '00000', county: 'Meriwether'},
  // REMOVED 2026-08-11 (MASTER-PLAN Defect A): configured host serves a library in NY, not GA. Confirmed live in reports/verification-comments.json. Removed now rather than later because today's date-extraction fixes mean this scraper CAN now read pages it previously failed on, which would have started importing another state's events under this name. RECORDED COVERAGE GAP - restore when a real URL is verified.
  // { name: 'Harris County Public Library', url: 'https://hamiltonlibrary.org/', eventsUrl: 'https://hamiltonlibrary.org/', city: 'Hamilton', state: 'GA', zipCode: '00000', county: 'Harris'},
  // Banks County Public Library removed 2026-08-05 — moved to the LibCal
  // scraper's GA section, not dropped. It was on homerlibrary.org, which is the
  // Homer Township Public Library District in Homer Glen, ILLINOIS (the same
  // collision that hit WordPress-NY's Phillips Free Library entry). The real
  // Banks County library is part of the Piedmont Regional Library System and
  // runs its calendar on LibCal at prlib.libcal.com, confirmed from
  // prlib.org/banks-county's own events link — a platform this WordPress
  // scraper cannot parse, hence the move rather than a URL swap here.
  { name: 'Wayne County Library', url: 'https://www.jesuplibrary.org', eventsUrl: 'https://www.jesuplibrary.org/events', city: 'Jesup', state: 'GA', zipCode: '00000', county: 'Wayne'},
  // URL corrected 2026-08-11 (was lafayettelibrary.org): Regional offices 305 S Duke St LaFayette GA, phone 706-638-7557; calendar lists LaFayette-Walker, Rossville, Chickamauga, Dade branches
  { name: 'Cherokee Regional Library System', url: 'https://chrl.org', eventsUrl: 'https://chrl.org/calendar.php', city: 'Lafayette', state: 'GA', zipCode: '30728', county: 'Walker'},
  { name: 'Lagrange Memorial Library', url: 'https://lagrangelibrary.org/', eventsUrl: 'https://lagrangelibrary.org/', city: 'Lagrange', state: 'GA', zipCode: '00000', county: 'Troup'},
  { name: 'Miller Lakeland Library', url: 'https://llcoop.org/', eventsUrl: 'https://llcoop.org/calendar/', city: 'Lakeland', state: 'GA', zipCode: '00000', county: 'Lanier'},
  { name: 'Oglethorpe County Library', url: 'https://www.lexingtonlibrary.org', eventsUrl: 'https://www.lexingtonlibrary.org/events', city: 'Lexington', state: 'GA', zipCode: '00000', county: 'Oglethorpe'},
  // URL corrected 2026-08-11 (was louisvillelibrary.org): Site headquarters 306 East Broad Street Louisville GA 30434, phone 478-625-7079; three branches, member of Georgia PINES
  { name: 'Jefferson County Library System', url: 'https://www.jeffersoncls.org/', eventsUrl: 'https://www.jeffersoncls.org/calendar.php', city: 'Louisville', state: 'GA', zipCode: '30434', county: 'Jefferson'},
  { name: 'Nelle Brown Memorial Public Library', url: 'https://lyonslibrary.org/', eventsUrl: 'https://lyonslibrary.org/', city: 'Lyons', state: 'GA', zipCode: '00000', county: 'Toombs'},
  { name: 'Middle Georgia Regional Library System', url: 'https://www.maconlibrary.org', eventsUrl: 'https://www.maconlibrary.org/events', city: 'Macon', state: 'GA', zipCode: '31201', county: 'Macon County'},
  { name: 'Morgan County Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'GA', zipCode: '00000', county: 'Madison County'},
  // REMOVED 2026-08-11 (MASTER-PLAN Defect A): configured host serves a library in MO, not GA. Confirmed live in reports/verification-comments.json. Removed now rather than later because today's date-extraction fixes mean this scraper CAN now read pages it previously failed on, which would have started importing another state's events under this name. RECORDED COVERAGE GAP - restore when a real URL is verified.
  // { name: 'Maysville Public Library', url: 'https://www.maysvillelibrary.org', eventsUrl: 'https://www.maysvillelibrary.org/events', city: 'Maysville', state: 'GA', zipCode: '00000', county: 'Banks'},
  { name: 'Meigs Public Library', url: 'https://www.meigslibrary.org/', eventsUrl: 'https://www.meigslibrary.org/', city: 'Meigs', state: 'GA', zipCode: '00000', county: 'Thomas'},
  { name: 'Lake Sinclair Library', url: 'https://milledgevillelibrary.org/', eventsUrl: 'https://milledgevillelibrary.org/calendar', city: 'Milledgeville', state: 'GA', zipCode: '00000', county: 'Baldwin'},
  { name: 'Monroe-Walton County Library', url: 'https://www.monroelibrary.org', eventsUrl: 'https://www.monroelibrary.org/events', city: 'Monroe', state: 'GA', zipCode: '00000', county: 'Monroe County'},
  { name: 'Baker County', url: 'https://www.newtonlibrary.org', eventsUrl: 'https://www.newtonlibrary.org/events', city: 'Newton', state: 'GA', zipCode: '00000', county: 'Newton County'},
  // REMOVED 2026-08-11 (MASTER-PLAN Defect A): configured host serves a library in ME, not GA. Confirmed live in reports/verification-comments.json. Removed now rather than later because today's date-extraction fixes mean this scraper CAN now read pages it previously failed on, which would have started importing another state's events under this name. RECORDED COVERAGE GAP - restore when a real URL is verified.
  // { name: 'Pembroke Public Library', url: 'https://www.pembrokelibrary.org/', eventsUrl: 'https://www.pembrokelibrary.org/upcoming-events', city: 'Pembroke', state: 'GA', zipCode: '00000', county: 'Bryan'},
  { name: 'Houston County Public Libraries System', url: 'https://www.perrylibrary.org/', eventsUrl: 'https://www.perrylibrary.org/calendar', city: 'Perry', state: 'GA', zipCode: '31069', county: 'Houston'},
  // REMOVED 2026-08-11 (MASTER-PLAN Defect A): configured host serves a library in CT, not GA. Confirmed live in reports/verification-comments.json. Removed now rather than later because today's date-extraction fixes mean this scraper CAN now read pages it previously failed on, which would have started importing another state's events under this name. RECORDED COVERAGE GAP - restore when a real URL is verified.
  // { name: 'Webster County Library', url: 'https://prestonpubliclibrary.org/', eventsUrl: 'https://prestonpubliclibrary.org/events/', city: 'Preston', state: 'GA', zipCode: '00000', county: 'Webster'},
  { name: 'Brooks County Public Library System', url: 'https://www.quitmanlibrary.org/', eventsUrl: 'https://www.quitmanlibrary.org/', city: 'Quitman', state: 'GA', zipCode: '31643', county: 'Quitman County'},
  { name: 'Parks Memorial Library', url: 'https://www.richlandlibrary.org/', eventsUrl: 'https://www.richlandlibrary.org/Calendar', city: 'Richland', state: 'GA', zipCode: '00000', county: 'Stewart'},
  { name: 'Riverdale Branch Library', url: 'https://www.riverdalelibrary.org', eventsUrl: 'https://www.riverdalelibrary.org/events', city: 'Riverdale', state: 'GA', zipCode: '00000', county: 'Clayton'},
  { name: 'Rockmart Library', url: 'https://www.rockmartlibrary.org', eventsUrl: 'https://www.rockmartlibrary.org/events', city: 'Rockmart', state: 'GA', zipCode: '00000', county: 'Polk'},
  { name: 'Rossville Public Library', url: 'https://www.rossvillelibrary.org', eventsUrl: 'https://www.rossvillelibrary.org/events', city: 'Rossville', state: 'GA', zipCode: '00000', county: 'Walker'},
  { name: 'Scottdale-Tobie Grant Branch', url: 'https://www.scottdalelibrary.org/', eventsUrl: 'https://www.scottdalelibrary.org/', city: 'Scottdale', state: 'GA', zipCode: '00000', county: 'DeKalb'},
  { name: 'Senoia Area Public Library', url: 'https://cowt.ent.sirsi.net/', eventsUrl: 'https://cowt.ent.sirsi.net/client/en_US/default/', city: 'Senoia', state: 'GA', zipCode: '00000', county: 'Coweta'},
  { name: 'Lewis A. Ray Library', url: 'https://www.smyrnalibrary.org', eventsUrl: 'https://www.smyrnalibrary.org/events', city: 'Smyrna', state: 'GA', zipCode: '00000', county: 'Cobb'},
  { name: 'Hancock County Library', url: 'https://www.spartalibrary.org', eventsUrl: 'https://www.spartalibrary.org/events', city: 'Sparta', state: 'GA', zipCode: '00000', county: 'Hancock'},
  { name: 'Effingham', url: 'https://www.springfieldlibrary.org/', eventsUrl: 'https://www.springfieldlibrary.org/library/', city: 'Springfield', state: 'GA', zipCode: '00000', county: 'Effingham'},
  { name: 'Chattooga County Library System', url: 'https://www.summervillelibrary.org', eventsUrl: 'https://www.summervillelibrary.org/events', city: 'Summerville', state: 'GA', zipCode: '30747', county: 'Chattooga'},
  { name: 'Hightower Memorial Library', url: 'https://thomastonlibrary.org/', eventsUrl: 'https://thomastonlibrary.org/', city: 'Thomaston', state: 'GA', zipCode: '00000', county: 'Upson'},
  { name: 'Thomson-Mcduffie County Library', url: 'https://www.thomsonlibrary.org/', eventsUrl: 'https://www.thomsonlibrary.org/', city: 'Thomson', state: 'GA', zipCode: '00000', county: 'McDuffie'},
  // REMOVED 2026-08-11 (MASTER-PLAN Defect A): configured host serves a library in PA, not GA. Confirmed live in reports/verification-comments.json. Removed now rather than later because today's date-extraction fixes mean this scraper CAN now read pages it previously failed on, which would have started importing another state's events under this name. RECORDED COVERAGE GAP - restore when a real URL is verified.
  // { name: 'Tyrone Public Library', url: 'https://www.tyronelibrary.org', eventsUrl: 'https://www.tyronelibrary.org/events', city: 'Tyrone', state: 'GA', zipCode: '00000', county: 'Fayette'},
  { name: 'Elizabeth Harris Library', url: 'https://www.unadillalibrary.org', eventsUrl: 'https://www.unadillalibrary.org/events', city: 'Unadilla', state: 'GA', zipCode: '00000', county: 'Dooly'},
  { name: 'Harlie Fulford Memorial Library', url: 'https://www.wrightsvillelibrary.org', eventsUrl: 'https://www.wrightsvillelibrary.org/events', city: 'Wrightsville', state: 'GA', zipCode: '00000', county: 'Johnson'},
];

const SCRAPER_NAME = 'wordpress-GA';

async function scrapeGenericEvents() {
  const browser = await launchBrowser();
  const events = [];
  for (const library of LIBRARIES) {
    const __eventCountBefore = events.length;
    console.log(`📍 ${library.name} (${library.city}, ${library.state})`);
    try {
      // Try the site's TEC REST API before falling back to DOM scraping —
      // see helpers/tec-rest-helper.js for why (2026-07-31 diagnosis).
      const tecEvents = await tryFetchTecEvents(library.url, library.name, library.tecCategory);
      if (tecEvents) {
        tecEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', platform: 'generic', state: 'GA', city: library.city, zipCode: library.zipCode, needsReview: true }}));
        continue;
      }

      // Not TEC — some libraries embed LibCal as a widget on their own site
      // rather than serving a standalone LibCal calendar page (see
      // tryFetchLibCalAjaxList's header comment). Try that before ever
      // attempting to render eventsUrl, since the widget's data never appears
      // in that page's own DOM.
      if (library.libcalCamps) {
        const libcalEvents = await tryFetchLibCalAjaxList(library.url, library.libcalCamps, library.name);
        if (libcalEvents && libcalEvents.length > 0) {
          libcalEvents.forEach(event => events.push({
            ...event,
            metadata: {
              sourceName: library.name,
              sourceUrl: library.eventsUrl || library.url,
              scrapedAt: new Date().toISOString(),
              scraperName: SCRAPER_NAME,
              category: 'library',
              platform: 'libcal-ajax',
              state: 'GA',
              city: library.city,
              zipCode: library.zipCode,
              needsReview: true
            }
          }));
          continue;
        }
      }

      const page = await browser.newPage();
      await page.goto(library.eventsUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise(resolve => setTimeout(resolve, 1000));

      // REST API can be reachable-but-403 (blocked at the server/CDN level)
      // even on a genuinely TEC-powered site — tryFetchTecEvents() already
      // returned null above in that case. Before falling back to fully
      // generic selectors (which can't tell a real event card from the
      // calendar's own day-heading badge on TEC's list-view markup), try
      // TEC's own DOM structure directly. Confirmed live 2026-08-08 against
      // wgrls.org: this is exactly what was happening to New Georgia Public
      // Library — every saved "event" was a bare date-heading string.
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
            state: 'GA',
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
            state: event.state || library.state || 'GA',
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
            state: 'GA',
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
    state: 'GA',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  Georgia Libraries Scraper (${LIBRARIES.length} libraries)  ║`);
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
async function scrapeWordpressGACloudFunction() {
  console.log('☁️ Running WordPress GA as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-GA', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  await logScraperResult('WordPress-GA', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressGACloudFunction };
