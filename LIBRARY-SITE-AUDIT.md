# Library Site Audit

Standing inventory of every individual library website FunHive scrapes, with the event count found on its most recent scrape. Scrapers run on a 3-day Group 1/2/3 rotation, so a full inventory takes 3 consecutive days to assemble.

**Link column:** each row's Link points to that library's actual calendar/events page as configured in its scraper's source file (the same URL the scraper visits) — every row below resolved to a config URL, so no row needed the database-event-URL fallback this pass, but that fallback (noted inline) remains the intended path if a future update can't find a config match; the ~33 aggregate "no per-library breakdown available" rows link to one representative library from that scraper's config rather than the specific row name, since those rows don't name a single site.


## Deep-dive: zero-event verification (2026-08-04)

All 315 rows showing 0 events found were live-checked against their real calendar page (11 parallel research passes, one per batch). Result: **23 confirmed genuinely empty (MATCHES)**, **36 confirmed real scraper bugs (MISMATCH — site has real events, scraper found none)**, **255 unverifiable** (mostly 403/bot-blocks, dead/expired domains, JS-only calendar widgets with no server-rendered event list, and TLS/connection failures — infrastructure noise, not necessarily scraper bugs).

**MISMATCH — confirmed real bugs, worth a scraper fix:**
- LibCal-NC / WordPress-GA — Auburn Library (Auburn, GA): real dated Aug events (e.g. "Butterflies and Moths" Aug 7) server-rendered on page
- WordPress-GA — Lake Sinclair Library (Milledgeville, GA): real recurring programs (Coffee Plus Fridays, LEGO Builders Day)
- WordPress-GA — Pembroke Public Library (GA): Grand Canyon talk Aug 15, Bake/Book Sale Aug 29
- WordPress-NC — Claremont Branch Library: "Upcoming Events" section with 3 named events
- WordPress-NC — Danbury Public Library: CSI Forensic Science, D&D Mini Painting Quest
- WordPress-NC — Erwin Public Library: detailed static-HTML summer schedule through Aug 2026
- WordPress-NC — Leland Branch Library: real events e.g. Luunappi Aug 7
- WordPress-NC — Pembroke Public Library (NC, distinct from the GA one above): Grand Canyon talk Aug 15
- WordPress-NC — Princeton Public Library: Outdoor Storytime Aug 11
- WordPress-CT — Greenwich Library: Windows 11 Learning Lab Aug 12
- WordPress-NC — Pettigrew Regional Library (Plymouth, NC): configured URL actually resolves to **Plymouth District Library, Michigan** — wrong-domain bug, and that MI library does have real events
- WordPress-CT — North Haven Memorial Library: 4 dated events, server-rendered
- WordPress-CT — Oakville Branch Library (Watertown): 5 dated events + Google Calendar embed
- WordPress-CT — Plymouth Library Association: 4 events for the current week
- WordPress-CT — Goshen Public Library: dated book club events
- WordPress-CT — Ivoryton Library Association: one full event with registration link
- WordPress-CT — Weston Public Library: "City Hall Selfie Day" Aug 11
- WordPress-CT — Woodbridge Town Library: full August calendar, oddly labeled "Woodbridge Township, NJ" — possible domain/label mismatch
- WordPress-TN — Kingsport Public Library, Williamson County Public Library, Bartlett Library, Sevier County Public Library System, Lawrenceburg Public Library, Tipton County Public Library, Benton County Library, Unicoi County Public Library: all show real dated events (storytimes, book clubs, "Back to School Bash," summer programs)
- WordPress-TN — Millard Oakley Public Library, Watertown-Wilson County Library: real dated events (Music Matters concert, Honey Bee Program, Clay Character Creations, Chair Yoga)
- WordPress-AL — Bridgeport-Lena Cagle Public Library, Wilcox County Library, City Of Bayou La Batre Public Library: full populated calendars (Hot Yoga, Story Time, Essential Oils Class, Tabletop Game Night)
- WordPress-VT — Brownell Library (Essex Junction): ~35 real July events
- WordPress-AL — Hightower Memorial Library: configured URL actually resolves to **Kilgore Memorial Library, York NE** — wrong-domain bug, that NE library does have real events
- WordPress-VT — Chester (Whiting), Lunenburg (Alden Balch Memorial), Westminster West Public: real dated Aug/community events

**Notable pattern — hijacked, expired, or repurposed library domains** (their scraped "0" is almost beside the point; the URL itself no longer points at a real library): Berea Branch NC (domain-for-sale), Star Branch NC (now a Korean university library consortium site), Smithfield NC (unrelated RI library), Waterbury CT (unrelated siloam.com), Norwalk CT (suspicious foreign redirect, not followed), Newport NC (redirects to Newport, Oregon government), Franklin NC (French health blog), Harmony NC (unrelated consulting site), Smyrna GA (cert mismatch → free-ebooks-download.org), Harriman TN (unrelated Malaysian government login page), Newfane VT (gambling site redirect), Richmond VT (Richmond CA city gov), Westminster VT (Westminster CO city gov), Danville VT (unrelated VA literacy nonprofit).

**Day 1 of a 3-day cycle in progress.** Two runner processes wrote to the logs today: the tail of a Group 3 run (started 2026-08-03 8:05 PM EST, finished 2026-08-04 12:48 AM EST) and a Group 1 run (started 2026-08-04 3:00 AM EST), plus a handful of scrapers (LibCal-NH, Communico-NC, LibraryMarket-CT, LibraryMarket-SC) that executed for real after an unrelated Group 2 dry-run invocation printed noise into the same log around 13:38 UTC without actually running anything.

**Known data gap:** `scrapers/logs/scraper-stdout.log` has a complete gap for the entire Group 3 run window (2026-08-04T00:05Z–04:49Z) — the runner’s own `scraper-run-2026-08-04.log` and `scraper-summary.log` both have correct aggregate FOUND numbers for every Group 3 scraper, but the raw per-library stdout that would normally let us pair each library with its own count was never written to `scraper-stdout.log` for this run. (A separate, wholly-failed browser-launch run from 2026-08-03 07:00 UTC — already logged in `SCRAPER-FIX-LOG.jsonl` / commit `1cfecc9` — happens to list the same scrapers in the same order and was initially mistaken for this run; its Found/New/Duplicate counts do not match today’s real numbers and it was discarded.) All Group 3 rows below are therefore aggregate-only, flagged individually.

| Library Website | State | Scraper | Events Found | Link |
|---|---|---|---|---|
| Delaware Libraries | DE | LibCal-DE | 20 | [Link](https://delawarelibraries.libcal.com/calendar/?cid=-1&t=d&d=0000-00-00&cal=-1&inc=0) |
| Durham County Library | NC | LibCal-NC | 20 | [Link](https://durhamcountylibrary.libcal.com/calendar?cid=-1&t=d) |
| New Hanover County Public Library | NC | LibCal-NC | 20 | [Link](https://libcal.nhcgov.com/calendar/nhcpl) |
| Gaston County Public Library | NC | LibCal-NC | 20 | [Link](https://gastonlibrary.libcal.com/calendar/events?cid=-1&t=d) |
| Union County Public Library | NC | LibCal-NC | 25 | [Link](https://union-nc.libcal.com/) |
| Alamance County Library | NC | LibCal-NC | 48 | [Link](https://alamancelibraries.libcal.com/calendars?cid=-1&t=g&d=0000-00-00&cal=-1&inc=0) |
| Brunswick County Public Library | NC | LibCal-NC | 10 | [Link](https://brunsco.libcal.com/) |
| Iredell County Public Library | NC | LibCal-NC | 48 | [Link](https://iredell-lib-nc.libcal.com/calendars) |
| Henderson County Public Library | NC | LibCal-NC | 5 | [Link](https://hendersonpl.libcal.com/) |
| Craven-Pamlico Regional Library | NC | LibCal-NC | 0 | [Link](https://cprl.libcal.com/) |
| Freeport Memorial Library | NY | LibCal-NY2 | 20 | [Link](https://freeportlibrary.libcal.com/calendar?cid=-1&t=d) |
| Rockville Centre Public Library | NY | LibCal-NY2 | 20 | [Link](https://rvcpl.libcal.com/calendar?cid=-1&t=d) |
| Oceanside Public Library | NY | LibCal-NY2 | 20 | [Link](https://oceansidelibrary.libcal.com/calendar?cid=-1&t=d) |
| North Merrick Public Library | NY | LibCal-NY2 | 20 | [Link](https://nmerricklibrary.libcal.com/calendar?cid=-1&t=d) |
| Wantagh Public Library | NY | LibCal-NY2 | 20 | [Link](https://wantaghlibrary.libcal.com/calendar?cid=-1&t=d) |
| East Meadow Public Library | NY | LibCal-NY2 | 20 | [Link](https://eastmeadow.libcal.com/calendar?cid=-1&t=d) |
| Baldwin Public Library | NY | LibCal-NY2 | 0 | [Link](https://baldwinlib.libcal.com/calendar?cid=-1&t=d) |
| North Bellmore Public Library | NY | LibCal-NY2 | 20 | [Link](https://northbellmorelibrary.libcal.com/calendar?cid=-1&t=d) |
| Levittown Public Library | NY | LibCal-NY2 | 163 | [Link](https://levittown.librarycalendar.com/) |
| Plainview-Old Bethpage Public Library | NY | LibCal-NY2 | 155 | [Link](https://poblib.librarycalendar.com/) |
| Warwick Public Library | RI | LibCal-RI | 20 | [Link](https://warwicklibrary.libcal.com/calendar?cid=-1&t=d) |
| Cranston Public Library | RI | LibCal-RI | 20 | [Link](https://events.cranstonlibrary.org/calendar/events) |
| East Providence Public Library | RI | LibCal-RI | 20 | [Link](https://eplib.libcal.com/calendar?cid=-1&t=d) |
| West Warwick Public Library | RI | LibCal-RI | 20 | [Link](https://wwpl.libcal.com/calendar/WWPL?cid=-1&t=d) |
| Pawtucket Public Library | RI | LibCal-RI | 10 | [Link](https://pawtucketlibrary.libcal.com/) |
| Newport Public Library | RI | LibCal-RI | 20 | [Link](https://newportlibraryri.libcal.com/calendar/NPL-events/) |
| North Kingstown Free Library | RI | LibCal-RI | 0 | [Link](https://nklibrary.libcal.com/) |
| Cumberland Public Library | RI | LibCal-RI | 25 | [Link](https://cumberlandlibrary.libcal.com/) |
| Barrington Public Library | RI | LibCal-RI | 20 | [Link](https://barringtonlibrary.libcal.com/calendar/library-events) |
| Kenton County Public Library | KY | LibCal-KY | 0 | [Link](https://kentonlibrary.libcal.com/calendar?cid=-1&t=d) |
| Boone County Public Library | KY | LibCal-KY | 0 | [Link](https://bcpl.libcal.com/calendar?cid=-1&t=d) |
| Warren County Public Library | KY | LibCal-KY | 0 | [Link](https://warrenpl.libcal.com/calendar?cid=-1&t=d) |
| Clay County Public Library | KY | LibCal-KY | 20 | [Link](https://claycountygov.libcal.com/calendar/LibraryCalendar?cid=-1&t=d) |
| Manchester City Library | NH | LibCal-NH | 48 | [Link](https://manchester-lib-nh.libcal.com/calendar) |
| Nashua Public Library | NH | LibCal-NH | 48 | [Link](https://nashualibrary.libcal.com/calendar/events) |
| Concord Public Library | NH | LibCal-NH | 42 | [Link](https://concordnh-pl.libcal.com/calendar) |
| Keene Public Library | NH | LibCal-NH | 48 | [Link](https://keenenh.libcal.com/calendar) |
| Lebanon Public Libraries | NH | LibCal-NH | 48 | [Link](https://leblibrary.libcal.com/calendars) |
| Merrimack Public Library | NH | LibCal-NH | 48 | [Link](https://merrimack.libcal.com/calendar) |
| Hooksett Public Library | NH | LibCal-NH | 48 | [Link](https://hooksettlibrary.libcal.com/calendar) |
| Hollis Social Library | NH | LibCal-NH | 48 | [Link](https://hollislibrary.libcal.com/calendar) |
| Pelham Public Library | NH | LibCal-NH | 48 | [Link](https://pelhampubliclibrary.libcal.com/calendar/events) |
| DC Public Library | DC | Communico-DC | 37 | [Link](https://dclibrary.libnet.info/events) |
| Worcester Public Library | MA | Communico-MA | 13 | [Link](https://mywpl.libnet.info/events) |
| Loudoun County Public Library | VA | Communico-VA | 43 | [Link](https://loudoun.libnet.info/events) |
| Prince William Public Library | VA | Communico-VA | 16 | [Link](https://pwcgov.libnet.info/events) |
| Forsyth County Public Library | NC | Communico-NC | 6 | [Link](https://forsyth.libnet.info/events) |
| Wake County Public Libraries | NC | Communico-NC | 0 *(puppeteer fallback found 0 after AJAX-render retries)* | [Link](https://wake.libnet.info/events) |
| Burlington County Library System | NJ | BiblioCommons-NJ | 481 *(API returned 481 (10 pages); scraper summary reported 423 after de-dup/filtering)* | [Link](https://bclsnj.bibliocommons.com/v2/events) |
| Central Rappahannock Regional Library | VA | BiblioCommons-VA | 499 *(API returned 499 (10 pages); scraper summary reported 354 after de-dup/filtering)* | [Link](https://librarypoint.bibliocommons.com/v2/events) |
| Ferguson Library | CT | LibraryMarket-CT | 24 | [Link](https://www.fergusonlibrary.org/events/upcoming) |
| New Britain Public Library | CT | LibraryMarket-CT | 0 | [Link](https://www.newbritainlibrary.org/events/month) |
| West Hartford Public Library | CT | LibraryMarket-CT | 34 | [Link](https://westhartford.librarymarket.com/) |
| Meriden Public Library | CT | LibraryMarket-CT | 4 | [Link](https://www.meridenlibrary.org/events/month) |
| Fairfield Public Library | CT | LibraryMarket-CT | 113 | [Link](https://fplct.librarymarket.com/) |
| Sumter County Library | SC | LibraryMarket-SC | 9 | [Link](https://sumtercounty.librarycalendar.com/) |
| Beaufort County Library | SC | LibraryMarket-SC | 34 | [Link](https://beaufort.librarycalendar.com/events/upcoming) |
| Alexandria Library | VA | WordPress-VA | 0 | [Link](https://alexlibraryva.org/events) |
| Chesapeake Public Library | VA | WordPress-VA | 0 | [Link](https://events.chesapeakelibrary.org/events) |
| Henrico County Public Library | VA | WordPress-VA | 0 | [Link](https://www.henricolibrary.org/events) |
| Jefferson-Madison Regional Library | VA | WordPress-VA | 0 | [Link](https://jmrl.org/calendar) |
| Manassas Park City Library | VA | WordPress-VA | 8 | [Link](https://www.manassasparkcitylibrary.org/events) |
| Culpeper County Library | VA | WordPress-VA | 22 | [Link](https://www.cclva.org/events/upcoming) |
| Wilcox County Public Library (Abbeville, GA) | GA | WordPress-GA | 7 | [Link](https://www.abbevillelibrary.org/) |
| Wheeler County Library (Alamo, GA) | GA | WordPress-GA | 0 | [Link](https://www.alamolibrary.org/events) |
| Alma-Bacon County Public Library (Alma, GA) | GA | WordPress-GA | 9 | [Link](https://www.almalibrary.org/events) |
| Athens Regional Library System (Athens, GA) | GA | WordPress-GA | 37 | [Link](https://www.athenslibrary.org/events) |
| Auburn Library (Auburn, GA) | GA | WordPress-GA | 0 | [Link](https://auburnlibrary.org/) |
| Appleby Branch (Augusta, GA) | GA | WordPress-GA | 1 | [Link](https://www.augustalibrary.org/events) |
| Decatur County - Gilbert H. Gragg Library (Bainbridge, GA) | GA | WordPress-GA | 0 | [Link](https://www.bainbridgelibrary.org/events) |
| Berlin Community Library (Berlin, GA) | GA | WordPress-GA | 11 | [Link](https://www.berlinlibrary.org/events) |
| Boston Carnegie Library (Boston, GA) | GA | WordPress-GA | 0 | [Link](https://www.bostonlibrary.org/events) |
| Bowman Branch (Bowman, GA) | GA | WordPress-GA | 18 | [Link](https://www.bowmanlibrary.org/events) |
| Warren P. Sewell Memorial Library-Bremen (Bremen, GA) | GA | WordPress-GA | 0 | [Link](https://www.bremenlibrary.org/events) |
| Brunswick Glynn County Regional Library (Brunswick, GA) | GA | WordPress-GA | 1 | [Link](https://www.brunswicklibrary.org/events) |
| Marion County Library (Buena Vista, GA) | GA | WordPress-GA | 108 | [Link](https://www.buenavistalibrary.org/events) |
| Butler Public Library (Butler, GA) | GA | WordPress-GA | 0 | [Link](https://www.butlerlibrary.org/events) |
| Byron Public Library (Byron, GA) | GA | WordPress-GA | 85 | [Link](https://www.byronlibrary.org/events) |
| Roddenbery Memorial Library System (Cairo, GA) | GA | WordPress-GA | 0 | [Link](https://cairolibrary.org/calendar/) |
| Hickory Flat Public Library (Canton, GA) | GA | WordPress-GA | 1 | [Link](https://www.cantonlibrary.org/events) |
| Cedartown Library (Cedartown, GA) | GA | WordPress-GA | 7 | [Link](https://www.cedartownlibrary.org/) |
| Centerville Branch Library (Centerville, GA) | GA | WordPress-GA | 150 | [Link](https://www.centervillelibrary.org/events) |
| Clarkesville-Habersham Co. Lib. (Clarkesville, GA) | GA | WordPress-GA | 0 | [Link](https://clarkesvillelibrary.org/library-events) |
| Clarkston Branch (Clarkston, GA) | GA | WordPress-GA | 0 | [Link](https://www.clarkstonlibrary.org/events) |
| Rabun Co. Public Library (Clayton, GA) | GA | WordPress-GA | 0 | [Link](https://www.claytonlibrary.org/events) |
| Clermont Library (Clermont, GA) | GA | WordPress-GA | 0 | [Link](https://www.clermontlibrary.org/) |
| White County Public Library-Cleveland Branch (Cleveland, GA) | GA | WordPress-GA | 1 | [Link](https://clevelandlibrary.org/) |
| Chattahoochee Valley Regional Library System (Columbus, GA) | GA | WordPress-GA | 26 | [Link](https://www.columbuslibrary.org/events) |
| Commerce Public Library (Commerce, GA) | GA | WordPress-GA | 0 | [Link](https://www.commercelibrary.org/) |
| Coolidge Public Library (Coolidge, GA) | GA | WordPress-GA | 0 | [Link](https://www.coolidgelibrary.org/events) |
| Cornelia-Habersham Co. Lib. (Cornelia, GA) | GA | WordPress-GA | 1 | [Link](https://www.cornelialibrary.org/events) |
| New Georgia Public Library (Dallas, GA) | GA | WordPress-GA | 912 | [Link](https://www.dallaslibrary.org/events) |
| Dalton-Whitfield County Public Library (Dalton, GA) | GA | WordPress-GA | 23 | [Link](https://www.daltonlibrary.org/events) |
| Ida Hilton Public Library (Darien, GA) | GA | WordPress-GA | 25 | [Link](https://www.darienlibrary.org/events) |
| Covington Branch (Decatur, GA) | GA | WordPress-GA | 107 | [Link](https://www.decaturlibrary.org/events) |
| Douglas-Coffee County Public Library (Douglas, GA) | GA | WordPress-GA | 1 | [Link](https://douglaslibrary.org/) |
| Laurens County Library (Dublin, GA) | GA | WordPress-GA | 0 | [Link](https://www.dublinlibrary.org/) |
| Duluth (Duluth, GA) | GA | WordPress-GA | 0 | [Link](https://duluthlibrary.org/) |
| Gibbs Memorial Library (Evans, GA) | GA | WordPress-GA | 0 | [Link](https://www.evanslibrary.org/events) |
| Fayette County Public Library (Fayetteville, GA) | GA | WordPress-GA | 0 | [Link](https://www.fayettevillelibrary.org/events) |
| Monroe County Library (Forsyth, GA) | GA | WordPress-GA | 0 | [Link](https://www.forsythlibrary.org/events) |
| Heard County Public Library (Franklin, GA) | GA | WordPress-GA | 0 | [Link](https://www.franklinlibrary.org/events) |
| Gordon Public Library (Gordon, GA) | GA | WordPress-GA | 0 | [Link](https://gordonlibrary.org/) |
| Grantville Public Library (Grantville, GA) | GA | WordPress-GA | 4 | [Link](https://cowt.ent.sirsi.net/client/en_US/default/) |
| Greene County Library (Greensboro, GA) | GA | WordPress-GA | 0 | [Link](https://www.greensborolibrary.org/events) |
| Greenville Area Public Library (Greenville, GA) | GA | WordPress-GA | 13 | [Link](https://www.greenvillelibrary.org/events) |
| Harris County Public Library (Hamilton, GA) | GA | WordPress-GA | 0 | [Link](https://hamiltonlibrary.org/) |
| Banks County Public Library (Homer, GA) | GA | WordPress-GA | 135 | [Link](https://www.homerlibrary.org/events) |
| Wayne County Library (Jesup, GA) | GA | WordPress-GA | 17 | [Link](https://www.jesuplibrary.org/events) |
| Cherokee Regional Library System (Lafayette, GA) | GA | WordPress-GA | 1 | [Link](https://lafayettelibrary.org/) |
| Lagrange Memorial Library (Lagrange, GA) | GA | WordPress-GA | 4 | [Link](https://lagrangelibrary.org/) |
| Miller Lakeland Library (Lakeland, GA) | GA | WordPress-GA | 5 | [Link](https://llcoop.org/calendar/) |
| Oglethorpe County Library (Lexington, GA) | GA | WordPress-GA | 0 | [Link](https://www.lexingtonlibrary.org/events) |
| Jefferson County Library System (Louisville, GA) | GA | WordPress-GA | 15 | [Link](https://www.louisvillelibrary.org/events) |
| Nelle Brown Memorial Public Library (Lyons, GA) | GA | WordPress-GA | 0 | [Link](https://lyonslibrary.org/) |
| Middle Georgia Regional Library System (Macon, GA) | GA | WordPress-GA | 0 | [Link](https://www.maconlibrary.org/events) |
| Morgan County Library (Madison, GA) | GA | WordPress-GA | 14 | [Link](https://www.madisonlibrary.org/events) |
| Manchester Public Library (Manchester, GA) | GA | WordPress-GA | 0 | [Link](https://www.manchesterlibrary.org/events) |
| Maysville Public Library (Maysville, GA) | GA | WordPress-GA | 0 | [Link](https://www.maysvillelibrary.org/events) |
| Meigs Public Library (Meigs, GA) | GA | WordPress-GA | 4 | [Link](https://www.meigslibrary.org/) |
| Lake Sinclair Library (Milledgeville, GA) | GA | WordPress-GA | 0 | [Link](https://milledgevillelibrary.org/calendar) |
| Monroe-Walton County Library (Monroe, GA) | GA | WordPress-GA | 0 | [Link](https://www.monroelibrary.org/events) |
| Baker County (Newton, GA) | GA | WordPress-GA | 0 | [Link](https://www.newtonlibrary.org/events) |
| Pelham-Carnegie Library (Pelham, GA) | GA | WordPress-GA | 80 | [Link](https://www.pelhamlibrary.org/calendar/) |
| Pembroke Public Library (Pembroke, GA) | GA | WordPress-GA | 0 | [Link](https://www.pembrokelibrary.org/upcoming-events) |
| Houston County Public Libraries System (Perry, GA) | GA | WordPress-GA | 0 | [Link](https://www.perrylibrary.org/calendar) |
| Webster County Library (Preston, GA) | GA | WordPress-GA | 0 | [Link](https://prestonpubliclibrary.org/events/) |
| Brooks County Public Library System (Quitman, GA) | GA | WordPress-GA | 0 | [Link](https://www.quitmanlibrary.org/) |
| Parks Memorial Library (Richland, GA) | GA | WordPress-GA | 52 | [Link](https://www.richlandlibrary.org/Calendar) |
| Riverdale Branch Library (Riverdale, GA) | GA | WordPress-GA | 1 | [Link](https://www.riverdalelibrary.org/events) |
| Rockmart Library (Rockmart, GA) | GA | WordPress-GA | 0 | [Link](https://www.rockmartlibrary.org/events) |
| Rossville Public Library (Rossville, GA) | GA | WordPress-GA | 0 | [Link](https://www.rossvillelibrary.org/events) |
| Scottdale-Tobie Grant Branch (Scottdale, GA) | GA | WordPress-GA | 0 | [Link](https://www.scottdalelibrary.org/) |
| Senoia Area Public Library (Senoia, GA) | GA | WordPress-GA | 4 | [Link](https://cowt.ent.sirsi.net/client/en_US/default/) |
| Lewis A. Ray Library (Smyrna, GA) | GA | WordPress-GA | 0 | [Link](https://www.smyrnalibrary.org/events) |
| Hancock County Library (Sparta, GA) | GA | WordPress-GA | 37 | [Link](https://www.spartalibrary.org/events) |
| Effingham (Springfield, GA) | GA | WordPress-GA | 1 | [Link](https://www.springfieldlibrary.org/library/) |
| Cochran Public Library (Stockbridge, GA) | GA | WordPress-GA | 13 | [Link](https://www.stockbridgelibrary.org/events) |
| Chattooga County Library System (Summerville, GA) | GA | WordPress-GA | 0 | [Link](https://www.summervillelibrary.org/events) |
| Hightower Memorial Library (Thomaston, GA) | GA | WordPress-GA | 0 | [Link](https://thomastonlibrary.org/) |
| Thomson-Mcduffie County Library (Thomson, GA) | GA | WordPress-GA | 0 | [Link](https://www.thomsonlibrary.org/) |
| Tyrone Public Library (Tyrone, GA) | GA | WordPress-GA | 0 | [Link](https://www.tyronelibrary.org/events) |
| Elizabeth Harris Library (Unadilla, GA) | GA | WordPress-GA | 1 | [Link](https://www.unadillalibrary.org/events) |
| Warren County Public Library (Warrenton, GA) | GA | WordPress-GA | 0 | [Link](https://www.warrentonlibrary.org/events) |
| Warwick City Library (Warwick, GA) | GA | WordPress-GA | 7 | [Link](https://warwicklibrary.org/) |
| Harlie Fulford Memorial Library (Wrightsville, GA) | GA | WordPress-GA | 0 | [Link](https://www.wrightsvillelibrary.org/events) |
| Hazel W. Guilford Memorial Library (Aurora, NC) | NC | WordPress-NC | 0 | [Link](https://www.auroralibrary.org/events) |
| Bath Community Library (Bath, NC) | NC | WordPress-NC | 1 | [Link](https://www.bathlibrary.org/events) |
| Belmont Branch Library (Belmont, NC) | NC | WordPress-NC | 5 | [Link](https://smcl.org/) |
| Mary Duncan Public Library (Benson, NC) | NC | WordPress-NC | 0 | [Link](https://www.bensonlibrary.org/events) |
| Margaret Little Blount Library (Bethel, NC) | NC | WordPress-NC | 0 | [Link](https://www.bethellibrary.org/events) |
| Black Creek Branch Library (Black Creek, NC) | NC | WordPress-NC | 3 | [Link](https://www.blackcreeklibrary.org/events) |
| Watauga County Public Library (Boone, NC) | NC | WordPress-NC | 0 | [Link](https://www.boonelibrary.org/events) |
| Boonville Community Public Library (Boonville, NC) | NC | WordPress-NC | 0 | [Link](https://www.boonvillelib.org/) |
| Bunn Branch Library (Bunn, NC) | NC | WordPress-NC | 0 | [Link](https://www.bunnlibrary.org/events) |
| Alamance County Public Library (Burlington, NC) | NC | WordPress-NC | 40 | [Link](https://www.burlingtonlibrary.org/events) |
| Canton Branch Library (Canton, NC) | NC | WordPress-NC | 0 | [Link](https://www.cantonlibrary.org/events) |
| Moore County Library (Carthage, NC) | NC | WordPress-NC | 0 | [Link](https://www.carthagelibrary.org/events) |
| Cary Branch Library (Cary, NC) | NC | WordPress-NC | 4 | [Link](https://www.carylibrary.org/events) |
| Beatties Ford Road Branch Library (Charlotte, NC) | NC | WordPress-NC | 1 | [Link](https://charlottelibrary.org/calendar/) |
| Claremont Branch Library (Claremont, NC) | NC | WordPress-NC | 0 | [Link](https://www.claremontlibrary.org/) |
| Hocutt Ellington Memorial Library (Clayton, NC) | NC | WordPress-NC | 0 | [Link](https://www.claytonlibrary.org/events) |
| J.C. Holliday Library (Clinton, NC) | NC | WordPress-NC | 0 | [Link](https://www.clintonlibrary.org/events) |
| Tyrrell County Library (Columbia, NC) | NC | WordPress-NC | 0 | [Link](https://www.columbialibrary.org/events) |
| Polk County Public Library (Columbus, NC) | NC | WordPress-NC | 2 | [Link](https://www.columbuslibrary.org/events) |
| Cabarrus County Public Library (Concord, NC) | NC | WordPress-NC | 1 | [Link](https://www.concordlibrary.org/events) |
| Dallas Branch Library (Dallas, NC) | NC | WordPress-NC | 912 | [Link](https://www.dallaslibrary.org/events) |
| Danbury Public Library (Danbury, NC) | NC | WordPress-NC | 0 | [Link](https://danburylibrary.org/) |
| Florence S. Shanklin Branch Library (Denver, NC) | NC | WordPress-NC | 37 | [Link](https://www.denverlibrary.org/events) |
| Dobson Community Library (Dobson, NC) | NC | WordPress-NC | 0 | [Link](https://www.dobsonlibrary.org/events) |
| Bragtown Branch Library (Durham, NC) | NC | WordPress-NC | 31 | [Link](https://www.durhamlibrary.org/events) |
| Erwin Public Library (Erwin, NC) | NC | WordPress-NC | 0 | [Link](https://erwinlibrary.org/) |
| Fairview Branch Library (Fairview, NC) | NC | WordPress-NC | 0 | [Link](https://www.fairviewlibrary.org/events) |
| Farmville Public Library (Farmville, NC) | NC | WordPress-NC | 0 | [Link](https://farmvillelibrary.libguides.com/home) |
| Bordeaux Branch Library (Fayetteville, NC) | NC | WordPress-NC | 0 | [Link](https://www.fayettevillelibrary.org/events) |
| Macon County Public Library (Franklin, NC) | NC | WordPress-NC | 0 | [Link](https://www.franklinlibrary.org/events) |
| John W. Clark Public Library (Franklinville, NC) | NC | WordPress-NC | 17 | [Link](https://franklinvillelibrary.org/) |
| Wayne County Public Library, Fremont (Fremont, NC) | NC | WordPress-NC | 6 | [Link](https://www.fremontlibrary.org/events) |
| Graham Public Library (Graham, NC) | NC | WordPress-NC | 0 | [Link](https://www.grahamlibrary.org/events) |
| Blanche Benjamin Branch Library (Greensboro, NC) | NC | WordPress-NC | 0 | [Link](https://www.greensborolibrary.org/events) |
| Carver Branch Library (Greenville, NC) | NC | WordPress-NC | 13 | [Link](https://www.greenvillelibrary.org/events) |
| Halifax County Library System (Halifax, NC) | NC | WordPress-NC | 150 | [Link](https://www.halifaxlibrary.org/events) |
| Hampstead Branch Library (Hampstead, NC) | NC | WordPress-NC | 0 | [Link](https://www.hampsteadlibrary.org/) |
| Harmony Branch Library (Harmony, NC) | NC | WordPress-NC | 0 | [Link](https://www.harmonylibrary.org/events) |
| Harrisburg Library (Harrisburg, NC) | NC | WordPress-NC | 17 | [Link](https://www.harrisburglibrary.org/calendar) |
| Havelock-Craven County Public (Havelock, NC) | NC | WordPress-NC | 0 | [Link](https://citylibrary.com/public-libraries/havelock-public-library/) |
| Henderson County Public Library (Hendersonville, NC) | NC | WordPress-NC | 0 | [Link](https://youseemore.com/hendersonville/) |
| Hickory Public Library (Hickory, NC) | NC | WordPress-NC | 0 | [Link](https://www.hickorylibrary.org/events) |
| Hudson Branch Library (Hudson, NC) | NC | WordPress-NC | 1 | [Link](https://www.hudsonlibrary.org/events) |
| Union West Branch Library (Indian Trail, NC) | NC | WordPress-NC | 0 | [Link](https://www.indiantraillibrary.org/events) |
| King Public Library (King, NC) | NC | WordPress-NC | 0 | [Link](https://www.kinglibrary.org/events) |
| La Grange Branch Library (La Grange, NC) | NC | WordPress-NC | 4 | [Link](https://lagrangelibrary.org/) |
| Leicester Branch Library (Leicester, NC) | NC | WordPress-NC | 0 | [Link](https://www.leicesterlibrary.org/events) |
| Leland Branch Library (Leland, NC) | NC | WordPress-NC | 0 | [Link](https://www.lelandlibrary.org/events) |
| Davidson County Public Library System (Lexington, NC) | NC | WordPress-NC | 0 | [Link](https://www.lexingtonlibrary.org/events) |
| Liberty Public Library (Liberty, NC) | NC | WordPress-NC | 0 | [Link](https://libertylibrary.org/) |
| Littleton Public Library (Wc Jones Memorial) (Littleton, NC) | NC | WordPress-NC | 0 | [Link](https://www.littletonlibrary.org/events) |
| Franklin County Library (Louisburg, NC) | NC | WordPress-NC | 5 | [Link](https://www.louisburglibrary.org/events) |
| Lowell Branch Library (Lowell, NC) | NC | WordPress-NC | 0 | [Link](https://www.lowelllibrary.org/events) |
| Madison Branch Library (Madison, NC) | NC | WordPress-NC | 14 | [Link](https://www.madisonlibrary.org/events) |
| Florence Gallier Library (Magnolia, NC) | NC | WordPress-NC | 0 | [Link](https://www.magnolialibrary.org/events) |
| Mcdowell County Law Library (Marion, NC) | NC | WordPress-NC | 3 | [Link](https://www.marionlibrary.org/) |
| Madison County Public Library (Marshall, NC) | NC | WordPress-NC | 0 | [Link](https://www.marshalllibrary.org/events) |
| Matthews Branch Library (Matthews, NC) | NC | WordPress-NC | 0 | [Link](https://www.matthewslibrary.org/events) |
| Maysville Public Library (Maysville, NC) | NC | WordPress-NC | 0 | [Link](https://www.maysvillelibrary.org/events) |
| Union County Public Library (Monroe, NC) | NC | WordPress-NC | 0 | [Link](https://www.monroelibrary.org/events) |
| Mooresville Public Library (Mooresville, NC) | NC | WordPress-NC | 1 | [Link](https://www.mooresvillelibrary.org/) |
| Craven-Pamlico-Carteret Regional Library (New Bern, NC) | NC | WordPress-NC | 16 | [Link](https://www.newbernlibrary.org/events) |
| Newport Public Library (Newport, NC) | NC | WordPress-NC | 0 | [Link](https://www.newportlibrary.org/events) |
| Catawba County Library (Newton, NC) | NC | WordPress-NC | 0 | [Link](https://www.newtonlibrary.org/events) |
| Norwood Branch Library (Norwood, NC) | NC | WordPress-NC | 1 | [Link](https://norwoodlibrary.org/) |
| Berea Branch Library (Oxford, NC) | NC | WordPress-NC | 0 | [Link](https://oxfordlibrary.org/) |
| Pembroke Public Library (Pembroke, NC) | NC | WordPress-NC | 0 | [Link](https://www.pembrokelibrary.org/upcoming-events) |
| Pinebluff Public Library (Pinebluff, NC) | NC | WordPress-NC | 3 | [Link](https://www.pineblufflibrary.org/) |
| Pettigrew Regional Library (Plymouth, NC) | NC | WordPress-NC | 0 | [Link](https://plymouthlibrary.org/) |
| Princeton Public Library (Princeton, NC) | NC | WordPress-NC | 0 | [Link](https://www.princetonlibrary.org/events) |
| Roanoke Rapids Public Library (Roanoke Rapids, NC) | NC | WordPress-NC | 5 | [Link](https://www.roanokerapidslibrary.org/) |
| Robbins Area Branch (Robbins, NC) | NC | WordPress-NC | 150 | [Link](https://www.robbinslibrary.org/events) |
| Leath Memorial Library (Rockingham, NC) | NC | WordPress-NC | 6 | [Link](https://www.rockinghamlibrary.org/events) |
| Rowan Public Library (Salisbury, NC) | NC | WordPress-NC | 0 | [Link](https://www.salisburylibrary.org/) |
| Saluda Branch Library (Saluda, NC) | NC | WordPress-NC | 117 | [Link](https://www.saludalibrary.org/events) |
| Selma Public Library (Selma, NC) | NC | WordPress-NC | 1 | [Link](https://selmalibrary.org/) |
| Cleveland County Memorial Library (Shelby, NC) | NC | WordPress-NC | 17 | [Link](https://www.shelbylibrary.org/events) |
| Public Library Of Johnston County Smithfield (Smithfield, NC) | NC | WordPress-NC | 0 | [Link](https://www.smithfieldlibrary.org/) |
| Brunswick County Library (Southport, NC) | NC | WordPress-NC | 0 | [Link](https://www.southportlibrary.org/events) |
| Alleghany County Public Library (Sparta, NC) | NC | WordPress-NC | 37 | [Link](https://www.spartalibrary.org/events) |
| Spring Lake Branch (Spring Lake, NC) | NC | WordPress-NC | 4 | [Link](https://www.springlakelibrary.org/events) |
| Stanley Branch Library (Stanley, NC) | NC | WordPress-NC | 1 | [Link](https://www.stanleylibrary.org/events) |
| Star Branch (Star, NC) | NC | WordPress-NC | 0 | [Link](https://www.starlibrary.org/events) |
| Montgomery County Library (Troy, NC) | NC | WordPress-NC | 0 | [Link](https://www.troylibrary.org/events) |
| Warren County Memorial Library (Warrenton, NC) | NC | WordPress-NC | 0 | [Link](https://www.warrentonlibrary.org/events) |
| Warsaw-Kornegay Public Library (Warsaw, NC) | NC | WordPress-NC | 10 | [Link](https://www.warsawlibrary.org/) |
| Myrtle Grove Branch (Wilmington, NC) | NC | WordPress-NC | 3 | [Link](https://www.wilmingtonlibrary.org/events) |
| East Branch Library (Wilson, NC) | NC | WordPress-NC | 0 | [Link](https://www.wilsonlibrary.org/events) |
| Lawrence Memorial Library (Windsor, NC) | NC | WordPress-NC | 0 | [Link](https://www.windsorlibrary.org/events) |
| Hartford Public Library (Hartford, CT) | CT | WordPress-CT | 0 | [Link](https://www.hplct.org/) |
| New Haven Free Public Library (New Haven, CT) | CT | WordPress-CT | 1 | [Link](https://www.nhfpl.org/events) |
| Bridgeport Public Library (Bridgeport, CT) | CT | WordPress-CT | 14 | [Link](https://www.bportlibrary.org/events) |
| Stamford Public Library (Stamford, CT) | CT | WordPress-CT | 0 | [Link](https://www.stamfordlibrary.org/events) |
| Waterbury Public Library (Waterbury, CT) | CT | WordPress-CT | 0 | [Link](https://www.siloam.com/events) |
| Norwalk Public Library (Norwalk, CT) | CT | WordPress-CT | 0 | [Link](https://www.norwalkpubliclibrary.org/events) |
| Danbury Public Library (Danbury, CT) | CT | WordPress-CT | 0 | [Link](https://danburylibrary.org/) |
| New Britain Public Library (New Britain, CT) | CT | WordPress-CT | 57 | [Link](https://www.nbpl.info/events) |
| West Hartford Public Library (West Hartford, CT) | CT | WordPress-CT | 91 | [Link](https://www.westhartfordlibrary.org/) |
| Greenwich Library (Greenwich, CT) | CT | WordPress-CT | 0 | [Link](https://www.greenwichlibrary.org/) |
| Fairfield Public Library (Fairfield, CT) | CT | WordPress-CT | 77 | [Link](https://www.fairfieldpubliclibrary.org/events) |
| Bristol Public Library (Bristol, CT) | CT | WordPress-CT | 190 | [Link](https://www.bristollib.com/events) |
| Manchester Public Library (Manchester, CT) | CT | WordPress-CT | 9 | [Link](https://www.manchesterct.gov/Government/Departments/Library) |
| Milford Public Library (Milford, CT) | CT | WordPress-CT | 0 | [Link](https://www.ci.milford.ct.us/milford-public-library/events) |
| Stratford Library (Stratford, CT) | CT | WordPress-CT | 1 | [Link](https://www.stratfordlibrary.org/events) |
| East Hartford Public Library (East Hartford, CT) | CT | WordPress-CT | 0 | [Link](https://www.easthartfordct.gov/library/events) |
| Middletown Public Library (Middletown, CT) | CT | WordPress-CT | 1 | [Link](https://russelllibrary.org/) |
| Wallingford Public Library (Wallingford, CT) | CT | WordPress-CT | 31 | [Link](https://www.wallingfordlibrary.org/events) |
| Enfield Public Library (Enfield, CT) | CT | WordPress-CT | 4 | [Link](https://www.enfieldpubliclibrary.org/) |
| Southington Public Library (Southington, CT) | CT | WordPress-CT | 0 | [Link](https://www.southingtonlibrary.org/) |
| Shelton Public Library (Shelton, CT) | CT | WordPress-CT | 36 | [Link](https://www.sheltonlibrarysystem.org/events) |
| Torrington Library (Torrington, CT) | CT | WordPress-CT | 0 | [Link](https://www.torringtonlibrary.org/events) |
| Trumbull Library (Trumbull, CT) | CT | WordPress-CT | 0 | [Link](https://www.trumbull-ct.gov/1104/Library) |
| Vernon Public Library (Vernon, CT) | CT | WordPress-CT | 0 | [Link](https://www.vernon-ct.gov/library/events) |
| Andover Public Library (Andover, CT) | CT | WordPress-CT | 0 | [Link](https://www.andoverlibrary.org/events) |
| Ansonia Public Library (Ansonia, CT) | CT | WordPress-CT | 0 | [Link](https://ansonialibrary.org/) |
| Avon Free Public Library (Avon, CT) | CT | WordPress-CT | 0 | [Link](https://www.avonlibrary.org/events) |
| Beacon Falls Public Library (Beacon Falls, CT) | CT | WordPress-CT | 0 | [Link](https://www.beaconfallslibrary.org/events) |
| Berlin Free Library Association (Berlin, CT) | CT | WordPress-CT | 10 | [Link](https://www.berlinlibrary.org/events) |
| Clark Memorial Library (Bethany, CT) | CT | WordPress-CT | 10 | [Link](https://bethanylibrary.org/) |
| Bethel Public Library (Bethel, CT) | CT | WordPress-CT | 0 | [Link](https://www.bethellibrary.org/events) |
| Bethlehem Public Library (Bethlehem, CT) | CT | WordPress-CT | 0 | [Link](https://www.bethlehemlibrary.org/events) |
| Brookfield Library (Brookfield, CT) | CT | WordPress-CT | 86 | [Link](https://www.brookfieldlibrary.org/events) |
| Burlington Public Library (Burlington, CT) | CT | WordPress-CT | 45 | [Link](https://www.burlingtonlibrary.org/events) |
| Canterbury Public Library (Canterbury, CT) | CT | WordPress-CT | 0 | [Link](https://www.canterburylibrary.org/events) |
| Canton Public Library (Canton, CT) | CT | WordPress-CT | 0 | [Link](https://www.cantonlibrary.org/events) |
| Cheshire Public Library (Cheshire, CT) | CT | WordPress-CT | 2 | [Link](https://www.cheshirelibrary.org/events) |
| Chester Public Library (Chester, CT) | CT | WordPress-CT | 0 | [Link](https://www.chesterlibrary.org/) |
| Henry Carter Hull Library (Clinton, CT) | CT | WordPress-CT | 0 | [Link](https://www.clintonlibrary.org/events) |
| Saxton B. Little Free Library (Columbia, CT) | CT | WordPress-CT | 1 | [Link](https://www.columbialibrary.org/events) |
| Cornwall Library Association (Cornwall, CT) | CT | WordPress-CT | 4 | [Link](https://www.cornwalllibrary.org/events) |
| Booth Dimock Memorial Library (Coventry, CT) | CT | WordPress-CT | 2 | [Link](https://www.coventrylibrary.org/) |
| Darien Library (Darien, CT) | CT | WordPress-CT | 24 | [Link](https://www.darienlibrary.org/events) |
| Durham Public Library (Durham, CT) | CT | WordPress-CT | 39 | [Link](https://www.durhamlibrary.org/events) |
| East Hampton Public Library (East Hampton, CT) | CT | WordPress-CT | 26 | [Link](https://www.easthamptonlibrary.org/events) |
| Easton Public Library (Easton, CT) | CT | WordPress-CT | 0 | [Link](https://www.eastonlibrary.org/library-events) |
| Hall Memorial Library (Ellington, CT) | CT | WordPress-CT | 0 | [Link](https://www.ellingtonlibrary.org/events) |
| Essex Library Association (Essex, CT) | CT | WordPress-CT | 0 | [Link](https://www.essexlibrary.org/events) |
| Farmington Library (Farmington, CT) | CT | WordPress-CT | 9 | [Link](https://www.farmingtonpublic.org/) |
| Janet Carlson Calvert Library (Franklin, CT) | CT | WordPress-CT | 3 | [Link](https://www.franklinlibrary.org/events) |
| Goshen Public Library (Goshen, CT) | CT | WordPress-CT | 0 | [Link](https://www.goshenlibrary.org/) |
| Frederick H. Cossitt Library (Granby, CT) | CT | WordPress-CT | 1 | [Link](https://granbylibrary.org/) |
| Community Branch Library (Hamden, CT) | CT | WordPress-CT | 1 | [Link](https://hamdenlibrary.org/) |
| Hartland Public Library (Hartland, CT) | CT | WordPress-CT | 0 | [Link](https://www.hartlandlibrary.org/events) |
| Harwinton Public Library (Harwinton, CT) | CT | WordPress-CT | 109 | [Link](https://www.harwintonlibrary.org/events) |
| Douglas Library Of Hebron (Hebron, CT) | CT | WordPress-CT | 0 | [Link](https://www.hebronlibrary.org/events) |
| Ivoryton Library Association (Ivoryton, CT) | CT | WordPress-CT | 0 | [Link](https://www.ivorytonlibrary.org/events) |
| Kent Library Association (Kent, CT) | CT | WordPress-CT | 59 | [Link](https://kentpl.librarycalendar.com/events/month) |
| Killingworth Library (Killingworth, CT) | CT | WordPress-CT | 0 | [Link](https://www.killingworthlibrary.org/events) |
| Jonathan Trumbull Library (Lebanon, CT) | CT | WordPress-CT | 0 | [Link](https://lebanonlibrary.org/) |
| Bill Library (Ledyard, CT) | CT | WordPress-CT | 1 | [Link](https://www.ledyardlibrary.org/events) |
| E.C. Scranton Memorial Library (Madison, CT) | CT | WordPress-CT | 9 | [Link](https://www.madisonlibrary.org/events) |
| Mansfield Public Library (Mansfield, CT) | CT | WordPress-CT | 0 | [Link](https://www.mansfieldlibrary.org/events) |
| Middlebury Public Library (Middlebury, CT) | CT | WordPress-CT | 22 | [Link](https://www.middleburylibrary.org/events) |
| Levi E.Coe Library (Middlefield, CT) | CT | WordPress-CT | 0 | [Link](https://middlefieldlibrary.org/) |
| Edith Wheeler Memorial Library (Monroe, CT) | CT | WordPress-CT | 0 | [Link](https://www.monroelibrary.org/events) |
| Mystic Noank Library (Mystic, CT) | CT | WordPress-CT | 0 | [Link](https://www.mysticlibrary.org/events) |
| New Canaan Library (New Canaan, CT) | CT | WordPress-CT | 74 | [Link](https://www.newcanaanlibrary.org/events) |
| New Fairfield Free Public Library (New Fairfield, CT) | CT | WordPress-CT | 6 | [Link](https://www.newfairfieldlibrary.org/) |
| Public Library Of New London (New London, CT) | CT | WordPress-CT | 11 | [Link](https://www.newlondonlibrary.org/events) |
| New Milford Public Library (New Milford, CT) | CT | WordPress-CT | 1 | [Link](https://newmilfordlibrary.org/) |
| Cyrenius H. Booth Library (Newtown, CT) | CT | WordPress-CT | 0 | [Link](https://newtownlibrary.org/) |
| Norfolk Library (Norfolk, CT) | CT | WordPress-CT | 13 | [Link](https://www.norfolklibrary.org/events) |
| North Haven Memorial Library (North Haven, CT) | CT | WordPress-CT | 0 | [Link](https://www.northhavenlibrary.org/events) |
| Otis Library (Norwich, CT) | CT | WordPress-CT | 1 | [Link](https://www.norwichlibrary.org/category/events/) |
| Old Lyme - Phoebe Griffin Noyes Library (Old Lyme, CT) | CT | WordPress-CT | 0 | [Link](https://www.oldlymelibrary.org/events) |
| Oxford Public Library (Oxford, CT) | CT | WordPress-CT | 0 | [Link](https://oxfordlibrary.org/) |
| Central Village Public Library (Plainfield, CT) | CT | WordPress-CT | 7 | [Link](https://www.plainfieldlibrary.org/events) |
| Plainville Public Library (Plainville, CT) | CT | WordPress-CT | 0 | [Link](https://www.plainvillelibrary.org/events) |
| Plymouth Library Association (Plymouth, CT) | CT | WordPress-CT | 0 | [Link](https://plymouthlibrary.org/) |
| Pomfret Public Library (Pomfret, CT) | CT | WordPress-CT | 0 | [Link](https://www.pomfretlibrary.org/events) |
| Portland Public Library (Portland, CT) | CT | WordPress-CT | 0 | [Link](https://www.portlandlibrary.org/events) |
| Preston Public Library (Preston, CT) | CT | WordPress-CT | 1 | [Link](https://prestonpubliclibrary.org/events/) |
| Prospect Public Library (Prospect, CT) | CT | WordPress-CT | 0 | [Link](https://www.prospectlibrary.org/calendar) |
| Ridgefield Library (Ridgefield, CT) | CT | WordPress-CT | 10 | [Link](https://ridgefieldlibrary.org/) |
| Minor Memorial Library (Roxbury, CT) | CT | WordPress-CT | 44 | [Link](https://www.roxburylibrary.org/events) |
| Salem Free Public Library (Salem, CT) | CT | WordPress-CT | 0 | [Link](https://www.salemlibrary.org/events) |
| Scoville Memorial Library (Salisbury, CT) | CT | WordPress-CT | 0 | [Link](https://www.salisburylibrary.org/) |
| Seymour Public Library (Seymour, CT) | CT | WordPress-CT | 128 | [Link](https://www.seymourlibrary.org/events) |
| Sherman Library Assn. (Sherman, CT) | CT | WordPress-CT | 1 | [Link](https://www.shermanlibrary.org/) |
| Somers Public Library (Somers, CT) | CT | WordPress-CT | 14 | [Link](https://www.somerslibrary.org/events) |
| South Windsor Public Library (South Windsor, CT) | CT | WordPress-CT | 68 | [Link](https://www.southwindsorlibrary.org/events) |
| Southbury Public Library (Southbury, CT) | CT | WordPress-CT | 61 | [Link](https://www.southburylibrary.org/events) |
| Pequot Library Association (Southport, CT) | CT | WordPress-CT | 0 | [Link](https://www.southportlibrary.org/events) |
| Stafford Library Association (Stafford, CT) | CT | WordPress-CT | 1 | [Link](https://www.staffordlibrary.org/events) |
| Stonington Free Library (Stonington, CT) | CT | WordPress-CT | 0 | [Link](https://www.stoningtonlibrary.org/) |
| Kent Memorial Library (Suffield, CT) | CT | WordPress-CT | 0 | [Link](https://kentpl.librarycalendar.com/events/month) |
| Thomaston Public Library (Thomaston, CT) | CT | WordPress-CT | 0 | [Link](https://thomastonlibrary.org/) |
| Union Free Public Library (Union, CT) | CT | WordPress-CT | 111 | [Link](https://www.unionlibrary.org/events) |
| Warren Public Library (Warren, CT) | CT | WordPress-CT | 1 | [Link](https://www.warrenlibrary.org/events) |
| Waterford Public Library (Waterford, CT) | CT | WordPress-CT | 0 | [Link](https://www.waterfordlibrary.org/events) |
| Oakville Branch Library (Watertown, CT) | CT | WordPress-CT | 0 | [Link](https://www.watertownlibrary.org/) |
| Louis Piantino Branch Library (West Haven, CT) | CT | WordPress-CT | 0 | [Link](https://www.westhavenlibrary.org/events) |
| Westbrook Public Library (Westbrook, CT) | CT | WordPress-CT | 91 | [Link](https://www.westbrooklibrary.org/events) |
| Weston Public Library (Weston, CT) | CT | WordPress-CT | 0 | [Link](https://www.westonlibrary.org/events) |
| Westport Library (Westport, CT) | CT | WordPress-CT | 44 | [Link](https://www.westportlibrary.org/events) |
| Wethersfield Public Library (Wethersfield, CT) | CT | WordPress-CT | 0 | [Link](https://www.wethersfieldlibrary.org/) |
| Willimantic Public Library (Willimantic, CT) | CT | WordPress-CT | 25 | [Link](https://www.willimanticlibrary.org/events) |
| Wilton Library Association (Wilton, CT) | CT | WordPress-CT | 1 | [Link](https://www.wiltonlibrary.org/events) |
| Beardsley Memorial Library (Winchester, CT) | CT | WordPress-CT | 1 | [Link](https://www.winchesterlibrary.org/events) |
| Windham Free Library (Windham, CT) | CT | WordPress-CT | 2 | [Link](https://windhamlibrary.org/) |
| Wilson Branch Library (Windsor, CT) | CT | WordPress-CT | 0 | [Link](https://www.windsorlibrary.org/events) |
| Windsor Locks Public Library (Windsor Locks, CT) | CT | WordPress-CT | 0 | [Link](https://www.windsorlockslibrary.org/events) |
| Wolcott Public Library (Wolcott, CT) | CT | WordPress-CT | 1 | [Link](https://www.wolcottlibrary.org/events) |
| Woodbridge Town Library (Woodbridge, CT) | CT | WordPress-CT | 0 | [Link](https://www.woodbridgelibrary.org/calendar.aspx) |
| Woodbury Public Library (Woodbury, CT) | CT | WordPress-CT | 28 | [Link](https://www.woodburylibrary.org/events) |
| Nashville Public Library | TN | WordPress-TN | 1 | [Link](https://library.nashville.org/events) |
| Memphis Public Libraries | TN | WordPress-TN | 32 | [Link](https://www.memphislibrary.org/events) |
| Knox County Public Library | TN | WordPress-TN | 24 | [Link](https://www.knoxlib.org/events) |
| Chattanooga Public Library | TN | WordPress-TN | 150 | [Link](https://chattlibrary.org/events) |
| Clarksville-Montgomery County Public Library | TN | WordPress-TN | 0 | [Link](https://mcgtn.org/library/events) |
| Johnson City Public Library | TN | WordPress-TN | 17 | [Link](https://www.jcpl.org/events) |
| Kingsport Public Library | TN | WordPress-TN | 0 | [Link](https://www.kingsportlibrary.org/) |
| Williamson County Public Library | TN | WordPress-TN | 0 | [Link](https://www.wcpltn.org/) |
| Rutherford County Library System | TN | WordPress-TN | 0 | [Link](https://www.rcls.org/events) |
| Blount County Public Library | TN | WordPress-TN | 0 | [Link](https://www.blountlibrary.org/events) |
| Cleveland-Bradley County Public Library | TN | WordPress-TN | 1 | [Link](https://clevelandlibrary.org/) |
| Germantown Community Library | TN | WordPress-TN | 150 | [Link](https://www.germantownlibrary.org/events) |
| Collierville Burch Library | TN | WordPress-TN | 0 | [Link](https://www.colliervillelibrary.org/events) |
| Bartlett Library | TN | WordPress-TN | 0 | [Link](https://www.cityofbartlett.org/calendar.aspx?CID=34) |
| Hendersonville Public Library | TN | WordPress-TN | 0 | [Link](https://youseemore.com/hendersonville/) |
| Morristown-Hamblen Library | TN | WordPress-TN | 0 | [Link](https://www.mhlibrary.org/events) |
| Smyrna Public Library | TN | WordPress-TN | 0 | [Link](https://www.smyrnalibrary.org/events) |
| Sevier County Public Library System | TN | WordPress-TN | 0 | [Link](https://www.sevierlibrary.org/) |
| Tullahoma Public Library | TN | WordPress-TN | 0 | [Link](https://www.tullahoma-tn.com/library/events) |
| Athens Public Library | TN | WordPress-TN | 37 | [Link](https://www.athenslibrary.org/events) |
| Lawrenceburg Public Library | TN | WordPress-TN | 0 | [Link](https://lawrencelibrary.org/) |
| Crossville-Cumberland County Public Library | TN | WordPress-TN | 0 | [Link](https://www.cumberlandcountylibrary.org/events) |
| Manchester Public Library | TN | WordPress-TN | 0 | [Link](https://www.manchesterlibrary.org/events) |
| Rogersville Public Library | TN | WordPress-TN | 0 | [Link](https://www.rogersvillelibrary.org/events) |
| Tipton County Public Library | TN | WordPress-TN | 0 | [Link](https://www.tiptoncountylibrary.org/) |
| Savannah-Hardin County Library | TN | WordPress-TN | 1 | [Link](https://www.hardincountylibrary.org/events) |
| Crockett County Library | TN | WordPress-TN | 0 | [Link](https://www.alamolibrary.org/events) |
| Alexandria Branch Library | TN | WordPress-TN | 6 | [Link](https://www.alexandrialibrary.org/events) |
| Southeast Branch Library | TN | WordPress-TN | 0 | [Link](https://www.antiochlibrary.org/events) |
| Ardmore Public Library | TN | WordPress-TN | 0 | [Link](https://ardmore.okpls.org/calendar) |
| Sam T. Wilson Public Library | TN | WordPress-TN | 0 | [Link](https://www.arlingtonlibrary.org/home) |
| Auburntown Public Library | TN | WordPress-TN | 1 | [Link](https://adamsmemoriallibrary.org/) |
| Baxter Branch Library | TN | WordPress-TN | 150 | [Link](https://www.baxterlibrary.org/events) |
| The Brentwood Library | TN | WordPress-TN | 0 | [Link](https://www.brentwoodlibrary.org/events) |
| Benton County Library | TN | WordPress-TN | 0 | [Link](https://www.camdenlibrary.org/) |
| Smith County Public Library | TN | WordPress-TN | 0 | [Link](https://www.carthagelibrary.org/events) |
| Hickman County Public Library | TN | WordPress-TN | 150 | [Link](https://www.centervillelibrary.org/events) |
| Clinton Public Library | TN | WordPress-TN | 0 | [Link](https://www.clintonlibrary.org/events) |
| Cordova Branch Library | TN | WordPress-TN | 0 | [Link](https://cordovalibrary.org/) |
| Meigs-Decatur Public Library | TN | WordPress-TN | 96 | [Link](https://www.decaturlibrary.org/events) |
| Stewart County Public Library | TN | WordPress-TN | 0 | [Link](https://www.doverlibrary.org/events) |
| Sequatchie County Public Library | TN | WordPress-TN | 0 | [Link](https://www.dunlaplibrary.org/events) |
| Englewood Public Library | TN | WordPress-TN | 0 | [Link](https://www.englewoodlibrary.org/events) |
| Unicoi County Public Library | TN | WordPress-TN | 0 | [Link](https://erwinlibrary.org/) |
| Fairview Public Library | TN | WordPress-TN | 0 | [Link](https://www.fairviewlibrary.org/events) |
| Gleason Memorial Library | TN | WordPress-TN | 0 | [Link](https://www.gleasonlibrary.org/events) |
| Dr. Nathan Porter Library | TN | WordPress-TN | 3 | [Link](https://www.greenfieldlibrary.org/events) |
| Harriman Public Library | TN | WordPress-TN | 0 | [Link](https://www.harrimanlibrary.org/) |
| Carroll County Library | TN | WordPress-TN | 0 | [Link](https://www.huntingdonlibrary.org/events) |
| Fentress County Library | TN | WordPress-TN | 0 | [Link](https://www.jamestownlibrary.org/events) |
| Kingston Public Library | TN | WordPress-TN | 10 | [Link](https://www.kingstonlibrary.org/events) |
| Macon County Public Library | TN | WordPress-TN | 1 | [Link](https://lafayettelibrary.org/) |
| Millard Oakley Public Library | TN | WordPress-TN | 0 | [Link](https://www.livingstonlibrary.org/events) |
| Nashville Talking Library | TN | WordPress-TN | 8 | [Link](https://www.madisonlibrary.org/events) |
| Madisonville Public Library | TN | WordPress-TN | 0 | [Link](https://www.madisonvillelibrary.org/events) |
| Middleton Community Library | TN | WordPress-TN | 0 | [Link](https://www.middletonlibrary.org/calendar) |
| Mildred G. Fields Memorial Library | TN | WordPress-TN | 1 | [Link](https://milanlibrary.org/) |
| Monterey Branch Library | TN | WordPress-TN | 0 | [Link](https://www.montereylibrary.org/events) |
| Mt. Juliet-Harvey Freeman Public Library | TN | WordPress-TN | 0 | [Link](https://www.mtjulietlibrary.org/events) |
| Newbern City Library | TN | WordPress-TN | 16 | [Link](https://www.newbernlibrary.org/events) |
| Palmer Public Library | TN | WordPress-TN | 0 | [Link](https://www.palmerlibrary.org/events) |
| Parsons Public Library | TN | WordPress-TN | 0 | [Link](https://www.parsonslibrary.org/) |
| Portland Public Library | TN | WordPress-TN | 9 | [Link](https://www.portlandlibrary.org/events) |
| Lauderdale County Library | TN | WordPress-TN | 1 | [Link](https://ripleylibrary.org/) |
| Seymour Branch Library | TN | WordPress-TN | 128 | [Link](https://www.seymourlibrary.org/events) |
| Somerville-Fayette County Library | TN | WordPress-TN | 0 | [Link](https://www.somervillelibrary.org/) |
| White County Public Library | TN | WordPress-TN | 37 | [Link](https://www.spartalibrary.org/events) |
| Audrey Pack Memorial Library | TN | WordPress-TN | 0 | [Link](https://springcitylibrary.org/) |
| Spring Hill Public Library | TN | WordPress-TN | 0 | [Link](https://www.springhilllibrary.org/events) |
| Sweetwater Public Library | TN | WordPress-TN | 1 | [Link](https://www.sweetwaterlibrary.org/) |
| Mary E. Tippitt Memorial Library | TN | WordPress-TN | 0 | [Link](https://www.townsendlibrary.org/events) |
| Hamilton Parks Public Library | TN | WordPress-TN | 1 | [Link](https://www.trimblelibrary.org/events) |
| Washburn Public Library | TN | WordPress-TN | 10 | [Link](https://www.washburnlibrary.org/events) |
| Watertown-Wilson County Library | TN | WordPress-TN | 0 | [Link](https://www.watertownlibrary.org/) |
| Humphreys County Public Library | TN | WordPress-TN | 1 | [Link](https://www.waverlylibrary.com/) |
| Westmoreland Public Library | TN | WordPress-TN | 0 | [Link](https://www.westmorelandpubliclibrary.com/) |
| White Pine Public Library | TN | WordPress-TN | 0 | [Link](https://whitepinelibrary.org/) |
| Franklin County Public Library | TN | WordPress-TN | 0 | [Link](https://www.winchesterlibrary.org/events) |
| Winfield Public Library | TN | WordPress-TN | 0 | [Link](https://www.winfieldlibrary.org/) |
| Adams Memorial Library | TN | WordPress-TN | 28 | [Link](https://www.woodburylibrary.org/events) |
| Franklin Public Library | TN | WordPress-TN | 0 | [Link](https://www.winchesterlibrary.org/events) |
| Birmingham Public Library | AL | WordPress-AL | 1 | [Link](https://www.cobpl.org/calendar/) |
| Huntsville-Madison County Public Library | AL | WordPress-AL | 13 | [Link](https://www.hmcpl.org/events) |
| Mobile Public Library | AL | WordPress-AL | 30 | [Link](https://www.mplonline.org/events) |
| Montgomery City-County Public Library | AL | WordPress-AL | 28 | [Link](https://www.mccpl.lib.al.us/events) |
| Tuscaloosa Public Library | AL | WordPress-AL | 150 | [Link](https://www.tuscaloosa-library.org/events) |
| Auburn Public Library | AL | WordPress-AL | 1 | [Link](https://www.auburnal.gov/library/) |
| Dothan Houston County Library System | AL | WordPress-AL | 73 | [Link](https://www.dhcls.org/events) |
| Decatur Public Library | AL | WordPress-AL | 107 | [Link](https://www.decaturlibrary.org/events) |
| Florence-Lauderdale Public Library | AL | WordPress-AL | 0 | [Link](https://www.flpl.org/calendar/) |
| Hoover Public Library | AL | WordPress-AL | 8 | [Link](https://www.hooverlibrary.org/events) |
| Vestavia Hills Library | AL | WordPress-AL | 150 | [Link](https://www.vestavialibrary.org/events) |
| Homewood Public Library | AL | WordPress-AL | 0 | [Link](https://www.homewoodpubliclibrary.org/events) |
| Jefferson County Library Cooperative | AL | WordPress-AL | 0 | [Link](https://www.jclc.org/events) |
| Selma-Dallas County Public Library | AL | WordPress-AL | 1 | [Link](https://selmalibrary.org/) |
| Athens-Limestone Public Library | AL | WordPress-AL | 37 | [Link](https://www.athenslibrary.org/events) |
| Fairhope Public Library | AL | WordPress-AL | 150 | [Link](https://fairhopelibrary.org/index.php/calendar/) |
| Daphne Public Library | AL | WordPress-AL | 0 | [Link](http://www.daphneal.com/178/Public-Library) |
| Scottsboro Public Library | AL | WordPress-AL | 0 | [Link](https://scottsborolibrary.org/) |
| Troy Public Library | AL | WordPress-AL | 0 | [Link](https://www.troylibrary.org/events) |
| Pelham Public Library | AL | WordPress-AL | 80 | [Link](https://www.pelhamlibrary.org/calendar/) |
| Trussville Public Library | AL | WordPress-AL | 3 | [Link](https://www.trussvillelibrary.com/events) |
| Gardendale Public Library | AL | WordPress-AL | 1 | [Link](https://www.gardendalelibrary.org/events) |
| Abbeville Memorial Library | AL | WordPress-AL | 7 | [Link](https://www.abbevillelibrary.org/) |
| Akron Public Library | AL | WordPress-AL | 0 | [Link](https://www.akronlibrary.org/events) |
| Andalusia Public Library | AL | WordPress-AL | 0 | [Link](https://www.andalusialibrary.org/) |
| Ashland City Public Library | AL | WordPress-AL | 0 | [Link](https://www.ashlandlibrary.org/events) |
| Bridgeport - Lena Cagle Public Library | AL | WordPress-AL | 0 | [Link](https://www.bridgeportlibrary.org/calendar) |
| Choctaw County Public Library | AL | WordPress-AL | 0 | [Link](https://www.butlerlibrary.org/events) |
| Wilcox County Library | AL | WordPress-AL | 0 | [Link](https://www.camdenlibrary.org/) |
| Chelsea Public Library | AL | WordPress-AL | 0 | [Link](https://www.chelsealibrary.org/events) |
| Clayton Town And County Public Library | AL | WordPress-AL | 0 | [Link](https://www.claytonlibrary.org/events) |
| Collinsville Public Library | AL | WordPress-AL | 0 | [Link](https://www.collinsvillelibrary.org/events) |
| Houston-Love Memorial Library - Columbia | AL | WordPress-AL | 0 | [Link](https://www.columbialibrary.org/events) |
| Cordova Public Library | AL | WordPress-AL | 0 | [Link](https://cordovalibrary.org/) |
| Daleville Public Library | AL | WordPress-AL | 1 | [Link](https://www.dalevillelibrary.org/events) |
| Walter J. Hanna Memorial Library | AL | WordPress-AL | 1 | [Link](https://fairfieldlibrary.org/) |
| Fayette County Memorial Library | AL | WordPress-AL | 78 | [Link](https://www.fayettelibrary.org/events) |
| Foley Public Library | AL | WordPress-AL | 0 | [Link](https://www.foleylibrary.org/) |
| Grant Public Library | AL | WordPress-AL | 0 | [Link](https://www.grantlibrary.org/events) |
| Hale County Library | AL | WordPress-AL | 0 | [Link](https://www.greensborolibrary.org/events) |
| Butler County Public Library | AL | WordPress-AL | 13 | [Link](https://www.greenvillelibrary.org/events) |
| Guntersville Public Library | AL | WordPress-AL | 0 | [Link](https://www.guntersvillelibrary.org/events) |
| Clyde Nix Public Library | AL | WordPress-AL | 0 | [Link](https://hamiltonlibrary.org/) |
| Hartford - Mcgregor-Mckinney Public Library | AL | WordPress-AL | 0 | [Link](https://www.hartfordlibrary.org/events) |
| Blanche R. Solomon Memorial Library | AL | WordPress-AL | 0 | [Link](https://www.headlandlibrary.org/) |
| Jane B. Holmes Public Library | AL | WordPress-AL | 0 | [Link](https://www.lclibrary.org/) |
| Hueytown Public Library | AL | WordPress-AL | 0 | [Link](https://www.hueytownlibrary.org/) |
| Irondale Public Library | AL | WordPress-AL | 0 | [Link](https://www.irondalelibrary.org/events) |
| City Of Bayou La Batre Public Library | AL | WordPress-AL | 0 | [Link](https://irvingtonlibrary.org/) |
| Kennedy Public Library | AL | WordPress-AL | 0 | [Link](https://www.kennedylibrary.org/events) |
| Lafayette Pilot Public Library | AL | WordPress-AL | 1 | [Link](https://lafayettelibrary.org/) |
| Jane Culbreth Library | AL | WordPress-AL | 0 | [Link](https://www.leedslibrary.org/events) |
| Leighton Public Library | AL | WordPress-AL | 21 | [Link](https://www.leightonlibrary.org/news-events/library-events) |
| Burchell Campbell Memorial Library | AL | WordPress-AL | 0 | [Link](https://www.lexingtonlibrary.org/events) |
| Lincoln Public Library | AL | WordPress-AL | 0 | [Link](https://www.lincolnlibrary.org/events) |
| Ruby Pickens Tartt Public Library | AL | WordPress-AL | 1 | [Link](https://www.livingstonlibrary.org/events) |
| Louisville Public Library | AL | WordPress-AL | 15 | [Link](https://www.louisvillelibrary.org/events) |
| Madison Public Library | AL | WordPress-AL | 14 | [Link](https://www.madisonlibrary.org/events) |
| Marion-Perry County Library | AL | WordPress-AL | 3 | [Link](https://www.marionlibrary.org/) |
| Millbrook Public Library | AL | WordPress-AL | 0 | [Link](https://millbrooklibrary.org/) |
| Monroe County Public Library | AL | WordPress-AL | 0 | [Link](https://www.monroevillelibrary.org/events) |
| Doris Stanley Memorial Library | AL | WordPress-AL | 1 | [Link](https://moodylibrary.org/calendar) |
| Newton Public Library | AL | WordPress-AL | 0 | [Link](https://www.newtonlibrary.org/events) |
| Opp Public Library | AL | WordPress-AL | 0 | [Link](https://www.opplibrary.org/events) |
| Orange Beach Public Library | AL | WordPress-AL | 0 | [Link](https://www.orangebeachlibrary.org/events) |
| Oxford Public Library | AL | WordPress-AL | 0 | [Link](https://oxfordlibrary.org/) |
| Piedmont Public Library | AL | WordPress-AL | 0 | [Link](https://www.piedmontlibrary.org/events) |
| Pine Hill Branch Public Library | AL | WordPress-AL | 1 | [Link](https://pinehilllibrary.org/calendar/) |
| Clay Public Library | AL | WordPress-AL | 0 | [Link](https://www.pinsonlibrary.org/events) |
| Satsuma Public Library | AL | WordPress-AL | 0 | [Link](https://www.satsumalibrary.com/upcoming-events) |
| Evergreen Public Library | AL | WordPress-AL | 0 | [Link](https://www.evergreenlibrary.org/events) |
| Sheffield Public Library | AL | WordPress-AL | 0 | [Link](https://www.sheffieldlibrary.org/) |
| Somerville Public Library | AL | WordPress-AL | 0 | [Link](https://www.somervillelibrary.org/) |
| Stevenson Public Library | AL | WordPress-AL | 0 | [Link](https://www.stevensonlibrary.org/events) |
| H. Grady Bradshaw - Chambers County Library | AL | WordPress-AL | 1 | [Link](https://www.valleylibrary.org/) |
| Vernon - Mary Wallace Cobb Memorial Library | AL | WordPress-AL | 0 | [Link](https://www.vernonlibrary.org/) |
| Warrior Public Library | AL | WordPress-AL | 0 | [Link](https://www.warriorlibrary.org/events) |
| Wilsonville - Vernice Stoudenmire Library | AL | WordPress-AL | 82 | [Link](https://www.wilsonvillelibrary.org/events) |
| Northwest Regional Library | AL | WordPress-AL | 0 | [Link](https://www.winfieldlibrary.org/) |
| Woodville Public Library | AL | WordPress-AL | 0 | [Link](https://www.woodvillelibrary.org/events) |
| Hightower Memorial Library | AL | WordPress-AL | 0 | [Link](https://yorklibrary.org/) |
| Fletcher Free Library (Burlington, VT) | VT | WordPress-VT | 6 | [Link](https://fletcherfree.org/) |
| Kellogg-Hubbard Library (Montpelier, VT) | VT | WordPress-VT | 150 | [Link](https://kellogghubbard.org/calendar/) |
| Brooks Memorial Library (Brattleboro, VT) | VT | WordPress-VT | 150 | [Link](https://www.brookslibraryvt.org/events) |
| St. Johnsbury Athenaeum (St. Johnsbury, VT) | VT | WordPress-VT | 3 | [Link](https://www.stjathenaeum.org/events) |
| Ilsley Public Library (Middlebury, VT) | VT | WordPress-VT | 20 | [Link](https://www.ilsleypubliclibrary.org/events) |
| Norman Williams Public Library (Woodstock, VT) | VT | WordPress-VT | 150 | [Link](https://www.normanwilliams.org/events) |
| Aldrich Public Library (Barre, VT) | VT | WordPress-VT | 0 | [Link](https://www.aldrichpubliclibrary.org/events) |
| Brownell Library (Essex Junction, VT) | VT | WordPress-VT | 0 | [Link](https://www.brownelllibrary.org/events) |
| Pierson Library (Shelburne, VT) | VT | WordPress-VT | 45 | [Link](https://www.piersonlibrary.org/events) |
| Rockingham Free Public Library (Bellows Falls, VT) | VT | WordPress-VT | 6 | [Link](https://www.rockinghamlibrary.org/events) |
| Springfield Town Library (Springfield, VT) | VT | WordPress-VT | 2 | [Link](https://www.springfieldtownlibrary.org/calendar) |
| Morristown Centennial Library (Morrisville, VT) | VT | WordPress-VT | 0 | [Link](https://www.centenniallibrary.org/) |
| Haskell Free Library (Derby Line, VT) | VT | WordPress-VT | 0 | [Link](https://www.haskellopera.com/library/events) |
| Cobleigh Public Library (Lyndonville, VT) | VT | WordPress-VT | 0 | [Link](https://www.cobleighlibrary.org/events) |
| Hartland Public Library (Hartland, VT) | VT | WordPress-VT | 0 | [Link](https://www.hartlandlibraryvt.org/calendar/) |
| Deborah Rawson Memorial Library (Jericho, VT) | VT | WordPress-VT | 16 | [Link](https://www.drml.org/programs/calendar/) |
| Martha Canfield Memorial (Arlington, VT) | VT | WordPress-VT | 0 | [Link](https://www.arlingtonlibrary.org/home) |
| Barton Public (Barton, VT) | VT | WordPress-VT | 0 | [Link](https://www.bartonlibrary.org/events) |
| Mount Holly (Belmont, VT) | VT | WordPress-VT | 10 | [Link](https://smcl.org/) |
| Bennington Free (Bennington, VT) | VT | WordPress-VT | 150 | [Link](https://www.benningtonlibrary.org/events) |
| Benson Public (Benson, VT) | VT | WordPress-VT | 0 | [Link](https://www.bensonlibrary.org/events) |
| Bethel Public (Bethel, VT) | VT | WordPress-VT | 0 | [Link](https://www.bethellibrary.org/events) |
| Bradford Public (Bradford, VT) | VT | WordPress-VT | 0 | [Link](https://bradfordlibrary.org/) |
| Brandon Free Public (Brandon, VT) | VT | WordPress-VT | 62 | [Link](https://www.brandonlibrary.org/events-calendar) |
| Brookfield Free Public (Brookfield, VT) | VT | WordPress-VT | 86 | [Link](https://www.brookfieldlibrary.org/events) |
| Cabot Public (Cabot, VT) | VT | WordPress-VT | 0 | [Link](https://www.cabotlibrary.org/events) |
| Alice M. Ward Memorial (Canaan, VT) | VT | WordPress-VT | 15 | [Link](https://www.canaanlibrary.org/events) |
| Charlotte (Charlotte, VT) | VT | WordPress-VT | 68 | [Link](https://charlottelibrary.org/calendar/) |
| Chelsea Public (Chelsea, VT) | VT | WordPress-VT | 0 | [Link](https://www.chelsealibrary.org/events) |
| Whiting (Chester, VT) | VT | WordPress-VT | 0 | [Link](https://www.chesterlibrary.org/) |
| Concord Public Library (Concord, VT) | VT | WordPress-VT | 3 | [Link](https://www.concordlibrary.org/events) |
| Cornwall Free Public (Cornwall, VT) | VT | WordPress-VT | 4 | [Link](https://www.cornwalllibrary.org/events) |
| Pope Memorial (Danville, VT) | VT | WordPress-VT | 0 | [Link](https://www.danvillelibrary.org/events) |
| Essex Free (Essex, VT) | VT | WordPress-VT | 0 | [Link](https://www.essexlibrary.org/events) |
| Fair Haven Free (Fair Haven, VT) | VT | WordPress-VT | 1 | [Link](https://fairhavenlibrary.org/) |
| Fairfax Community (Fairfax, VT) | VT | WordPress-VT | 0 | [Link](https://www.fairfaxlibrary.org/events) |
| Bent Northrup Memorial (Fairfield, VT) | VT | WordPress-VT | 1 | [Link](https://fairfieldlibrary.org/) |
| Haston (Franklin, VT) | VT | WordPress-VT | 3 | [Link](https://www.franklinlibrary.org/events) |
| Gilman Public Library (Gilman, VT) | VT | WordPress-VT | 0 | [Link](https://gilmanlibrary.org/calendar) |
| Glover Public (Glover, VT) | VT | WordPress-VT | 0 | [Link](https://gloverlibrary.org/) |
| Grafton Public (Grafton, VT) | VT | WordPress-VT | 0 | [Link](https://www.graftonlibrary.org/events) |
| Greensboro Free (Greensboro, VT) | VT | WordPress-VT | 0 | [Link](https://www.greensborolibrary.org/events) |
| Hancock Free Public (Hancock, VT) | VT | WordPress-VT | 4 | [Link](https://hancocklibrary.org/) |
| Hartford (Hartford, VT) | VT | WordPress-VT | 0 | [Link](https://www.hartfordlibrary.org/events) |
| Huntington Public (Huntington, VT) | VT | WordPress-VT | 0 | [Link](https://www.huntingtonlibrary.org/) |
| Lanpher Memorial (Hyde Park, VT) | VT | WordPress-VT | 42 | [Link](https://www.hydeparklibrary.org/events) |
| Lincoln (Lincoln, VT) | VT | WordPress-VT | 0 | [Link](https://www.lincolnlibrary.org/events) |
| Lowell Community (Lowell, VT) | VT | WordPress-VT | 0 | [Link](https://www.lowelllibrary.org/events) |
| Alden Balch Memorial (Lunenburg, VT) | VT | WordPress-VT | 0 | [Link](https://lunenburglibrary.org/) |
| Mark Skinner (Manchester, VT) | VT | WordPress-VT | 0 | [Link](https://www.manchesterlibrary.org/events) |
| Jaquith Public (Marshfield, VT) | VT | WordPress-VT | 0 | [Link](https://marshfieldlibrary.org/) |
| Milton Public Library (Milton, VT) | VT | WordPress-VT | 0 | [Link](https://www.miltonlibrary.org/events) |
| Russell Memorial (Monkton, VT) | VT | WordPress-VT | 1 | [Link](https://www.monktonlibrary.org/events) |
| Tenney Memorial (Newbury, VT) | VT | WordPress-VT | 1 | [Link](https://www.newburylibrary.org/events) |
| Moore Free (Newfane, VT) | VT | WordPress-VT | 0 | [Link](https://www.newfanelibrary.org/events) |
| Goodrich Memorial (Newport, VT) | VT | WordPress-VT | 1 | [Link](https://www.newportlibrary.org/events) |
| North Hero Public (North Hero, VT) | VT | WordPress-VT | 1 | [Link](https://northherolibrary.org/) |
| Norwich Public (Norwich, VT) | VT | WordPress-VT | 1 | [Link](https://www.norwichlibrary.org/category/events/) |
| Peacham (Peacham, VT) | VT | WordPress-VT | 1 | [Link](https://www.peachamlibrary.org/) |
| Roger Clark Memorial (Pittsfield, VT) | VT | WordPress-VT | 3 | [Link](https://www.pittsfieldlibrary.org/) |
| Cutler Memorial (Plainfield, VT) | VT | WordPress-VT | 7 | [Link](https://www.plainfieldlibrary.org/events) |
| Proctor Free (Proctor, VT) | VT | WordPress-VT | 0 | [Link](https://www.proctorlibrary.org/events) |
| Putney Public (Putney, VT) | VT | WordPress-VT | 23 | [Link](https://www.putneylibrary.org/events) |
| Quechee (Quechee, VT) | VT | WordPress-VT | 8 | [Link](https://www.quecheeandwilderlibraries.com/) |
| Kimball Public (Randolph, VT) | VT | WordPress-VT | 0 | [Link](https://www.randolphlibrary.org/events) |
| Reading Public (Reading, VT) | VT | WordPress-VT | 1 | [Link](https://www.readinglibrary.org/events) |
| Readsboro Community (Readsboro, VT) | VT | WordPress-VT | 0 | [Link](https://www.readsborolibrary.org/events) |
| Richmond Free (Richmond, VT) | VT | WordPress-VT | 0 | [Link](https://www.richmondlibrary.org/events) |
| Rochester Public (Rochester, VT) | VT | WordPress-VT | 0 | [Link](https://www.rochesterlibrary.org/) |
| Roxbury Free (Roxbury, VT) | VT | WordPress-VT | 44 | [Link](https://www.roxburylibrary.org/events) |
| Salisbury Free Public (Salisbury, VT) | VT | WordPress-VT | 0 | [Link](https://www.salisburylibrary.org/) |
| Sheldon Public (Sheldon, VT) | VT | WordPress-VT | 0 | [Link](https://www.sheldonlibrary.org/events) |
| Shrewsbury (Shrewsbury, VT) | VT | WordPress-VT | 0 | [Link](https://www.shrewsburylibrary.org/events) |
| Stamford Community (Stamford, VT) | VT | WordPress-VT | 0 | [Link](https://www.stamfordlibrary.org/events) |
| Stowe Free (Stowe, VT) | VT | WordPress-VT | 0 | [Link](https://www.stowelibrary.org/events) |
| Morrill Mem. Harris (Strafford, VT) | VT | WordPress-VT | 0 | [Link](https://www.straffordlibrary.org/) |
| Franklin-Grand Isle Bookmobile (Swanton, VT) | VT | WordPress-VT | 34 | [Link](https://www.swantonlibrary.org/events) |
| Latham Memorial (Thetford, VT) | VT | WordPress-VT | 1 | [Link](https://www.thetfordlibrary.org/events) |
| Tunbridge Public (Tunbridge, VT) | VT | WordPress-VT | 35 | [Link](https://www.tunbridgelibrary.org/events) |
| Vernon Free (Vernon, VT) | VT | WordPress-VT | 7 | [Link](https://www.vernonlibrary.org/) |
| Gilbert Hart (Wallingford, VT) | VT | WordPress-VT | 31 | [Link](https://www.wallingfordlibrary.org/events) |
| Warren Public (Warren, VT) | VT | WordPress-VT | 1 | [Link](https://www.warrenlibrary.org/events) |
| Waterville Town (Waterville, VT) | VT | WordPress-VT | 21 | [Link](https://www.watervillelibrary.org/events) |
| Wells Village (Wells, VT) | VT | WordPress-VT | 0 | [Link](https://wellslibrary.org/) |
| West Hartford (West Hartford, VT) | VT | WordPress-VT | 91 | [Link](https://www.westhartfordlibrary.org/) |
| Hitchcock Museum (Westfield, VT) | VT | WordPress-VT | 1 | [Link](https://www.westfieldlibrary.org/events) |
| Westford Town (Westford, VT) | VT | WordPress-VT | 1 | [Link](https://www.westfordlibrary.org/events) |
| Butterfield (Westminster, VT) | VT | WordPress-VT | 0 | [Link](https://www.westminsterlibrary.org/events) |
| Westminster West Public (Westminster West, VT) | VT | WordPress-VT | 0 | [Link](https://www.westminsterwestlibrary.org/events) |
| Wilder Memorial (Weston, VT) | VT | WordPress-VT | 0 | [Link](https://www.westonlibrary.org/events) |
| Ainsworth Public (Williamstown, VT) | VT | WordPress-VT | 150 | [Link](https://www.williamstownlibrary.org/events) |
| Pettee Memorial (Wilmington, VT) | VT | WordPress-VT | 3 | [Link](https://www.wilmingtonlibrary.org/events) |
| Windham Town (Windham, VT) | VT | WordPress-VT | 2 | [Link](https://windhamlibrary.org/) |
| Windsor Public (Windsor, VT) | VT | WordPress-VT | 0 | [Link](https://www.windsorlibrary.org/events) |
| G. M. Kelley Community (Wolcott, VT) | VT | WordPress-VT | 1 | [Link](https://www.wolcottlibrary.org/events) |
| Woodbury Community (Woodbury, VT) | VT | WordPress-VT | 28 | [Link](https://www.woodburylibrary.org/events) |
| Enoch Pratt Free Library (Pratt-Library) | MD | Pratt-Library | 955 *(log shows aggregate "2500 events in calendar" scraped from paginated calendar before de-dup/filtering; 955 is the scraper-summary FOUND figure)* | [Link](https://calendar.prattlibrary.org) |
| Free Library of Philadelphia | PA | FreeLibrary-Philadelphia | 1000 *(log paginated 10 pages x 20 = 200+ raw hits per page-cap; 1000 is the scraper-summary FOUND figure (likely page-limited))* | [Link](https://libwww.freelibrary.org) |
| Anne Arundel County Public Library (AACPL) | MD | AACPL | 20 | [Link](https://www.aacpl.net/events) |
| Prince George’s County Memorial Library System | MD | Prince-Georges-County | 72 | [Link](https://pgcmls.info/events) |
| Westmoreland County Library | PA | Westmoreland-Library | 24 | [Link](https://www.wclibraries.org/events/list/) |
| Colonial Heights Public Library | VA | CivicEngage-Libraries | 0 | [Link](https://colonialheightsva.gov/calendar.aspx?CID=8) |
| Blue Ridge Regional Library | VA | FullCalendar-Libraries | 268 *(log line shows Found 268; scraper-summary reported 216 after de-dup/filtering)* | [Link](https://events.brrl.us/iframe-events) |
| Dorchester County Public Library | MD | Dorchester-County | 17 *(Group 3 run — no per-library breakdown available (stdout log gap, see notes))* | [Link](https://www.dorchesterlibrary.org/calendar-of-events) |
| Wicomico Public Libraries | MD | Wicomico-Public | 21 *(Group 3 run — no per-library breakdown available (stdout log gap, see notes))* | [Link](https://www.wicomicolibrary.org/events/upcoming) |
| Allentown Public Library | PA | Allentown-Public | 0 *(Group 3 run — no per-library breakdown available (stdout log gap, see notes))* | [Link](https://www.allentownpl.org) |
| WithApps-Libraries (system not itemized in log) | Multi | WithApps-Libraries | 37 *(Group 3 run — no per-library breakdown available (stdout log gap, see notes))* | [Link](https://calendar.hampton.gov/hamptonva/calendar) |
| WordPress-Events-Calendar (system not itemized in log) | Multi | WordPress-Events-Calendar | 302 *(Group 3 run — no per-library breakdown available (stdout log gap, see notes))* | [Link](https://www.wcpl.net/events/) |
| Squarespace-Libraries (system not itemized in log) | Multi | Squarespace-Libraries | 54 *(Group 3 run — no per-library breakdown available (stdout log gap, see notes))* | [Link](https://api3.libcal.com/embed_calendar.php?iid=3092&cal_id=13052&w=800&h=600&dv=month) |
| Drupal-Virginia (system not itemized in log) | VA | Drupal-Virginia | 22 *(Group 3 run — no per-library breakdown available (stdout log gap, see notes))* | [Link](https://www.handleyregional.org/events/upcoming) |
| Orange County Library System | FL | Orange-County-Library-FL | 2178 *(Group 3 run — no per-library breakdown available (stdout log gap, see notes))* | [Link](https://ocls.org/calendar/) |
| Nashville Public Library | TN | Nashville-Library-TN | 153 *(Group 3 run — no per-library breakdown available (stdout log gap, see notes))* | [Link](https://events.library.nashville.org/) |
| Assabet-NH-MA (system not itemized in log) | Multi | Assabet-NH-MA | 1111 *(Group 3 run — no per-library breakdown available (stdout log gap, see notes))* | [Link](https://dovernh.assabetinteractive.com/calendar/) |
| LibraryMarket-PA (system not itemized in log) | PA | LibraryMarket-PA | 70 *(Group 3 run — no per-library breakdown available (stdout log gap, see notes))* | [Link](https://events.yorklibraries.org/events/upcoming) |
| LibraryMarket-NC (system not itemized in log) | NC | LibraryMarket-NC | 17 *(Group 3 run — no per-library breakdown available (stdout log gap, see notes))* | [Link](https://buncombe.librarycalendar.com/events/month) |
| Camden County Library System (Intercept-Camden) | NJ | Intercept-Camden | 10 *(Group 3 run — confirmed library scraper (checked scraper-intercept-camden-nj.js); no per-library breakdown needed, single library)* | [Link](https://events.camdencountylibrary.org/) |
| ABBE Regional Library System | SC | WordPress-Abbe-Regional | 20 | [Link](https://www.abbe-lib.org/events/) |
| Library System of Lancaster County | PA | Drupal-Pennsylvania | (see note) *(No per-library FOUND count printed for this platform; combined scraper-summary FOUND = 1663 for both PA systems together)* | [Link](https://calendar.lancasterlibraries.org/events/feed/html) |
| York County Libraries | PA | Drupal-Pennsylvania | (see note) *(No per-library FOUND count printed for this platform; combined scraper-summary FOUND = 1663 for both PA systems together)* | [Link](https://events.yorklibraries.org/events/feed/html) |
| Howard County Library System | MD | LibraryCalendar-Libraries | 21 *(NOTE: LibraryCalendar-Libraries is a multi-system file (21 distinct library systems across MD/VA/NC/NJ/SC/IL), not a single site)* | [Link](https://howardcounty.librarycalendar.com/events/upcoming) |
| Frederick County Public Libraries | MD | LibraryCalendar-Libraries | 20 | [Link](https://frederick.librarycalendar.com/events/upcoming) |
| Talbot County Free Library | MD | LibraryCalendar-Libraries | 22 | [Link](https://talbot.librarycalendar.com/events/upcoming) |
| Caroline County Public Library | MD | LibraryCalendar-Libraries | 18 | [Link](https://carolinecounty.librarycalendar.com/events/upcoming) |
| Amherst County Public Library | VA | LibraryCalendar-Libraries | 17 | [Link](https://amherstpl.librarycalendar.com/events/upcoming) |
| Appomattox Regional Library | VA | LibraryCalendar-Libraries | 13 | [Link](https://appomattox.librarycalendar.com/events/upcoming) |
| Bedford Public Library System | VA | LibraryCalendar-Libraries | 18 | [Link](https://bedford.librarycalendar.com/events/upcoming) |
| Essex Public Library | VA | LibraryCalendar-Libraries | 15 | [Link](https://essex.librarycalendar.com/events/upcoming) |
| Lynchburg Public Library | VA | LibraryCalendar-Libraries | 15 | [Link](https://lynchburg.librarycalendar.com/events/upcoming) |
| Petersburg Public Library | VA | LibraryCalendar-Libraries | 8 | [Link](https://petersburg.librarycalendar.com/events/upcoming) |
| Poquoson Public Library | VA | LibraryCalendar-Libraries | 19 | [Link](https://poquoson.librarycalendar.com/events/upcoming) |
| Powhatan County Public Library | VA | LibraryCalendar-Libraries | 13 | [Link](https://powhatancounty.librarycalendar.com/events/upcoming) |
| Waynesboro Public Library | VA | LibraryCalendar-Libraries | 13 | [Link](https://waynesboro.librarycalendar.com/events/upcoming) |
| York County Public Library | VA | LibraryCalendar-Libraries | 23 | [Link](https://yorkcountyva.librarycalendar.com/events/upcoming) |
| Portsmouth Public Library | VA | LibraryCalendar-Libraries | 23 | [Link](https://portsmouthpl.librarycalendar.com/events/upcoming) |
| Forsyth County Public Library (NC) | NC | LibraryCalendar-Libraries | 22 *(distinct system from the NC "Forsyth County Public Library" scraped by Communico-NC — same name, different underlying platform/branch set)* | [Link](https://forsythcounty.librarycalendar.com/events/upcoming) |
| Cumberland County Public Library | NC | LibraryCalendar-Libraries | 22 | [Link](https://cumberland.librarycalendar.com/events/upcoming) |
| Atlantic County Library System | NJ | LibraryCalendar-Libraries | 23 | [Link](https://atlanticcounty.librarycalendar.com/events/upcoming) |
| Gloucester County Library System | NJ | LibraryCalendar-Libraries | 19 | [Link](https://gcls.librarycalendar.com/events/upcoming) |
| York County Library | SC | LibraryCalendar-Libraries | 23 | [Link](https://yorkcountyva.librarycalendar.com/events/upcoming) |
| Bloomingdale Public Library | IL | LibraryCalendar-Libraries | 23 *(IL is outside FunHive’s 22-state active region; included here because it is a real library in the shared LibraryCalendar-Libraries scraper output, not a fabrication)* | [Link](https://bloomingdale.librarycalendar.com/events/upcoming) |
| LibCal libraries (5 systems) | FL | LibCal-FL | 32 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* | [Link](https://lakelandpl.libcal.com/calendar?cid=2787&t=d&d=0000-00-00&cal=2787&inc=0) |
| LibCal libraries (8 systems) | NJ | LibCal-NJ | 2172 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* | [Link](https://bccls.libcal.com/calendar/bccls/?cid=-1&t=m&d=0000-00-00&cal=-1&inc=0) |
| LibCal libraries | SC | LibCal-SC | 73 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* | [Link](https://ccplsc.libcal.com/calendar?cid=-1&t=d) |
| LibCal libraries | VA | LibCal-VA | 59 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* | [Link](https://arlingtonva.libcal.com/calendar?cid=-1&t=d&d=0000-00-00&cal=-1&inc=0) |
| LibCal libraries | ME | LibCal-ME | 12 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* | [Link](https://bangorpubliclibrary.libcal.com/) |
| Communico libraries | FL | Communico-FL | 309 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* | [Link](https://mdpls.org/events) |
| Communico libraries | MD | Communico-MD | 135 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* | [Link](https://events.bcpl.info/events) |
| Communico libraries | NY | Communico-NY | 236 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* | [Link](https://myhpl.libnet.info/events) |
| Communico libraries | PA | Communico-PA | 2 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* | [Link](https://readingpl.libnet.info/events) |
| BiblioCommons libraries | MA | BiblioCommons-MA | 607 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* | [Link](https://bpl.bibliocommons.com/v2/events) |
| WordPress libraries | PA | WordPress-PA | 705 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* | [Link](https://libwww.freelibrary.org/calendar) |
| WordPress libraries | MA | WordPress-MA | 2069 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* | [Link](https://www.actonlibrary.org/events) |
| WordPress libraries | KY | WordPress-KY | 721 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* | [Link](https://www.lfpl.org/events) |
| WordPress libraries | SC | WordPress-SC | 521 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* | [Link](https://www.abbevillelibrary.org/) |
| WordPress libraries | WV | WordPress-WV | 860 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* | [Link](https://www.kcpls.org/) |
| WordPress libraries | DE | WordPress-DE | 232 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* | [Link](https://www.wilmingtonde.gov/library/events) |
| WordPress libraries | RI | WordPress-RI | 370 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* | [Link](https://rogersfreelibrary.org/) |
| WordPress libraries | NH | WordPress-NH | 1366 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* | [Link](https://www.manchester.lib.nh.us/events) |
| Communico libraries | NH | Communico-NH | 19 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* | [Link](https://peterboroughtownlibrary.libnet.info/events) |
| Communico libraries | TN | Communico-TN | 6 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* | [Link](https://collierville.libnet.info/events) |
| Communico libraries | WV | Communico-WV | 18 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* | [Link](https://bplwv.libnet.info/events) |

### Cycle-completion check

Not complete — this is day 1 of 3. Only Group 3 (partial/aggregate-only, see gap above) and Group 1 (full breakdown) plus a few stray real Group 2 completions have run so far. The following active library-family/standalone scrapers are assigned to **Group 2** and have **not** run yet; they are expected on the next Group 2 day:

- LibCal-CT, LibCal-GA, LibCal-MA, LibCal-NY1, LibCal-PA, LibCal-TN, LibCal-WV, LibCal-VT
- Communico-GA, Communico-NJ, Communico-KY, Communico-SC, Communico-AL
- BiblioCommons-GA, BiblioCommons-NC
- LibraryMarket-ME-NH-MA, LibraryMarket-GA
- WordPress-MD, WordPress-NY, WordPress-FL, WordPress-NJ, WordPress-MS, WordPress-ME
- Howard-County, Brooklyn-Library, Cecil-County, Somerset-County, Berks-County, Rockbridge-Regional, EventActions-Libraries, CustomDrupal-Libraries, Graniculator-Morris, Louisville-Library, Tockify-Horry

(This pending list was compiled from the literal Group 2 dry-run scraper list printed in `scraper-run-2026-08-04.log` at 13:38 UTC, cross-referenced against `scraper-registry.js` for library-matching names. It has not been independently verified against `isScraperActive()` output for every entry, so treat it as a best-effort punch list rather than an exhaustive audit.)

## 2026-08-05

Day 2 of the 3-day rotation. Group 2 ran today (2026-08-05 03:00 EST start), covering the 33 library-family/standalone scrapers listed as pending at the end of the 2026-08-04 section, minus two non-library entries (`Graniculator-Morris`, `Tockify-Horry`) that another process handles. Per-library counts below are paired from `scrapers/logs/scraper-stdout.log`, bounded by each scraper's start/end timestamp; WordPress-state rows are paired against each scraper's `LIBRARIES` config array by scrape order (both arrays' lengths were confirmed to match exactly before pairing, so there is no off-by-one risk).

**Notes on individual entries:**
- **LibCal-TN / LibCal-WV / LibCal-VT** each had one library (Knox County Public Library TN, Martinsburg-Berkeley County Public Libraries WV, Kellogg-Hubbard Library VT) that errored out before printing a per-library `Found` count; each state's run summary shows exactly 1 error, consistent with one silent failure per state. Flagged inline rather than guessed at.
- **Communico-NJ / Communico-SC**: several libraries fall back through API → Puppeteer → link-based extraction when the primary method fails (visible in the raw log); the counts below are each library's final successful count after fallback, not the first attempt. Two SC systems (Greenville, Richland) and one NJ system (Montclair) came up empty after every fallback.
- **Rockbridge-Regional**: logged as a single row per the standing convention — it's one library system (Rockbridge Regional Library) scraping 6 *branch* calendars, not 6 distinct systems. The 117 events found is the deduplicated total across all 6 branches.
- **CustomDrupal-Libraries**: the scraper file's own header comment says "5 libraries across 4 states (GA, NC, SC, WV)," but the actual `LIBRARIES` config array and today's run (`📍 7 sites tracked` in the summary) cover **7** distinct systems across GA/NC/SC/WV — Richland, Greenville County, Anderson County, and Florence County (all SC), plus Rowan County (NC), Cobb County (GA), and Kanawha County (WV). All 7 are broken out below individually; the header comment is stale and worth fixing separately.
- **WordPress-FL**: the scraper's `LIBRARIES` array actually holds 65 entries, not the ~60 suggested by a quick scan — 5 major systems (Miami-Dade, Orange County, Tampa-Hillsborough, Broward, Palm Beach) are defined with only `name`/`url`/`eventsUrl` and no `city`/`state`/`county` (the `county` field for all 5 is even hardcoded to `'Baltimore City'`, an apparent copy-paste artifact from an MD file). That's why the raw log shows `(undefined, undefined)` for those 5 — a real scraper bug worth a follow-up, left as-is here since this pass is data collection, not a fix.

| Library Website | State | Scraper | Events Found | Link |
|---|---|---|---|---|
| Bridgeport Public Library | CT | LibCal-CT | 10 | [Link](https://bportlibrary.libcal.com) |
| New Haven Free Public Library | CT | LibCal-CT | 20 | [Link](https://nhfpl.libcal.com/calendar?cid=-1&t=d) |
| Stratford Library | CT | LibCal-CT | 20 | [Link](https://stratfordlibrary.libcal.com/calendar/events?cid=-1&t=d) |
| Hartford Public Library | CT | LibCal-CT | 0 | [Link](https://hplct.libcal.com/calendar?cid=-1&t=d) |
| East Hartford Public Library | CT | LibCal-CT | 20 | [Link](https://easthartfordct.libcal.com/calendar?cid=-1&t=d) |
| Greenwich Library | CT | LibCal-CT | 48 | [Link](https://greenwichlibrary.libcal.com/calendar/events) |
| Silas Bronson Library | CT | LibCal-CT | 0 | [Link](https://bronsonlibrary.libcal.com/) |
| Hamden Public Library | CT | LibCal-CT | 48 | [Link](https://hamdenlibrary.libcal.com/calendar/programs/) |
| Athens-Clarke County Library | GA | LibCal-GA | 5 | [Link](https://athenslibrary.libcal.com/) |
| Hall County Library System | GA | LibCal-GA | 10 | [Link](https://hallcountylibrary.libcal.com/) |
| Cambridge Public Library | MA | LibCal-MA | 10 | [Link](https://cambridgepl.libcal.com) |
| Newton Free Library | MA | LibCal-MA | 20 | [Link](https://newtonfreelibrary.libcal.com/calendar?cid=-1&t=d) |
| Brookline Public Library | MA | LibCal-MA | 20 | [Link](https://brooklinelibrary.libcal.com/calendar?cid=-1&t=d) |
| Buffalo & Erie County Public Library | NY | LibCal-NY1 | 20 | [Link](https://buffalolib.libcal.com/calendar/events?cid=-1&t=d) |
| Monroe County Library System | NY | LibCal-NY1 | 20 | [Link](https://calendar.libraryweb.org/calendar) |
| Onondaga County Public Libraries | NY | LibCal-NY1 | 20 | [Link](https://onlib-central.libcal.com/calendar?cid=-1&t=d) |
| Northern Onondaga Public Libraries | NY | LibCal-NY1 | 10 | [Link](https://onlib-nopl.libcal.com/) |
| Westchester Library System | NY | LibCal-NY1 | 20 | [Link](https://westchesterlibraries.libcal.com/calendar?cid=-1&t=d) |
| Suffolk Cooperative Library System | NY | LibCal-NY1 | 8 | [Link](https://suffolk.libcal.com/calendar?cid=-1&t=d) |
| Albany Public Library | NY | LibCal-NY1 | 24 | [Link](https://albany.librarycalendar.com/) |
| Great Neck Library | NY | LibCal-NY1 | 20 | [Link](https://greatnecklibrary.libcal.com/calendar?cid=-1&t=d) |
| Hicksville Public Library | NY | LibCal-NY1 | 20 | [Link](https://hicksvillelibrary.libcal.com/calendar?cid=-1&t=d) |
| Long Beach Public Library | NY | LibCal-NY1 | 41 | [Link](https://longbeachpl.librarycalendar.com/) |
| Garden City Public Library | NY | LibCal-NY1 | 10 | [Link](https://gardencitypl.libcal.com/) |
| Montgomery County-Norristown Public Library | PA | LibCal-PA | 20 | [Link](https://mnl.libcal.com/calendar?cid=-1&t=d) |
| Erie County Public Library | PA | LibCal-PA | 10 | [Link](https://events.erielibrary.org/) |
| Chester County Library System | PA | LibCal-PA | 20 | [Link](https://ccls.libcal.com/calendar/ChesterCountyLibrary?cid=-1&t=d) |
| Delaware County Library System | PA | LibCal-PA | 20 | [Link](https://delcolibraries.libcal.com/calendar?cid=-1&t=d) |
| Bucks County Free Library | PA | LibCal-PA | 25 | [Link](https://calendar.buckslib.org/) |
| Dauphin County Library System | PA | LibCal-PA | 10 | [Link](https://dcls.libcal.com/) |
| Easton Area Public Library | PA | LibCal-PA | 48 | [Link](https://eastonpl.libcal.com/calendar) |
| Clarksville-Montgomery County Public Library | TN | LibCal-TN | 48 | [Link](https://mcgtn.libcal.com/calendar?cid=14859) |
| Memphis Public Libraries | TN | LibCal-TN | 0 | [Link](https://memphislibrary.libcal.com/calendar?cid=-1&t=d) |
| Knox County Public Library | TN | LibCal-TN | error *(scraper errored before printing a Found count — run summary shows 1 error for this state; no per-library number recoverable)* | [Link](https://knoxlib.libcal.com/calendar?cid=-1&t=d) |
| Morgantown Public Library | WV | LibCal-WV | 10 | [Link](https://mympls.libcal.com/) |
| Martinsburg-Berkeley County Public Libraries | WV | LibCal-WV | error *(scraper errored before printing a Found count — run summary shows 1 error for this state; no per-library number recoverable)* | [Link](https://bcpls.libcal.com/calendar?cid=-1&t=d&d=0000-00-00) |
| Fletcher Free Library | VT | LibCal-VT | 20 | [Link](https://fletcherfree.libcal.com/calendar?cid=-1&t=d&d=0000-00-00) |
| Kellogg-Hubbard Library | VT | LibCal-VT | error *(scraper errored before printing a Found count — run summary shows 1 error for this state; no per-library number recoverable)* | [Link](https://kellogghubbard.libcal.com/calendar?cid=-1&t=d&d=0000-00-00) |
| Clayton County Library System | GA | Communico-GA | 12 | [Link](https://claytonpl.libnet.info/events) |
| Gwinnett County Public Library | GA | Communico-GA | 19 | [Link](https://gwinnettpl.libnet.info/events) |
| DeKalb County Public Library | GA | Communico-GA | 13 | [Link](https://events.dekalblibrary.org/events) |
| Chattahoochee Valley Libraries | GA | Communico-GA | 11 | [Link](https://cvl.libnet.info/events) |
| Forsyth County Public Library | GA | Communico-GA | 7 | [Link](https://events.forsythpl.org/events) |
| Henry County Library System | GA | Communico-GA | 15 | [Link](https://henrylibraries.libnet.info/events) |
| Ocean County Library | NJ | Communico-NJ | 58 | [Link](https://theoceancountylibrary.libnet.info/ocean-county-library/events) |
| Somerset County Library System | NJ | Communico-NJ | 25 | [Link](https://sclsnj.libnet.info/events) |
| Middlesex County Library | NJ | Communico-NJ | 19 | [Link](https://middlesex.libnet.info/events) |
| Camden County Library System | NJ | Communico-NJ | 11 *(API 404'd, Puppeteer scrape also came up empty; recovered via link-based fallback extraction)* | [Link](https://events.camdencountylibrary.org/) |
| Montclair Public Library | NJ | Communico-NJ | 0 *(all three extraction methods — API, Puppeteer, link-based fallback — came up empty)* | [Link](https://montclairlibrary.libnet.info/events) |
| Warren County Library | NJ | Communico-NJ | 6 | [Link](https://warrenlib.libnet.info/events) |
| Cape May County Library | NJ | Communico-NJ | 15 | [Link](https://events.cmclibrary.org/events) |
| Hoboken Public Library | NJ | Communico-NJ | 8 | [Link](https://hobokenlibrary.libnet.info/events) |
| Fulton County Library System | GA | BiblioCommons-GA | 495 | [Link](https://fulcolibrary.bibliocommons.com/v2/events) |
| Charlotte Mecklenburg Library | NC | BiblioCommons-NC | 497 | [Link](https://cmlibrary.bibliocommons.com/v2/events) |
| Howard County Library System | MD | Howard-County | 120 | [Link](https://howardcounty.librarycalendar.com/events) |
| Pikes Peak Library District | CO | LibraryMarket | 120 *(across 5 pages)* | [Link](https://ppld.librarymarket.com/events/upcoming) |
| Lee County Library System | FL | LibraryMarket | 119 *(across 5 pages)* | [Link](https://leelibrary.librarymarket.com/events/upcoming) |
| Sarasota County Libraries | FL | LibraryMarket | 120 *(across 5 pages)* | [Link](https://scgovlibrary.librarymarket.com/events/upcoming) |
| Allegany County Library System | MD | LibraryMarket | 120 *(across 5 pages)* | [Link](https://allegany.librarymarket.com/events/upcoming) |
| Carroll County Public Library | MD | LibraryMarket | 2250 *(across 5 pages)* | [Link](https://ccpl.librarymarket.com/events/month) |
| Washington County Free Library | MD | LibraryMarket | 120 *(across 5 pages)* | [Link](https://wcfl.librarymarket.com/events/upcoming) |
| Rochester Public Library | NY | LibraryMarket | 115 *(across 5 pages)* | [Link](https://rochesterpubliclibrary.librarymarket.com/events/upcoming) |
| Dallas Public Library | TX | LibraryMarket | 120 *(across 5 pages; TX is outside FunHive's 22-state active region, included here because it's part of this shared scraper's real output, not a fabrication)* | [Link](https://dallaslibrary.librarymarket.com/events/upcoming) |
| Virginia Beach Public Library | VA | LibraryMarket | 120 *(across 5 pages)* | [Link](https://vbpl.librarymarket.com/events/upcoming) |
| Brooklyn Public Library | NY | Brooklyn-Library | 20 | [Link](https://www.bklynlibrary.org/calendar/list) |
| Cecil County Public Library | MD | Cecil-County | 24 | [Link](https://www.cecilcountylibrary.org/events) |
| Somerset County Library | MD | Somerset-County | 355 *(aggregated across adult/child/teen program pages via Google Calendar API capture; single system despite the multi-page scrape)* | [Link](https://www.somelibrary.org/adultprograms.php) |
| Berks County Public Libraries | PA | Berks-County | 146 | [Link](https://www.berkslibraries.org) |
| Rockbridge Regional Library | VA | Rockbridge-Regional | 117 *(single system; 117 unique events aggregated across its 6 branch ICS calendars — Lexington 32, Buena Vista 9, Glasgow 12, Goshen 5, Bath County 21, Bookmobile 38 — not 6 distinct library systems)* | [Link](https://www.rrlib.net/lexington-ics-calendar/) |
| Jefferson-Madison Regional Library | VA | EventActions-Libraries | 500 *(from Trumba API)* | [Link](https://www.trumba.com/calendars/jefferson-madison-regional-library-events.json) |
| Richland Library | SC | CustomDrupal-Libraries | 30 | [Link](https://www.richlandlibrary.com/events) |
| Greenville County Library System | SC | CustomDrupal-Libraries | 10 | [Link](https://www.greenvillelibrary.org/events) |
| Anderson County Library System | SC | CustomDrupal-Libraries | 74 | [Link](https://www.andersonlibrary.org/events/month) |
| Florence County Library System | SC | CustomDrupal-Libraries | 49 | [Link](https://www.florencelibrary.org/events) |
| Rowan County Public Library | NC | CustomDrupal-Libraries | 24 | [Link](https://www.rowancountylibrary.org/events/upcoming) |
| Cobb County Public Library System | GA | CustomDrupal-Libraries | 10 | [Link](https://www.cobbcounty.gov/events?department=85) |
| Kanawha County Public Library | WV | CustomDrupal-Libraries | 184 | [Link](https://www.kcpls.org/events/upcoming) |
| Louisville Free Public Library | KY | Louisville-Library | 144 | [Link](https://www.lfpl.org/events) |
| Lexington Public Library | KY | Communico-KY | 12 | [Link](https://lexpublib.libnet.info/events) |
| Muhlenberg County Public Libraries | KY | Communico-KY | 2 | [Link](https://mcplib.libnet.info/events) |
| Anderson Public Library | KY | Communico-KY | 1 | [Link](https://aplkentucky.libnet.info/events) |
| Pike County Public Library | KY | Communico-KY | 2 | [Link](https://informationplace.libnet.info/events) |
| Greenville County Library System | SC | Communico-SC | 0 *(API, Puppeteer, and link-based fallback all came up empty)* | [Link](https://greenville.libnet.info/events) |
| Richland Library | SC | Communico-SC | 0 *(API, Puppeteer, and link-based fallback all came up empty)* | [Link](https://richland.libnet.info/events) |
| Pickens County Library | SC | Communico-SC | 3 | [Link](https://pickenscountylibrarysystem.libnet.info/events) |
| Hoover Public Library | AL | Communico-AL | 2 | [Link](https://hoover.libnet.info/events) |
| Trussville Public Library | AL | Communico-AL | 1 | [Link](https://jclctrussville.libnet.info/events) |
| Homewood Public Library | AL | Communico-AL | 2 | [Link](https://homewood.libnet.info/events) |
| Portland Public Library | ME | LibraryMarket-ME-NH-MA | 23 | [Link](https://portlandme.librarycalendar.com/events/upcoming) |
| Auburn Public Library | ME | LibraryMarket-ME-NH-MA | 24 | [Link](https://www.auburnpubliclibrary.org/events/upcoming) |
| Rochester Public Library | NH | LibraryMarket-ME-NH-MA | 29 | [Link](https://rochesterpubliclibrary.librarymarket.com/events/upcoming) |
| Springfield City Library | MA | LibraryMarket-ME-NH-MA | 33 | [Link](https://springfield.librarycalendar.com/events/upcoming) |
| West Hartford Library | CT | LibraryMarket-ME-NH-MA | 34 | [Link](https://westhartford.librarymarket.com/events/upcoming) |
| Augusta-Richmond County Library | GA | LibraryMarket-GA | 22 | [Link](https://arcpls.librarycalendar.com/events/upcoming) |
| Charles County Public Library | MD | WordPress-MD | 0 *(URL corrected 2026-08-06 to ccplonline.org/events/calendar/; still 0 saved after the fix, see SCRAPER-FIX-LOG.jsonl 2026-08-06)* | [Link](https://ccplonline.org/events/calendar/) |
| St. Mary's County Library | MD | WordPress-MD | 0 saved / extraction bug *(147 found on the corrected stmalib.org/events/calendar/ URL, but its dates are time-only strings like "10 a.m." the parser can't resolve — see SCRAPER-FIX-LOG.jsonl 2026-08-06)* | [Link](https://www.stmalib.org/events/calendar/) |
| Wicomico Public Libraries | MD | WordPress-MD | 8 | [Link](https://www.wicomicolibrary.org/events) |
| Cecil County Public Library | MD | WordPress-MD | 5 | [Link](https://cecilcountylibrary.org/events) |
| Dorchester County Public Library | MD | WordPress-MD | 0 *(URL corrected 2026-08-06 to /calendar-of-events; still 0 saved after the fix, see SCRAPER-FIX-LOG.jsonl 2026-08-06)* | [Link](https://www.dorchesterlibrary.org/calendar-of-events) |
| Somerset County Library | MD | WordPress-MD | 0 *(URL corrected 2026-08-06 to somelibrary.org/events.php; still 0 saved after the fix, see SCRAPER-FIX-LOG.jsonl 2026-08-06)* | [Link](https://somelibrary.org/events.php) |
| Talbot County Free Library | MD | WordPress-MD | 21 *(repointed 2026-08-06 to talbot.librarycalendar.com after the old tcfl.org URL was a platform mismatch)* | [Link](https://talbot.librarycalendar.com/events/upcoming) |
| Worcester County Library | MD | WordPress-MD | 7 | [Link](https://worcesterlibrary.libcal.com/calendar/Library_Events) |
| Ruth Enlow Library of Garrett County | MD | WordPress-MD | 1 *(new coverage added 2026-08-06 — previously 0 rows in the DB; a stale code comment had wrongly claimed Garrett was covered elsewhere, see SCRAPER-FIX-LOG.jsonl 2026-08-06)* | [Link](https://www.relib.net) |
| Kent County Public Library | MD | WordPress-MD | 0 *(new coverage added 2026-08-06; the first verification pass logged 22 events found, but 0 rows currently persist in the DB post-fix — not re-diagnosed here, flagged for follow-up)* | [Link](https://www.kentcountylibrary.org/programs-and-events/calendar/) |

*Note: Washington County Free Library and Queen Anne's County Library were removed from WordPress-MD's config on 2026-08-06 — both are verified covered elsewhere (Washington County via LibraryMarket at wcfl.librarymarket.com, 28 rows; Queen Anne's via calendar.qaclibrary.org, 33 rows) and their WordPress-MD `/events` paths were guessed URLs producing junk. See SCRAPER-FIX-LOG.jsonl 2026-08-06.*
*Note: this WordPress-MD entry supersedes the FOUND-89 group-run numbers this scraper originally logged earlier in this same cycle (2026-08-05 07:00 UTC start) — two manual verification reruns on 2026-08-06 (16:21 UTC FOUND 163, then 16:31 UTC FOUND 310 after further URL fixes) corrected several guessed URLs, so the 16:31 UTC run's data is used here as the current state per the config now in `scrapers/scraper-wordpress-libraries-md.js`. Per-library Found counts above use current DB row counts (`scraper_name = 'WordPress-MD'`, grouped by venue) rather than a stdout Found breakdown, because both reruns were invoked directly and did not write to `scrapers/logs/scraper-stdout.log`.*
| New York Public Library | NY | WordPress-NY | 0 | [Link](https://www.nypl.org/events/calendar) |
| Brooklyn Public Library | NY | WordPress-NY | 0 | [Link](https://www.bklynlibrary.org/calendar) |
| Queens Public Library | NY | WordPress-NY | 1 | [Link](https://www.queenslibrary.org/calendar) |
| Great Neck Library | NY | WordPress-NY | 65 | [Link](https://greatnecklibrary.libcal.com/calendar) |
| Hicksville Public Library | NY | WordPress-NY | 13 | [Link](https://hicksvillelibrary.libcal.com/calendar) |
| Freeport Memorial Library | NY | WordPress-NY | 8 | [Link](https://freeportlibrary.libcal.com/calendar) |
| Rockville Centre Public Library | NY | WordPress-NY | 62 | [Link](https://rvcpl.libcal.com/calendar) |
| Oceanside Library | NY | WordPress-NY | 70 | [Link](https://oceansidelibrary.libcal.com/calendar) |
| North Merrick Public Library | NY | WordPress-NY | 46 | [Link](https://nmerricklibrary.libcal.com/calendar) |
| Baldwin Public Library | NY | WordPress-NY | 0 | [Link](https://baldwinlib.libcal.com/calendar) |
| Garden City Public Library | NY | WordPress-NY | 74 | [Link](https://gardencitypl.libcal.com/calendar) |
| Buffalo & Erie County Public Library | NY | WordPress-NY | 127 | [Link](https://events.erielibrary.org/calendar) |
| Rochester Public Library | NY | WordPress-NY | 23 | [Link](https://rochesterpubliclibrary.librarymarket.com/events) |
| Syracuse Public Library | NY | WordPress-NY | 76 | [Link](https://onlib-central.libcal.com/calendar) |
| Albany Public Library | NY | WordPress-NY | 24 | [Link](https://albany.librarycalendar.com/events) |
| Westchester Library System | NY | WordPress-NY | 0 | [Link](https://www.westchesterlibraries.org/events) |
| Yonkers Public Library | NY | WordPress-NY | 35 | [Link](https://www.ypl.org/events) |
| White Plains Public Library | NY | WordPress-NY | 0 | [Link](https://whiteplainslibrary.org/events) |
| Schenectady County Public Library | NY | WordPress-NY | 0 | [Link](https://www.scpl.org/events) |
| Utica Public Library | NY | WordPress-NY | 35 | [Link](https://www.uticapubliclibrary.org/events) |
| Poughkeepsie Public Library District | NY | WordPress-NY | 1 | [Link](https://www.poklib.org/events) |
| New Rochelle Public Library | NY | WordPress-NY | 0 | [Link](https://nrpl.org/) |
| Mount Vernon Public Library | NY | WordPress-NY | 35 | [Link](https://www.mountvernonpubliclibrary.org/events) |
| Ithaca Tompkins County Public Library | NY | WordPress-NY | 41 | [Link](https://www.tcpl.org/events) |
| Adams Free Library | NY | WordPress-NY | 26 | [Link](https://www.adamslibrary.org/events) |
| Addison Public Library | NY | WordPress-NY | 14 | [Link](https://www.addisonlibrary.org/events) |
| Newstead Public Library | NY | WordPress-NY | 0 | [Link](https://www.akronlibrary.org/events) |
| Shelter Rock Public Library | NY | WordPress-NY | 1 | [Link](https://www.albertsonlibrary.org/events) |
| Swan Library | NY | WordPress-NY | 0 | [Link](https://www.albionlibrary.org/) |
| Alden Ewell Free Library | NY | WordPress-NY | 0 | [Link](https://www.aldenlibrary.org/) |
| Alfred Box Of Books Library | NY | WordPress-NY | 12 | [Link](https://www.alfredlibrary.org/events) |
| Allegany Public Library | NY | WordPress-NY | 1 | [Link](https://alleganylibrary.org/) |
| Almond Twentieth Century Club Library | NY | WordPress-NY | 10 | [Link](https://almondlibrary.org/calendar/) |
| Amagansett Free Library | NY | WordPress-NY | 0 | [Link](https://amagansettlibrary.org/calendar/) |
| Amenia Free Library | NY | WordPress-NY | 0 | [Link](https://amenialibrary.org/) |
| Audubon Branch | NY | WordPress-NY | 1 | [Link](https://www.amherstlibrary.org/events) |
| Andes Public Library | NY | WordPress-NY | 0 | [Link](https://www.andeslibrary.org/events) |
| Andover Free Library | NY | WordPress-NY | 0 | [Link](https://www.andoverlibrary.org/events) |
| Apalachin Library Association | NY | WordPress-NY | 0 | [Link](https://www.apalachinlibrary.org/events) |
| Arcade Free Library | NY | WordPress-NY | 0 | [Link](https://www.arcadelibrary.org/events) |
| Ardsley Public Library | NY | WordPress-NY | 0 | [Link](https://www.ardsleylibrary.org/events) |
| Queens Borough Public Library - Astoria | NY | WordPress-NY | 0 | [Link](https://www.astoria.gov/calendar?deptid=6) |
| D.R. Evarts Library | NY | WordPress-NY | 55 | [Link](https://www.athenslibrary.org/events) |
| Seymour Public Library District | NY | WordPress-NY | 1 | [Link](https://auburnlibrary.org/) |
| Aurora Free Library | NY | WordPress-NY | 2 | [Link](https://www.auroralibrary.org/events) |
| Avon Free Library | NY | WordPress-NY | 0 | [Link](https://www.avonlibrary.org/events) |
| Babylon School District Public Library | NY | WordPress-NY | 3 | [Link](https://babylonlibrary.org/) |
| Bainbridge Free Library | NY | WordPress-NY | 0 | [Link](https://www.bainbridgelibrary.org/events) |
| Barker Free Library | NY | WordPress-NY | 14 | [Link](https://www.barkerlibrary.org/events) |
| Barneveld Free Library Association | NY | WordPress-NY | 0 | [Link](https://www.barneveldlibrary.org/) |
| Richmond Memorial Library | NY | WordPress-NY | 0 | [Link](https://www.batavialibrary.org/events) |
| Dormann Library | NY | WordPress-NY | 21 | [Link](https://www.bathlibrary.org/events) |
| Howland Public Library | NY | WordPress-NY | 2 | [Link](https://beaconlibrary.org/calendar) |
| Beaver Falls Library | NY | WordPress-NY | 0 | [Link](https://www.beaverfallslibrary.org/events) |
| Bedford Free Library | NY | WordPress-NY | 1 | [Link](https://www.bedfordlibrary.org/events) |
| Bedford Hills Free Library | NY | WordPress-NY | 18 | [Link](https://www.bedfordhillsfreelibrary.org/events/upcoming) |
| Belfast Public Library | NY | WordPress-NY | 150 | [Link](https://www.belfastlibrary.org/events) |
| Belleville Free Library | NY | WordPress-NY | 3 | [Link](https://bellevillelibrary.org/) |
| Bellmore Memorial Library | NY | WordPress-NY | 1 | [Link](https://www.bellmorelibrary.org/events) |
| Free Library Of The Belmont Literary And Historical Society | NY | WordPress-NY | 13 | [Link](https://smcl.org/) |
| Bemus Point Public Library | NY | WordPress-NY | 0 | [Link](https://www.bemuspointlibrary.org/events) |
| Berlin Free Town Library | NY | WordPress-NY | 10 | [Link](https://www.berlinlibrary.org/events) |
| Eagle Free Library | NY | WordPress-NY | 13 | [Link](https://www.blisslibrary.org/) |
| Erwin Library Institute | NY | WordPress-NY | 0 | [Link](https://www.boonvillelib.org/) |
| Boston Free Library | NY | WordPress-NY | 5 | [Link](https://www.bostonlibrary.org/events) |
| Modeste Bedient Memorial Library | NY | WordPress-NY | 14 | [Link](https://www.branchportlibrary.org/events) |
| Brentwood Public Library | NY | WordPress-NY | 0 | [Link](https://www.brentwoodlibrary.org/events) |
| Brewster Public Library | NY | WordPress-NY | 37 | [Link](https://brewsterlibrary.libcal.com/) |
| Briarcliff Manor Public Library | NY | WordPress-NY | 24 | [Link](https://briarcliffmanorlibrary.org/calendar/) |
| Sullivan Free Library Of Bridgeport | NY | WordPress-NY | 21 | [Link](https://www.bridgeportlibrary.org/calendar) |
| Bronxville Public Library | NY | WordPress-NY | 22 | [Link](https://bronxvillelibrary.org/) |
| Brownville-Glen Park Library | NY | WordPress-NY | 0 | [Link](https://www.brownvillelibrary.org/events) |
| Cairo Public Library | NY | WordPress-NY | 1 | [Link](https://cairolibrary.org/calendar/) |
| Caledonia Library Association | NY | WordPress-NY | 1 | [Link](https://www.caledonialibrary.org/events) |
| Cambridge Public Library | NY | WordPress-NY | 12 | [Link](https://www.cambridgelibrary.org/events) |
| Camden Library Association | NY | WordPress-NY | 2 | [Link](https://www.camdenlibrary.org/) |
| Canajoharie Library And Art Gallery | NY | WordPress-NY | 0 | [Link](https://www.canajoharielibrary.org/) |
| Canastota Public Library | NY | WordPress-NY | 0 | [Link](https://www.canastotalibrary.org/) |
| Canton Free Library | NY | WordPress-NY | 0 | [Link](https://www.cantonlibrary.org/events) |
| Cape Vincent Community Library | NY | WordPress-NY | 43 | [Link](https://www.capevincentlibrary.org/events) |
| Reed Memorial Library | NY | WordPress-NY | 1 | [Link](https://carmellibrary.org/calendar/) |
| Carthage Free Library | NY | WordPress-NY | 0 | [Link](https://www.carthagelibrary.org/events) |
| Cattaraugus Free Library | NY | WordPress-NY | 1 | [Link](https://www.cattarauguslibrary.org/events) |
| Cazenovia Public Library Society | NY | WordPress-NY | 1 | [Link](https://cazenoviapubliclibrary.org/) |
| Center Moriches Free Public Library | NY | WordPress-NY | 1 | [Link](https://www.centermoricheslibrary.org/events) |
| Central Islip Public Library | NY | WordPress-NY | 0 | [Link](https://www.centralisliplibrary.org/events) |
| Central Square Library | NY | WordPress-NY | 25 | [Link](https://www.centralsquarelibrary.org/events) |
| Chappaqua Library | NY | WordPress-NY | 36 | [Link](https://www.chappaqualibrary.org/events) |
| Chatham Public Library | NY | WordPress-NY | 78 | [Link](https://chathamlibrary.librarycalendar.com/events/month/) |
| Cherry Valley Memorial Library | NY | WordPress-NY | 10 | [Link](https://cherryvalleylibrary.org/) |
| Chester Public Library | NY | WordPress-NY | 0 | [Link](https://www.chesterlibrary.org/) |
| Claverack Library | NY | WordPress-NY | 1 | [Link](https://claveracklibrary.org/calendar/) |
| Hawn Memorial Library | NY | WordPress-NY | 0 | [Link](https://www.claytonlibrary.org/events) |
| Kirkland Town Library | NY | WordPress-NY | 0 | [Link](https://www.clintonlibrary.org/events) |
| Clyde-Savannah Public Library | NY | WordPress-NY | 2 | [Link](https://www.clydelibrary.org/) |
| Clymer-French Creek Free Library | NY | WordPress-NY | 0 | [Link](https://www.clymerlibrary.org/) |
| Cohocton Public Library | NY | WordPress-NY | 28 | [Link](https://cohoctonlibrary.org/calendar/) |
| Cohoes Public Library | NY | WordPress-NY | 0 | [Link](https://www.cohoeslibrary.org/events) |
| Village Library Of Cooperstown | NY | WordPress-NY | 0 | [Link](https://www.cooperstownlibrary.org/events) |
| Copiague Memorial Public Library | NY | WordPress-NY | 1 | [Link](https://www.copiaguelibrary.org/events) |
| Corfu Free Library | NY | WordPress-NY | 0 | [Link](https://www.corfulibrary.org/) |
| Cornwall Public Library | NY | WordPress-NY | 4 | [Link](https://www.cornwalllibrary.org/events) |
| Hammond Library Of Crown Point | NY | WordPress-NY | 1 | [Link](https://www.crownpointlibrary.org/events) |
| Cuba Circulating Library Association | NY | WordPress-NY | 60 | [Link](https://www.cubalibrary.org/events) |
| Cutchogue New Suffolk Free Library | NY | WordPress-NY | 0 | [Link](https://cutchoguelibrary.org/) |
| Dansville Public Library | NY | WordPress-NY | 0 | [Link](https://dansvillelibrary.org/calendar/) |
| Deer Park Public Library | NY | WordPress-NY | 0 | [Link](https://www.deerparklibrary.org/events) |
| Delevan-Yorkshire Public Library | NY | WordPress-NY | 0 | [Link](https://www.delevanlibrary.org/events) |
| Deruyter Free Library | NY | WordPress-NY | 1 | [Link](https://deruyterlibrary.org/) |
| Dewitt Community Library Assoc., Inc | NY | WordPress-NY | 15 | [Link](https://www.dewittlibrary.org/events) |
| Dobbs Ferry Public Library | NY | WordPress-NY | 34 | [Link](https://www.dobbsferrylibrary.org/events) |
| Dolgeville-Manheim Public Library | NY | WordPress-NY | 0 | [Link](https://dolgevillelibrary.org/) |
| Dunkirk Free Library | NY | WordPress-NY | 1 | [Link](https://dunkirklibrary.org/) |
| Earlville Free Library | NY | WordPress-NY | 1 | [Link](https://www.earlvillelibrary.org/) |
| East Greenbush Community Library | NY | WordPress-NY | 4 | [Link](https://eglibrary.org/) |
| East Hampton Library | NY | WordPress-NY | 27 | [Link](https://www.easthamptonlibrary.org/events) |
| East Islip Public Library | NY | WordPress-NY | 0 | [Link](https://www.eastisliplibrary.org/events) |
| East Rochester Public Library | NY | WordPress-NY | 0 | [Link](https://www.eastrochesterlibrary.org/events) |
| East Rockaway Public Library | NY | WordPress-NY | 7 | [Link](https://www.eastrockawaylibrary.org/events) |
| Eastchester Public Library | NY | WordPress-NY | 5 | [Link](https://www.eastchesterlibrary.org/events) |
| Elbridge Free Library | NY | WordPress-NY | 0 | [Link](https://www.elbridgelibrary.org/events) |
| Ellicottville Memorial Library | NY | WordPress-NY | 4 | [Link](https://www.ellicottvillelibrary.org/events) |
| Farman Free Library Association Of Ellington | NY | WordPress-NY | 0 | [Link](https://www.ellingtonlibrary.org/events) |
| Ellisburg Free Library | NY | WordPress-NY | 25 | [Link](https://www.ellisburglibrary.org/events) |
| Queens Borough Public Library - Elmhurst | NY | WordPress-NY | 0 | [Link](https://www.elmhurstlibrary.org/events) |
| Elmont Public Library | NY | WordPress-NY | 1 | [Link](https://www.elmontlibrary.org/events) |
| Elwood Public Library | NY | WordPress-NY | 1 | [Link](https://www.elwoodlibrary.org/events) |
| Belden Noble Memorial Library Of Essex | NY | WordPress-NY | 0 | [Link](https://www.essexlibrary.org/events) |
| Fair Haven Public Library | NY | WordPress-NY | 1 | [Link](https://fairhavenlibrary.org/) |
| Fairport Public Library | NY | WordPress-NY | 8 | [Link](https://www.fairportlibrary.org/) |
| Falconer Public Library | NY | WordPress-NY | 7 | [Link](https://www.falconerlibrary.org/events) |
| Farmingdale Public Library | NY | WordPress-NY | 0 | [Link](https://www.farmingdalelibrary.org/events) |
| Fayetteville Free Library | NY | WordPress-NY | 0 | [Link](https://www.fayettevillelibrary.org/events) |
| Wide Awake Club Library | NY | WordPress-NY | 0 | [Link](https://fillmoreutlibrary.gov/upcoming-events/) |
| Blodgett Memorial Library District Of Fishkill | NY | WordPress-NY | 0 | [Link](https://www.fishkilllibrary.org/events) |
| Floral Park Public Library | NY | WordPress-NY | 2 | [Link](https://floralparklibrary.org/) |
| Frankfort Free Library | NY | WordPress-NY | 1 | [Link](https://www.frankfortlibrary.org/) |
| Franklin Free Library | NY | WordPress-NY | 3 | [Link](https://www.franklinlibrary.org/events) |
| Blount Library | NY | WordPress-NY | 17 | [Link](https://franklinvillelibrary.org/) |
| Fulton Public Library | NY | WordPress-NY | 0 | [Link](https://www.facebook.com/fultonlibrary) |
| Galway Public Library | NY | WordPress-NY | 0 | [Link](https://www.galwaylibrary.org/events) |
| Gardiner Library | NY | WordPress-NY | 0 | [Link](https://www.gardinerlibrary.org/) |
| Wadsworth Library | NY | WordPress-NY | 0 | [Link](https://www.geneseolibrary.org/) |
| Germantown Library | NY | WordPress-NY | 150 | [Link](https://www.germantownlibrary.org/events) |
| Glen Cove Public Library | NY | WordPress-NY | 0 | [Link](https://www.glencovelibrary.org/) |
| Queens Borough Public Library - Glendale | NY | WordPress-NY | 0 | [Link](https://www.glendalelibrary.org/events) |
| Gloversville Public Library | NY | WordPress-NY | 1 | [Link](https://gloversvillelibrary.org/events-calendar/) |
| Gorham Free Library | NY | WordPress-NY | 1 | [Link](https://gorhamlibrary.org/calendar/) |
| Goshen Public Library And Historical Society | NY | WordPress-NY | 0 | [Link](https://www.goshenlibrary.org/) |
| Reading Room Association Of Gouverneur | NY | WordPress-NY | 0 | [Link](https://www.gouverneurlibrary.org/events) |
| Gowanda Free Library | NY | WordPress-NY | 4 | [Link](https://gowandalibrary.org/) |
| Grafton Community Library | NY | WordPress-NY | 0 | [Link](https://www.graftonlibrary.org/events) |
| Pember Library Museum | NY | WordPress-NY | 3 | [Link](https://www.granvillelibrary.org/) |
| Moore Memorial Library | NY | WordPress-NY | 0 | [Link](https://www.greenelibrary.org/events) |
| Greenville Public Library | NY | WordPress-NY | 269 | [Link](https://www.greenvillelibrary.org/events) |
| Easton Library | NY | WordPress-NY | 0 | [Link](https://www.greenwichlibrary.org/) |
| Guilderland Public Library | NY | WordPress-NY | 1 | [Link](https://www.guilderlandlibrary.org/events) |
| Hamburg Library | NY | WordPress-NY | 0 | [Link](https://www.hamburglibrary.org/) |
| Hamilton Public Library | NY | WordPress-NY | 0 | [Link](https://hamiltonlibrary.org/) |
| Hamlin Public Library | NY | WordPress-NY | 0 | [Link](https://www.hamlinlibrary.org/) |
| Hammond Free Library | NY | WordPress-NY | 0 | [Link](https://www.hammondlibrary.org/events) |
| Fred And Harriet Taylor Memorial Library | NY | WordPress-NY | 50 | [Link](https://hammondsportlibrary.org/calendar/) |
| Hampton Bays Public Library | NY | WordPress-NY | 6 | [Link](https://www.hamptonbayslibrary.org/) |
| Louise Adelia Read Memorial Library | NY | WordPress-NY | 4 | [Link](https://hancocklibrary.org/) |
| Hannibal Free Library | NY | WordPress-NY | 0 | [Link](https://www.hanniballibrary.org/events) |
| Harrison Public Library | NY | WordPress-NY | 10 | [Link](https://www.harrisonpl.org/) |
| Hauppauge Public Library | NY | WordPress-NY | 0 | [Link](https://www.hauppaugelibrary.org/events) |
| Haverstraw Kings Daughters Public Library - Village Branch | NY | WordPress-NY | 0 | [Link](https://www.haverstrawlibrary.org/events) |
| Highland Public Library | NY | WordPress-NY | 0 | [Link](https://highlandlibrary.org/) |
| Highland Falls Library | NY | WordPress-NY | 0 | [Link](https://highlandfallslibrary.org/calendar/) |
| Roeliff Jansen Community Library Association | NY | WordPress-NY | 0 | [Link](https://www.cityofsanmateo.org/507/Library) |
| Sachem Public Library | NY | WordPress-NY | 0 | [Link](https://holbrooklibrary.org/) |
| Holland Patent Free Library | NY | WordPress-NY | 0 | [Link](https://hollandpatentlibrary.org/) |
| Community Free Library | NY | WordPress-NY | 19 | [Link](https://www.holleylibrary.org/events) |
| Queens Borough Public Library - Hollis | NY | WordPress-NY | 0 | [Link](https://www.hollislibrary.org/events) |
| Phillips Free Library | NY | WordPress-NY | 85 | [Link](https://www.homerlibrary.org/events) |
| Hudson Area Association Library | NY | WordPress-NY | 1 | [Link](https://www.hudsonlibrary.org/events) |
| Huntington Public Library | NY | WordPress-NY | 0 | [Link](https://www.huntingtonlibrary.org/events) |
| Hurley Library District | NY | WordPress-NY | 7 | [Link](https://hurleylibrary.org/) |
| Hyde Park Free Library | NY | WordPress-NY | 42 | [Link](https://www.hydeparklibrary.org/events) |
| Ilion Free Public Library | NY | WordPress-NY | 0 | [Link](https://www.ilionlibrary.org/) |
| Seneca Nation Of Indians Library Cattaraugus Territory | NY | WordPress-NY | 0 | [Link](https://www.irvinglibrary.org/events) |
| Irvington Pub Lib Guiteau Foundation | NY | WordPress-NY | 3 | [Link](https://irvingtonlibrary.org/) |
| Island Park Public Library | NY | WordPress-NY | 1 | [Link](https://islandparklibrary.org/) |
| Islip Public Library | NY | WordPress-NY | 0 | [Link](https://isliplibrary.org/) |
| Chautauqua-Cattaraugus Library System | NY | WordPress-NY | 0 | [Link](https://www.jamestownlibrary.org/events) |
| Jericho Public Library | NY | WordPress-NY | 69 | [Link](https://www.jericholibrary.org/events) |
| Your Home Public Library | NY | WordPress-NY | 0 | [Link](https://www.johnsoncitylibrary.org/events) |
| Jordan Bramley Library | NY | WordPress-NY | 0 | [Link](https://www.jordanlibrary.org/events) |
| Jordanville Public Library | NY | WordPress-NY | 0 | [Link](https://jordanvillelibrary.org/upcoming-events/) |
| Katonah Village Library | NY | WordPress-NY | 7 | [Link](https://katonahlibrary.org/) |
| Keene Valley Public Library | NY | WordPress-NY | 0 | [Link](https://www.keenevalleylibrary.org/events) |
| Kennedy Free Library | NY | WordPress-NY | 0 | [Link](https://www.kennedylibrary.org/events) |
| Kinderhook Memorial Library | NY | WordPress-NY | 150 | [Link](https://www.kinderhooklibrary.org/events) |
| Kingston Library | NY | WordPress-NY | 11 | [Link](https://www.kingstonlibrary.org/events) |
| Orleans Public Library | NY | WordPress-NY | 0 | [Link](https://www.lafargevillelibrary.org/events) |
| Lafayette Public Library | NY | WordPress-NY | 0 | [Link](https://lafayettelibrary.org/) |
| Lake Placid Public Library | NY | WordPress-NY | 12 | [Link](https://www.lakeplacidlibrary.org/events) |
| Lakewood Memorial Library | NY | WordPress-NY | 0 | [Link](https://lakewoodlibrary.org/events/event/) |
| Lancaster Public Library | NY | WordPress-NY | 0 | [Link](https://www.lancasterlibrary.org/component/tags/tag/events) |
| Lansing Community Library | NY | WordPress-NY | 11 | [Link](https://www.lansinglibrary.org/events) |
| Larchmont Public Library | NY | WordPress-NY | 9 | [Link](https://www.larchmontlibrary.org/events) |
| Peninsula Public Library | NY | WordPress-NY | 4 | [Link](https://lawrencelibrary.org/) |
| Woodward Memorial Library | NY | WordPress-NY | 8 | [Link](https://www.leroylibrary.org/) |
| Lewiston Public Library | NY | WordPress-NY | 0 | [Link](https://www.lewistonlibrary.org/) |
| Liberty Public Library | NY | WordPress-NY | 0 | [Link](https://libertylibrary.org/) |
| Lindenhurst Memorial Library | NY | WordPress-NY | 85 | [Link](https://www.lindenhurstlibrary.org/events) |
| Lisle Free Library | NY | WordPress-NY | 0 | [Link](https://www.lislelibrary.org/) |
| Little Falls Public Library | NY | WordPress-NY | 75 | [Link](https://www.littlefallslibrary.org/events) |
| Memorial Library Of Little Valley | NY | WordPress-NY | 3 | [Link](https://littlevalleylibrary.org/) |
| Livingston Free Library | NY | WordPress-NY | 0 | [Link](https://www.livingstonlibrary.org/events) |
| Livingston Manor Free Library | NY | WordPress-NY | 30 | [Link](https://www.livingstonmanorlibrary.org/events) |
| Livonia Public Library | NY | WordPress-NY | 1 | [Link](https://livonialibrary.org/) |
| Lockport Public Library | NY | WordPress-NY | 39 | [Link](https://www.lockportlibrary.org/events) |
| Locust Valley Library | NY | WordPress-NY | 0 | [Link](https://www.locustvalleylibrary.org/events) |
| Long Beach Public Library | NY | WordPress-NY | 1 | [Link](https://www.longbeachlibrary.org/events) |
| William K Sanford Town Library | NY | WordPress-NY | 1 | [Link](https://loudonvillelibrary.org/) |
| Lynbrook Public Library | NY | WordPress-NY | 48 | [Link](https://www.lynbrooklibrary.org/events) |
| Lyons Public Library | NY | WordPress-NY | 0 | [Link](https://lyonslibrary.org/) |
| Lyons Falls Library | NY | WordPress-NY | 7 | [Link](https://www.lyonsfallslibrary.org/events) |
| King Memorial Library | NY | WordPress-NY | 16 | [Link](https://www.machiaslibrary.org/events) |
| Mahopac Public Library | NY | WordPress-NY | 10 | [Link](https://www.mahopaclibrary.org/events) |
| Malverne Public Library | NY | WordPress-NY | 1 | [Link](https://malvernelibrary.org/) |
| Mamaroneck Public Library District | NY | WordPress-NY | 150 | [Link](https://www.mamaronecklibrary.org/events) |
| Manhasset Public Library | NY | WordPress-NY | 12 | [Link](https://manhassetlibrary.org/site/) |
| Manlius Library | NY | WordPress-NY | 1 | [Link](https://www.manliuslibrary.org/events) |
| Mannsville Free Library | NY | WordPress-NY | 42 | [Link](https://www.mannsvillelibrary.org/events) |
| Marcellus Free Library | NY | WordPress-NY | 0 | [Link](https://www.marcelluslibrary.org/events) |
| Marion Public Library | NY | WordPress-NY | 2 | [Link](https://www.marionlibrary.org/) |
| Marlboro Free Library | NY | WordPress-NY | 8 | [Link](https://www.marlborolibrary.org/events) |
| William H. Bush Memorial Library | NY | WordPress-NY | 0 | [Link](https://www.martinsburglibrary.org/events) |
| Plainedge Public Library | NY | WordPress-NY | 5 | [Link](https://massapequalibrary.org/) |
| Mayville Library | NY | WordPress-NY | 0 | [Link](https://www.mayvillelibrary.org/calendar) |
| Menands Public Library | NY | WordPress-NY | 0 | [Link](https://www.menandslibrary.org/events) |
| Merrick Library | NY | WordPress-NY | 1 | [Link](https://www.merricklibrary.org/events) |
| Middleburgh Library | NY | WordPress-NY | 35 | [Link](https://www.middleburghlibrary.org/) |
| Ramapo Catskill Library System | NY | WordPress-NY | 0 | [Link](https://www.middletownlibrary.org/events) |
| Middleville Free Library | NY | WordPress-NY | 0 | [Link](https://middlevillelibrary.org/) |
| Milford Free Library | NY | WordPress-NY | 0 | [Link](https://www.milfordlibrary.org/events) |
| Millbrook Free Library | NY | WordPress-NY | 0 | [Link](https://millbrooklibrary.org/) |
| Sarah Hull Hallock Free Library | NY | WordPress-NY | 0 | [Link](https://www.miltonlibrary.org/events) |
| Minoa Library | NY | WordPress-NY | 0 | [Link](https://www.minoalibrary.org/events) |
| Monroe Free Library | NY | WordPress-NY | 0 | [Link](https://www.monroelibrary.org/events) |
| Montauk Library | NY | WordPress-NY | 12 | [Link](https://www.montauklibrary.org/events) |
| Montgomery Free Library | NY | WordPress-NY | 0 | [Link](https://www.montgomerylibrary.org/events) |
| Ethelbert B. Crawford Public Library | NY | WordPress-NY | 18 | [Link](https://www.allertonpubliclibrary.org/calendar) |
| Montour Falls Memorial Library | NY | WordPress-NY | 60 | [Link](https://www.montourfallslibrary.org/events) |
| Hendrick Hudson Free Library | NY | WordPress-NY | 0 | [Link](https://www.montroselibrary.org/events) |
| Mooers Free Library | NY | WordPress-NY | 0 | [Link](https://www.mooerslibrary.org/events) |
| Morristown Public Library | NY | WordPress-NY | 2 | [Link](https://www.morristownlibrary.org/events) |
| Mount Morris Library | NY | WordPress-NY | 0 | [Link](https://www.mountmorrislibrary.org/events) |
| Nanuet Public Library | NY | WordPress-NY | 1 | [Link](https://nanuetpubliclibrary.org/) |
| Naples Library | NY | WordPress-NY | 0 | [Link](https://www.napleslibrary.org/events) |
| Nassau Free Library | NY | WordPress-NY | 1 | [Link](https://nassaulibrary.org/) |
| New Berlin Library | NY | WordPress-NY | 34 | [Link](https://www.newberlinlibrary.org/events) |
| Library Association Of Rockland County | NY | WordPress-NY | 58 | [Link](https://www.newcitylibrary.org/events) |
| New Lebanon Library | NY | WordPress-NY | 33 | [Link](https://newlebanonlibrary.org/calendar/) |
| New Woodstock Free Library | NY | WordPress-NY | 0 | [Link](https://newwoodstocklibrary.org/) |
| New York Mills Public Library | NY | WordPress-NY | 0 | [Link](https://www.newyorkmillslibrary.org/) |
| Newark Public Library | NY | WordPress-NY | 1 | [Link](https://newarklibrary.org/) |
| Newburgh Free Library | NY | WordPress-NY | 2 | [Link](https://newburghlibrary.org/) |
| Newfane Free Library | NY | WordPress-NY | 0 | [Link](https://www.newfanelibrary.org/events) |
| Newport Free Library | NY | WordPress-NY | 13 | [Link](https://www.newportlibrary.org/events) |
| Hepburn Library Of Norfolk | NY | WordPress-NY | 13 | [Link](https://www.norfolklibrary.org/events) |
| North Bellmore Public Library | NY | WordPress-NY | 1 | [Link](https://www.northbellmorelibrary.org/events) |
| North Chatham Free Library | NY | WordPress-NY | 48 | [Link](https://www.northchathamlibrary.org/events) |
| Northville Public Library | NY | WordPress-NY | 0 | [Link](https://www.northvillelibrary.org/events) |
| Guernsey Memorial Library Of Norwich | NY | WordPress-NY | 1 | [Link](https://www.norwichlibrary.org/category/events/) |
| Norwood Library | NY | WordPress-NY | 0 | [Link](https://norwoodlibrary.org/) |
| Nyack Library | NY | WordPress-NY | 1 | [Link](https://www.nyacklibrary.org/events) |
| Haxton Memorial Library | NY | WordPress-NY | 11 | [Link](https://www.oakfieldlibrary.org/events) |
| Old Forge Library | NY | WordPress-NY | 1 | [Link](https://oldforgelibrary.org/) |
| Olean Public Library | NY | WordPress-NY | 2 | [Link](https://oleanlibrary.org/events/event/) |
| Orangeburg Library | NY | WordPress-NY | 9 | [Link](https://orangeburglibrary.org/) |
| Oriskany Public Library | NY | WordPress-NY | 0 | [Link](https://oriskanylibrary.org/) |
| C. W. Clark Memorial Library | NY | WordPress-NY | 0 | [Link](https://oriskanyfallslibrary.org/) |
| Ossining Public Library | NY | WordPress-NY | 4 | [Link](https://ossininglibrary.org/) |
| Oswego School District Public Library | NY | WordPress-NY | 0 | [Link](https://oswego.mykansaslibrary.org/) |
| Edith B. Ford Memorial Library | NY | WordPress-NY | 0 | [Link](https://www.ovidlibrary.org/events) |
| Oxford Memorial Library | NY | WordPress-NY | 0 | [Link](https://oxfordlibrary.org/) |
| Oyster Bay-East Norwich Public Library | NY | WordPress-NY | 1 | [Link](https://oysterbaylibrary.org/) |
| Palisades Free Library | NY | WordPress-NY | 1 | [Link](https://palisadeslibrary.org/) |
| Parish Public Library | NY | WordPress-NY | 0 | [Link](https://www.parishlibrary.org/events) |
| Patterson Library | NY | WordPress-NY | 1 | [Link](https://pattersonlibrary.org/calendar/) |
| Pawling Free Library | NY | WordPress-NY | 0 | [Link](https://www.pawlinglibrary.org/events) |
| Pearl River Public Library | NY | WordPress-NY | 1 | [Link](https://pearlriverlibrary.org/) |
| Town Of Pelham Public Library | NY | WordPress-NY | 47 | [Link](https://www.pelhamlibrary.org/calendar/) |
| Penfield Public Library | NY | WordPress-NY | 0 | [Link](https://www.penfieldlibrary.org/events) |
| Perry Public Library | NY | WordPress-NY | 0 | [Link](https://www.perrylibrary.org/calendar) |
| Peru Free Library | NY | WordPress-NY | 28 | [Link](https://www.perulibrary.org/events) |
| Phelps Community Memorial Library | NY | WordPress-NY | 0 | [Link](https://www.phelpslibrary.org/events) |
| Phoenicia Library | NY | WordPress-NY | 1 | [Link](https://phoenicialibrary.org/calendar/) |
| Phoenix Public Library | NY | WordPress-NY | 1 | [Link](https://www.phoenixlibrary.org/events) |
| Piermont Library District | NY | WordPress-NY | 1 | [Link](https://www.piermontlibrary.org/events) |
| Pike Library | NY | WordPress-NY | 0 | [Link](https://www.pikelibrary.org/events) |
| Morton Memorial Library | NY | WordPress-NY | 1 | [Link](https://pinehilllibrary.org/calendar/) |
| Pine Plains Free Library | NY | WordPress-NY | 150 | [Link](https://www.pineplainslibrary.org/events) |
| Pleasant Valley Free Library | NY | WordPress-NY | 1 | [Link](https://www.pleasantvalleylibrary.org/events) |
| Poestenkill Library | NY | WordPress-NY | 4 | [Link](https://www.poestenkilllibrary.org/events) |
| Port Byron Library | NY | WordPress-NY | 1 | [Link](https://www.portbyronlibrary.org/events) |
| Port Chester Public Library | NY | WordPress-NY | 9 | [Link](https://portchesterlibrary.org/) |
| Port Jervis Free Library | NY | WordPress-NY | 0 | [Link](https://www.portjervislibrary.org/) |
| Port Leyden Community Library | NY | WordPress-NY | 0 | [Link](https://www.portleydenlibrary.org/events) |
| Portville Free Library | NY | WordPress-NY | 3 | [Link](https://www.portvillelibrary.org/events) |
| Potsdam Public Library | NY | WordPress-NY | 40 | [Link](https://www.potsdamlibrary.org/events) |
| Pound Ridge Library District | NY | WordPress-NY | 0 | [Link](https://www.poundridgelibrary.org/events) |
| Prospect Free Library | NY | WordPress-NY | 0 | [Link](https://www.prospectlibrary.org/calendar) |
| Putnam Valley Free Library | NY | WordPress-NY | 1 | [Link](https://putnamvalleylibrary.org/calendar/) |
| Quogue Library | NY | WordPress-NY | 0 | [Link](https://www.quoguelibrary.org/) |
| Randolph Free Library | NY | WordPress-NY | 0 | [Link](https://www.randolphlibrary.org/events) |
| Ransomville Free Library | NY | WordPress-NY | 0 | [Link](https://www.ransomvillelibrary.org/) |
| Red Hook Public Library | NY | WordPress-NY | 1 | [Link](https://redhooklibrary.org/calendar/) |
| Didymus Thomas Library | NY | WordPress-NY | 0 | [Link](https://remsenlibrary.org/) |
| Rensselaer Public Library | NY | WordPress-NY | 8 | [Link](https://www.rensselaerlibrary.org/events) |
| Rensselaerville Public Library | NY | WordPress-NY | 0 | [Link](https://www.rensselaervillelibrary.org/events) |
| Queens Borough Public Library - Ridgewood | NY | WordPress-NY | 1 | [Link](https://ridgewoodlibrary.org/) |
| Ripley Free Library | NY | WordPress-NY | 7 | [Link](https://ripleylibrary.org/) |
| Riverhead Free Library | NY | WordPress-NY | 101 | [Link](https://www.riverheadlibrary.org/events) |
| Rodman Public Library | NY | WordPress-NY | 0 | [Link](https://www.rodmanlibrary.org/events) |
| The Jervis Public Library Association, Inc. | NY | WordPress-NY | 0 | [Link](https://www.romelibrary.org/events) |
| Roosevelt Public Library | NY | WordPress-NY | 0 | [Link](https://www.rooseveltlibrary.org/events) |
| Rose Free Library | NY | WordPress-NY | 0 | [Link](https://www.roselibrary.org/events) |
| Rosendale Library | NY | WordPress-NY | 1 | [Link](https://rosendalelibrary.org/) |
| Bryant Library | NY | WordPress-NY | 0 | [Link](https://www.roslynlibrary.org/events) |
| Womens Round Lake Improvement Society Lib | NY | WordPress-NY | 3 | [Link](https://roundlake.sals.edu/) |
| Rouses Point Dodge Memorial Library | NY | WordPress-NY | 2 | [Link](https://www.rousespointlibrary.org/events) |
| Roxbury Library Association | NY | WordPress-NY | 41 | [Link](https://www.roxburylibrary.org/events) |
| Rush Public Library | NY | WordPress-NY | 1 | [Link](https://rushlibrary.org/) |
| Russell Public Library | NY | WordPress-NY | 1 | [Link](https://russelllibrary.org/) |
| Rye Free Reading Room | NY | WordPress-NY | 2 | [Link](https://www.ryelibrary.org/) |
| John Jermain Memorial Library | NY | WordPress-NY | 0 | [Link](https://www.sagharborlibrary.org/events) |
| Salamanca Public Library | NY | WordPress-NY | 7 | [Link](https://www.salamancalibrary.org/events) |
| Bancroft Public Library | NY | WordPress-NY | 0 | [Link](https://www.salemlibrary.org/events) |
| Annie Porter Ainsworth Memorial Library | NY | WordPress-NY | 150 | [Link](https://ainsworthmemoriallibrary.org/) |
| Sayville Library | NY | WordPress-NY | 136 | [Link](https://www.sayvillelibrary.org/events) |
| Scarsdale Public Library | NY | WordPress-NY | 54 | [Link](https://www.scarsdalelibrary.org/events) |
| Schoharie Free Library Assn. | NY | WordPress-NY | 0 | [Link](https://www.schoharielibrary.org/) |
| Schroon Lake Public Library | NY | WordPress-NY | 150 | [Link](https://www.schroonlakelibrary.org/events) |
| Scio Memorial Library | NY | WordPress-NY | 0 | [Link](https://www.sciolibrary.org/events) |
| Scottsville Free Library | NY | WordPress-NY | 1 | [Link](https://www.scottsvillelibrary.org/events) |
| Sea Cliff Village Library | NY | WordPress-NY | 1 | [Link](https://www.seaclifflibrary.org/events) |
| Seaford Public Library | NY | WordPress-NY | 0 | [Link](https://seafordlibrary.org/library-events/) |
| Seneca Falls Library | NY | WordPress-NY | 0 | [Link](https://senecafallslibrary.org/) |
| Shelter Island Public Library Society | NY | WordPress-NY | 0 | [Link](https://www.shelterislandlibrary.org/events) |
| Sherburne Public Library | NY | WordPress-NY | 2 | [Link](https://www.sherburnelibrary.org/events) |
| Minerva Free Library | NY | WordPress-NY | 1 | [Link](https://www.shermanlibrary.org/) |
| Mastics-Moriches-Shirley Community Lib | NY | WordPress-NY | 1 | [Link](https://www.shirleylibrary.org/) |
| John C. Hart Memorial Library | NY | WordPress-NY | 0 | [Link](https://www.shruboaklibrary.org/events) |
| Sidney Memorial Public Library | NY | WordPress-NY | 0 | [Link](https://www.sidneylibrary.org/index.php/calendar/) |
| Sinclairville Free Library | NY | WordPress-NY | 17 | [Link](https://www.sinclairvillelibrary.org/events) |
| Sloatsburg Public Library | NY | WordPress-NY | 1 | [Link](https://sloatsburglibrary.org/) |
| Smyrna Public Library | NY | WordPress-NY | 0 | [Link](https://www.smyrnalibrary.org/events) |
| Sodus Free Library | NY | WordPress-NY | 0 | [Link](https://www.soduslibrary.org/events) |
| Solvay Public Library | NY | WordPress-NY | 0 | [Link](https://www.solvaylibrary.org/events) |
| Somers Library | NY | WordPress-NY | 14 | [Link](https://www.somerslibrary.org/events) |
| Lewisboro Library | NY | WordPress-NY | 150 | [Link](https://lewisborolibrary.org/events/) |
| Rogers Memorial Library | NY | WordPress-NY | 12 | [Link](https://www.southamptonlibrary.org/events) |
| Southold Free Library | NY | WordPress-NY | 0 | [Link](https://southoldlibrary.org/) |
| Finkelstein Memorial Library | NY | WordPress-NY | 1 | [Link](https://www.springvalleylibrary.org/events) |
| Staatsburg Library | NY | WordPress-NY | 18 | [Link](https://staatsburglibrary.org/calendar/) |
| Stamford Village Library | NY | WordPress-NY | 0 | [Link](https://www.stamfordlibrary.org/events) |
| Stephentown Memorial Library | NY | WordPress-NY | 1 | [Link](https://www.stephentownlibrary.org/events) |
| Stillwater Free Library | NY | WordPress-NY | 6 | [Link](https://www.stillwaterlibrary.org/events) |
| Mary E. Seymour Memorial Free Library | NY | WordPress-NY | 0 | [Link](https://stocktonlibrary.org/) |
| Stone Ridge Public Library | NY | WordPress-NY | 0 | [Link](https://stoneridgelibrary.org/) |
| Rose Memorial Library Association | NY | WordPress-NY | 1 | [Link](https://www.rosememoriallibrary.org/events/) |
| Suffern Free Library | NY | WordPress-NY | 3 | [Link](https://www.suffernlibrary.org/events) |
| Syosset Public Library | NY | WordPress-NY | 0 | [Link](https://www.syossetlibrary.org/events) |
| Tappan Library | NY | WordPress-NY | 0 | [Link](https://tappanlibrary.org/) |
| Warner Library | NY | WordPress-NY | 0 | [Link](https://www.tarrytownlibrary.org/events) |
| Tivoli Free Library | NY | WordPress-NY | 0 | [Link](https://engagedpatrons.org/EventsCalendar.cfm?SiteID=6141) |
| Tomkins Cove Public Library | NY | WordPress-NY | 2 | [Link](https://www.tomkinscovelibrary.org/) |
| Brunswick Community Library | NY | WordPress-NY | 0 | [Link](https://www.troylibrary.org/events) |
| Ulysses Philomathic Library | NY | WordPress-NY | 2 | [Link](https://www.trumansburglibrary.org/) |
| Tuckahoe Public Library | NY | WordPress-NY | 0 | [Link](https://www.tuckahoelibrary.org/events) |
| B. Elizabeth Strong Memorial Library | NY | WordPress-NY | 2 | [Link](https://www.turinlibrary.org/events) |
| Tuxedo Park Library | NY | WordPress-NY | 0 | [Link](https://www.tuxedoparklibrary.org/calendar/) |
| Unadilla Public Library | NY | WordPress-NY | 1 | [Link](https://www.unadillalibrary.org/events) |
| Nassau Library System | NY | WordPress-NY | 0 | [Link](https://uniondalelibrary.org/) |
| Brookhaven National Laboratory | NY | WordPress-NY | 0 | [Link](https://uptonlibrarystaff.wixsite.com/uptontownlibrary) |
| Valley Cottage Free Library | NY | WordPress-NY | 0 | [Link](https://www.valleycottagelibrary.org/) |
| Valley Falls Free Library | NY | WordPress-NY | 2 | [Link](https://www.valleyfallslibrary.org/events) |
| Henry Waldinger Memorial Library | NY | WordPress-NY | 58 | [Link](https://www.valleystreamlibrary.org/events) |
| Vernon Public Library | NY | WordPress-NY | 7 | [Link](https://www.vernonlibrary.org/) |
| Voorheesville Public Library | NY | WordPress-NY | 0 | [Link](https://www.voorheesvillelibrary.org/events) |
| Hepburn Library Of Waddington | NY | WordPress-NY | 7 | [Link](https://www.waddingtonlibrary.org/events) |
| Walworth-Seely Public Library | NY | WordPress-NY | 0 | [Link](https://www.walworthlibrary.org/) |
| Wantagh Public Library | NY | WordPress-NY | 0 | [Link](https://wantaghlibrary.org/) |
| Warsaw Public Library | NY | WordPress-NY | 14 | [Link](https://www.warsawlibrary.org/) |
| Albert Wisner Public Library | NY | WordPress-NY | 8 | [Link](https://warwicklibrary.org/) |
| Waterford Public Library | NY | WordPress-NY | 0 | [Link](https://www.waterfordlibrary.org/events) |
| Waterloo Library And Historical Society | NY | WordPress-NY | 0 | [Link](https://www.waterloolibrary.org/events) |
| East Hounsfield Free Library | NY | WordPress-NY | 0 | [Link](https://www.watertownlibrary.org/) |
| Waterville Public Library | NY | WordPress-NY | 21 | [Link](https://www.watervillelibrary.org/events) |
| Watkins Glen Cen Sch Dis Free Pub Lib | NY | WordPress-NY | 150 | [Link](https://www.watkinsglenlibrary.org/events) |
| Waverly Free Library | NY | WordPress-NY | 2 | [Link](https://www.waverlylibrary.com/) |
| Wayland Free Library | NY | WordPress-NY | 0 | [Link](https://www.waylandlibrary.org/events) |
| Webster Public Library | NY | WordPress-NY | 15 | [Link](https://www.websterlibrary.org/events) |
| Weedsport Free Library | NY | WordPress-NY | 17 | [Link](https://www.weedsportlibrary.org/calendar) |
| David A Howe Public Library | NY | WordPress-NY | 0 | [Link](https://www.wellsvillelibrary.org/events) |
| West Hurley Public Library | NY | WordPress-NY | 5 | [Link](https://westhurleylibrary.org/) |
| West Islip Public Library | NY | WordPress-NY | 0 | [Link](https://westisliplibrary.org/) |
| West Nyack Free Library | NY | WordPress-NY | 0 | [Link](https://www.westnyacklibrary.org/) |
| West Winfield Library | NY | WordPress-NY | 0 | [Link](https://westwinfieldlibrary.org/calendar/) |
| Westbury Memorial Public Library | NY | WordPress-NY | 2 | [Link](https://www.westburylibrary.org/) |
| Town Of Westerlo Public Library | NY | WordPress-NY | 16 | [Link](https://www.westerlolibrary.org/events) |
| Patterson Library | NY | WordPress-NY | 1 | [Link](https://www.westfieldlibrary.org/events) |
| Westport Library Association | NY | WordPress-NY | 41 | [Link](https://www.westportlibrary.org/events) |
| Dunham Public Library | NY | WordPress-NY | 0 | [Link](https://whitesborolibrary.org/) |
| Whitesville Public Library | NY | WordPress-NY | 0 | [Link](https://www.whitesvillelibrary.org/events) |
| Williamson Free Public Library | NY | WordPress-NY | 0 | [Link](https://www.williamsonlibrary.org/) |
| Williamstown Library | NY | WordPress-NY | 150 | [Link](https://www.williamstownlibrary.org/events) |
| Amherst Public Library Clearfield Branch | NY | WordPress-NY | 0 | [Link](https://www.williamsvillelibrary.org/) |
| Williston Park Public Library | NY | WordPress-NY | 65 | [Link](https://www.willistonparklibrary.org/events) |
| Wilmington E.M. Cooper Memorial Public Library | NY | WordPress-NY | 3 | [Link](https://www.wilmingtonlibrary.org/events) |
| Wilson Free Library | NY | WordPress-NY | 0 | [Link](https://www.wilsonlibrary.org/events) |
| Windham Public Library | NY | WordPress-NY | 2 | [Link](https://windhamlibrary.org/) |
| Wolcott Civic Free Library | NY | WordPress-NY | 1 | [Link](https://www.wolcottlibrary.org/events) |
| Woodgate Free Library | NY | WordPress-NY | 0 | [Link](https://woodgatelibrary.org/calendar/) |
| Queens Borough Public Library - Woodside | NY | WordPress-NY | 13 | [Link](https://smcl.org/) |
| Worcester Free Library | NY | WordPress-NY | 1 | [Link](https://www.worcesterlibrary.org/events) |
| Wyandanch Public Library | NY | WordPress-NY | 0 | [Link](https://www.wyandanchlibrary.org/events) |
| Miami-Dade Public Library System | FL | WordPress-FL | 95 | [Link](https://www.mdpls.org/events) |
| Orange County Library System | FL | WordPress-FL | 17 | [Link](https://www.ocls.org/events) |
| Tampa-Hillsborough County Public Library | FL | WordPress-FL | 0 | [Link](https://attend.hcplc.org) |
| Broward County Library | FL | WordPress-FL | 1 | [Link](https://www.broward.org/library/events) |
| Palm Beach County Library System | FL | WordPress-FL | 28 | [Link](https://www.pbclibrary.org/events) |
| Alachua Branch Library | FL | WordPress-FL | 0 | [Link](https://www.alachualibrary.org/events) |
| Desoto County Library | FL | WordPress-FL | 0 | [Link](https://www.arcadialibrary.org/events) |
| Archer Branch Library | FL | WordPress-FL | 1 | [Link](https://www.archerlibrary.org/) |
| Auburndale Public Library | FL | WordPress-FL | 23 | [Link](https://auburndalelibrary.org/calendar/) |
| Bartow Public Library | FL | WordPress-FL | 0 | [Link](https://www.bartowlibrary.org/events) |
| Brandon Branch | FL | WordPress-FL | 50 | [Link](https://www.brandonlibrary.org/events-calendar) |
| Levy County Public Library System | FL | WordPress-FL | 0 | [Link](https://www.bronsonlibrary.org/calendar) |
| East Hernando Branch Library | FL | WordPress-FL | 29 | [Link](https://www.brooksvillelibrary.org/events) |
| Celebration Library | FL | WordPress-FL | 0 | [Link](https://www.celebrationlibrary.org/events) |
| Cooper Memorial Library | FL | WordPress-FL | 0 | [Link](https://www.clermontlibrary.org/) |
| Coleman Library | FL | WordPress-FL | 1 | [Link](https://www.colemanlibrary.org/calendar) |
| Edgewater Public Library | FL | WordPress-FL | 0 | [Link](https://www.edgewaterlibrary.org/events) |
| Elsie Quirk Library | FL | WordPress-FL | 0 | [Link](https://www.englewoodlibrary.org/events) |
| Eustis Memorial Library | FL | WordPress-FL | 1 | [Link](https://eustislibrary.org/) |
| Freeport Branch Library | FL | WordPress-FL | 0 | [Link](https://www.freeportlibrary.org/events) |
| Fruitland Park Library | FL | WordPress-FL | 0 | [Link](https://www.fruitlandparklibrary.org/events) |
| Greenville Public Library | FL | WordPress-FL | 125 | [Link](https://www.greenvillelibrary.org/events) |
| Hastings Branch Library | FL | WordPress-FL | 17 | [Link](https://hastingslibrary.org/calendar/) |
| Havana Public Library | FL | WordPress-FL | 1 | [Link](https://www.havanalibrary.org/calendar) |
| Hawthorne Branch Library | FL | WordPress-FL | 0 | [Link](https://www.hawthornelibrary.org/events) |
| Homestead Branch Library | FL | WordPress-FL | 0 | [Link](https://www.homesteadlibrary.org/events) |
| Hudson Regional Library | FL | WordPress-FL | 1 | [Link](https://www.hudsonlibrary.org/events) |
| Lake Placid Memorial Library | FL | WordPress-FL | 10 | [Link](https://www.lakeplacidlibrary.org/events) |
| Lakeland Public Library | FL | WordPress-FL | 0 | [Link](https://www.lakelandlibrary.org/events) |
| Land Olakes Branch Library | FL | WordPress-FL | 150 | [Link](https://www.landolakeslibrary.org/events) |
| Lantana Public Library | FL | WordPress-FL | 1 | [Link](https://www.lantanalibrary.org/) |
| Largo Public Library | FL | WordPress-FL | 0 | [Link](https://www.largolibrary.org/events) |
| West Branch Library | FL | WordPress-FL | 185 | [Link](https://www.longwoodlibrary.org/events) |
| Madison County Library | FL | WordPress-FL | 11 | [Link](https://www.madisonlibrary.org/events) |
| Margate Catharine Young Branch | FL | WordPress-FL | 11 | [Link](https://www.margatelibrary.org/events) |
| Milton Library | FL | WordPress-FL | 0 | [Link](https://www.miltonlibrary.org/events) |
| Jefferson County R. J. Bailar Public Library | FL | WordPress-FL | 0 | [Link](https://www.monticellolibrary.org/events) |
| Collier County Public Library | FL | WordPress-FL | 0 | [Link](https://www.napleslibrary.org/events) |
| Newberry Branch Library | FL | WordPress-FL | 0 | [Link](https://www.newberrylibrary.org/events) |
| Oldsmar Public Library | FL | WordPress-FL | 1 | [Link](https://myoldsmar.com/1379/Oldsmar-Public-Library) |
| Orange City Dickinson Memorial Library | FL | WordPress-FL | 0 | [Link](https://www.orangecitylibrary.org/events) |
| East Lake Community Library | FL | WordPress-FL | 0 | [Link](https://www.palmharborlibrary.org/events) |
| Palm Springs Public Library | FL | WordPress-FL | 1 | [Link](https://www.palmspringsca.gov/government/departments/library) |
| Parker Public Library | FL | WordPress-FL | 0 | [Link](https://www.parkerlibrary.org/events) |
| Parkland Library | FL | WordPress-FL | 1 | [Link](https://www.parklandlibrary.org/calendar/) |
| Taylor County Public Library | FL | WordPress-FL | 0 | [Link](https://www.perrylibrary.org/calendar) |
| Pierson Public Library | FL | WordPress-FL | 43 | [Link](https://www.piersonlibrary.org/events) |
| Polk City Library | FL | WordPress-FL | 1 | [Link](https://www.polkcitylibrary.org/events) |
| Gadsden County Public Library | FL | WordPress-FL | 126 | [Link](https://www.quincylibrary.org/events) |
| Reddick Public Library | FL | WordPress-FL | 0 | [Link](https://www.reddicklibrary.org/) |
| Safety Harbor Public Library | FL | WordPress-FL | 140 | [Link](https://www.safetyharborlibrary.org/events) |
| Little Red Schoolhouse Branch | FL | WordPress-FL | 0 | [Link](https://www.springhilllibrary.org/events) |
| Springfield Branch | FL | WordPress-FL | 1 | [Link](https://www.springfieldlibrary.org/library/) |
| Blake Library | FL | WordPress-FL | 15 | [Link](https://stuartlibrary.org/calendar/) |
| Sunrise Dan Pearl Branch | FL | WordPress-FL | 0 | [Link](https://www.sunriselibrary.org/events) |
| Lake County Library System | FL | WordPress-FL | 0 | [Link](https://www.tavareslibrary.org/events) |
| Umatilla Public Library | FL | WordPress-FL | 0 | [Link](https://www.umatillalibrary.org/) |
| Jacaranda Public Library | FL | WordPress-FL | 0 | [Link](https://www.venicelibrary.org/events) |
| Vernon Branch Library | FL | WordPress-FL | 0 | [Link](https://www.vernonlibrary.org/) |
| E.C. Rowell Public Library | FL | WordPress-FL | 0 | [Link](https://www.websterlibrary.org/events) |
| Mandel Public Library Of West Palm Beach | FL | WordPress-FL | 8 | [Link](https://www.westpalmbeachlibrary.org/events) |
| Weston Reading Center | FL | WordPress-FL | 5 | [Link](https://www.westonlibrary.org/events) |
| Wildwood Public Library | FL | WordPress-FL | 0 | [Link](https://www.wildwoodlibrary.org/events) |
| Winter Park Public Library | FL | WordPress-FL | 129 | [Link](https://www.winterparklibrary.org/events) |
| Zephyrhills Library | FL | WordPress-FL | 1 | [Link](https://www.zephyrhillslibrary.org/events) |
| Lee Memorial Library | NJ | WordPress-NJ | 75 | [Link](https://www.allendalelibrary.org/events) |
| Asbury Park Free Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.asburyparklibrary.org/) |
| Atlantic City Free Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.atlanticcitylibrary.org/events) |
| Audubon Free Public Library | NJ | WordPress-NJ | 14 | [Link](https://www.audubonlibrary.org/events) |
| Avalon Free Public Library | NJ | WordPress-NJ | 0 | [Link](https://avalonlibrary.org/) |
| Bayonne Free Public Library | NJ | WordPress-NJ | 1 | [Link](https://www.bayonnelibrary.org/events) |
| Beach Haven Free Public Library | NJ | WordPress-NJ | 57 | [Link](https://www.beachhavenlibrary.org/events) |
| Belleville Public Library | NJ | WordPress-NJ | 3 | [Link](https://bellevillelibrary.org/) |
| Belmar Public Library | NJ | WordPress-NJ | 150 | [Link](https://www.belmarlibrary.org/events) |
| Bergenfield Free Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.bergenfieldlibrary.org/calendar/) |
| Marie Fleche Memorial Library | NJ | WordPress-NJ | 11 | [Link](https://www.berlinlibrary.org/events) |
| Bernardsville Public Library | NJ | WordPress-NJ | 1 | [Link](https://www.bernardsvillelibrary.org/events) |
| Beverly Free Library | NJ | WordPress-NJ | 0 | [Link](https://www.beverlylibrary.org/events) |
| Bloomingdale Free Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.bloomingdalelibrary.org/) |
| Boonton Holmes Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.boontonlibrary.org/events) |
| Bradley Beach Public Library | NJ | WordPress-NJ | 0 | [Link](https://bradleybeachlibrary.org/) |
| Bridgeton Free Public Library | NJ | WordPress-NJ | 0 | [Link](https://bridgetonlibrary.org/) |
| Library Company Of Burlington | NJ | WordPress-NJ | 40 | [Link](https://www.burlingtonlibrary.org/events) |
| Butler Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.butlerlibrary.org/events) |
| Camden Free Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.camdenlibrary.org/) |
| William E. Dermody Free Public Library | NJ | WordPress-NJ | 21 | [Link](https://carlstadtlibrary.org/) |
| Carteret Free Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.carteretlibrary.org/events) |
| Cedar Grove Free Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.cedargrovelibrary.org/events) |
| Chathams Joint Free Public Library | NJ | WordPress-NJ | 188 | [Link](https://chathamlibrary.librarycalendar.com/events/month/) |
| Chester Library | NJ | WordPress-NJ | 0 | [Link](https://www.chesterlibrary.org/) |
| Clark Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.clarklibrary.org/events) |
| Cliffside Park Free Public Library | NJ | WordPress-NJ | 106 | [Link](https://www.cliffsideparklibrary.org/events) |
| Cranford Public Library | NJ | WordPress-NJ | 47 | [Link](https://www.cranfordlibrary.org/calendar/) |
| Cresskill Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.cresskilllibrary.org/) |
| Crosswicks Library Company | NJ | WordPress-NJ | 1 | [Link](https://www.crosswickslibrary.org/) |
| Delanco Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.delancolibrary.org/) |
| Demarest Public Library Association | NJ | WordPress-NJ | 0 | [Link](https://www.demarestlibrary.org/calendar/) |
| Denville Free Public Library | NJ | WordPress-NJ | 44 | [Link](https://www.denvillelibrary.org/) |
| Dover Free Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.doverlibrary.org/events) |
| Dixon Homestead Library | NJ | WordPress-NJ | 1 | [Link](https://www.dumontlibrary.org/) |
| Dunellen Free Public Library | NJ | WordPress-NJ | 5 | [Link](https://www.dunellenlibrary.org/events) |
| Edgewater Free Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.edgewaterlibrary.org/events) |
| Elmwood Park Free Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.elmwoodparklibrary.org/events) |
| Emerson Public Library | NJ | WordPress-NJ | 2 | [Link](https://www.emersonlibrary.com/) |
| Englewood Free Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.englewoodlibrary.org/events) |
| Fair Haven Public Library | NJ | WordPress-NJ | 1 | [Link](https://fairhavenlibrary.org/) |
| Maurice M. Pine Free Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.fairlawnlibrary.org/calendar) |
| Anthony Pio Costa Memorial Library | NJ | WordPress-NJ | 1 | [Link](https://fairfieldlibrary.org/) |
| Fairview Free Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.fairviewlibrary.org/events) |
| Fanwood Memorial Library | NJ | WordPress-NJ | 10 | [Link](https://fanwoodlibrary.org/) |
| Flemington Free Public Library | NJ | WordPress-NJ | 1 | [Link](https://www.flemingtonlibrary.org/events) |
| Fort Lee Free Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.fortleelibrary.org/events) |
| Franklin Lakes Free Public Library | NJ | WordPress-NJ | 34 | [Link](https://www.franklinlakeslibrary.org/events) |
| Franklin Twp Public Library-Gloucester | NJ | WordPress-NJ | 17 | [Link](https://franklinvillelibrary.org/) |
| Glen Ridge Free Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.glenridgelibrary.org/) |
| Glen Rock Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.glenrocklibrary.org/) |
| Gloucester City Library | NJ | WordPress-NJ | 150 | [Link](https://www.gloucestercitylibrary.org/events) |
| Hackettstown Free Public Library | NJ | WordPress-NJ | 150 | [Link](https://www.hackettstownlibrary.org/events) |
| Haddonfield Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.haddonfieldlibrary.org/) |
| Hamilton Township Free Public Library | NJ | WordPress-NJ | 0 | [Link](https://hamiltonlibrary.org/) |
| Harrison Public Library | NJ | WordPress-NJ | 8 | [Link](https://www.harrisonpl.org/) |
| Hasbrouck Heights Free Public Library | NJ | WordPress-NJ | 1 | [Link](https://www.hasbrouckheightslibrary.org/events) |
| Haworth Municipal Library | NJ | WordPress-NJ | 0 | [Link](https://www.haworthlibrary.org/) |
| Louis Bay 2nd Library | NJ | WordPress-NJ | 0 | [Link](https://www.hawthornelibrary.org/events) |
| Hillsdale Free Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.cityofsanmateo.org/507/Library) |
| Hillside Free Public Library | NJ | WordPress-NJ | 87 | [Link](https://www.hillsidelibrary.org/events) |
| Worth Pinkham Memorial Library | NJ | WordPress-NJ | 1 | [Link](https://www.hohokuslibrary.org/events) |
| Hoboken Public Library | NJ | WordPress-NJ | 59 | [Link](https://www.hobokenlibrary.org/events) |
| Irvington Public Library | NJ | WordPress-NJ | 0 | [Link](https://irvingtonlibrary.org/) |
| Jamesburg Public Library | NJ | WordPress-NJ | 6 | [Link](https://jamesburglibrary.org/) |
| Kearny Public Library | NJ | WordPress-NJ | 134 | [Link](https://www.kearnylibrary.org/events) |
| Kenilworth Public Library | NJ | WordPress-NJ | 10 | [Link](https://kenilworthlibrary.org/) |
| Keyport Free Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.keyportlibrary.org/events) |
| Kinnelon Public Library | NJ | WordPress-NJ | 1 | [Link](https://kinnelonlibrary.org/calendar/) |
| Lambertville Free Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.lambertvillelibrary.org/events) |
| Leonia Public Library | NJ | WordPress-NJ | 1 | [Link](https://www.leonialibrary.org/events) |
| Lincoln Park Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.lincolnparklibrary.org/calendar) |
| Linwood Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.linwoodlibrary.org/events) |
| Little Falls Public Library | NJ | WordPress-NJ | 75 | [Link](https://www.littlefallslibrary.org/events) |
| Little Silver Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.littlesilverlibrary.org/) |
| Ruth L. Rockwood Memorial Library | NJ | WordPress-NJ | 1 | [Link](https://www.livingstonlibrary.org/events) |
| Lyndhurst Free Public Library | NJ | WordPress-NJ | 12 | [Link](https://lyndhurstlibrary.org/) |
| Madison Public Library | NJ | WordPress-NJ | 11 | [Link](https://www.madisonlibrary.org/events) |
| Maplewood Memorial Library | NJ | WordPress-NJ | 1 | [Link](https://www.maplewoodlibrary.org/) |
| Margate City Public Library | NJ | WordPress-NJ | 11 | [Link](https://www.margatelibrary.org/events) |
| Maywood Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.maywoodlibrary.org/events) |
| Metuchen Public Library | NJ | WordPress-NJ | 90 | [Link](https://www.metuchenlibrary.org/calendar/) |
| Middletown Township Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.middletownlibrary.org/events) |
| Midland Park Memorial Library | NJ | WordPress-NJ | 11 | [Link](https://www.midlandparklibrary.org/) |
| Holland Township Free Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.milfordlibrary.org/events) |
| Millburn Free Public Library | NJ | WordPress-NJ | 2 | [Link](https://www.millburnlibrary.org/events) |
| Milltown Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.milltownlibrary.org/) |
| Millville Public Library | NJ | WordPress-NJ | 8 | [Link](https://www.millvillelibrary.org/events) |
| Monmouth Beach Public Library | NJ | WordPress-NJ | 0 | [Link](https://monmouthbeachlibrary.org/) |
| Monroe Twp Public Library-Middlesex | NJ | WordPress-NJ | 0 | [Link](http://monroetpl.org/) |
| Montclair Public Library | NJ | WordPress-NJ | 109 | [Link](https://www.montclairlibrary.org/events) |
| Montville Township Public Library | NJ | WordPress-NJ | 13 | [Link](https://montvillelibrary.org/) |
| Moorestown Library | NJ | WordPress-NJ | 27 | [Link](https://www.moorestownlibrary.org/events) |
| Morris Plains Library | NJ | WordPress-NJ | 4 | [Link](https://morrisplainslibrary.org/) |
| Morristown-Morris Twp Joint Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.morristownlibrary.org/events) |
| Mount Arlington Public Library | NJ | WordPress-NJ | 0 | [Link](https://mountarlingtonlibrary.org/) |
| Mount Laurel Library | NJ | WordPress-NJ | 198 | [Link](https://www.mountlaurellibrary.org/events) |
| Mountain Lakes Free Public Library | NJ | WordPress-NJ | 4 | [Link](https://www.mountainlakeslibrary.org/events) |
| Mountainside Free Public Library | NJ | WordPress-NJ | 17 | [Link](https://www.mountainsidelibrary.org/) |
| New Milford Public Library | NJ | WordPress-NJ | 5 | [Link](https://newmilfordlibrary.org/) |
| New Providence Memorial Library | NJ | WordPress-NJ | 0 | [Link](https://www.newprovidencelibrary.org/) |
| Newark Public Library | NJ | WordPress-NJ | 1 | [Link](https://newarklibrary.org/) |
| Sussex County Library | NJ | WordPress-NJ | 0 | [Link](https://www.newtonlibrary.org/events) |
| North Arlington Public Library | NJ | WordPress-NJ | 12 | [Link](https://www.northarlingtonlibrary.org/events) |
| North Brunswick Free Public Library | NJ | WordPress-NJ | 12 | [Link](https://northbrunswicklibrary.org/) |
| North Haledon Free Public Library | NJ | WordPress-NJ | 14 | [Link](https://www.northhaledonlibrary.org/events) |
| Norwood Public Library | NJ | WordPress-NJ | 1 | [Link](https://norwoodlibrary.org/) |
| Oakland Public Library | NJ | WordPress-NJ | 36 | [Link](https://www.oaklandlibrary.org/events) |
| Ocean City Free Public Library | NJ | WordPress-NJ | 4 | [Link](https://www.oceancitylibrary.org/) |
| Old Bridge Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.oldbridgelibrary.org/events) |
| Old Tappan Free Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.oldtappanlibrary.com/calendar) |
| Oxford Public Library | NJ | WordPress-NJ | 0 | [Link](https://oxfordlibrary.org/) |
| Palisades Park Free Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.palisadesparklibrary.org/events) |
| Paramus Public Library | NJ | WordPress-NJ | 1 | [Link](https://www.paramuslibrary.org/events) |
| Park Ridge Free Public Library | NJ | WordPress-NJ | 5 | [Link](https://www.parkridgelibrary.org/) |
| Parsippany-Troy Hills Public Library | NJ | WordPress-NJ | 1 | [Link](https://www.parsippanylibrary.org/events) |
| Passaic Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.passaicpubliclibrary.org/) |
| Pennington Free Public Library | NJ | WordPress-NJ | 18 | [Link](https://www.penningtonlibrary.org/events) |
| Pennsauken Free Public Library | NJ | WordPress-NJ | 1 | [Link](https://www.pennsaukenlibrary.org/events) |
| Pennsville Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.pennsvillelibrary.org/events) |
| Piscataway Public Library | NJ | WordPress-NJ | 127 | [Link](https://www.piscatawaylibrary.org/events) |
| Plainfield Free Public Library | NJ | WordPress-NJ | 7 | [Link](https://www.plainfieldlibrary.org/events) |
| Plainsboro Free Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.plainsborolibrary.org/events) |
| Pompton Lakes Borough Free Public Library | NJ | WordPress-NJ | 6 | [Link](https://www.pomptonlakeslibrary.org/) |
| Princeton Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.princetonlibrary.org/events) |
| Rahway Public Library | NJ | WordPress-NJ | 11 | [Link](https://www.rahwaylibrary.org/) |
| Ramsey Free Public Library | NJ | WordPress-NJ | 41 | [Link](https://www.ramseylibrary.org/events) |
| Randolph Township Free Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.randolphlibrary.org/events) |
| Red Bank Public Library | NJ | WordPress-NJ | 27 | [Link](https://www.redbanklibrary.org/calendar) |
| Ridgefield Free Public Library | NJ | WordPress-NJ | 29 | [Link](https://ridgefieldlibrary.org/) |
| Ridgewood Public Library | NJ | WordPress-NJ | 0 | [Link](https://ridgewoodlibrary.org/) |
| Ringwood Public Library | NJ | WordPress-NJ | 150 | [Link](https://www.ringwoodlibrary.org/events) |
| River Vale Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.rivervalelibrary.org/calendar) |
| Riverdale Public Library | NJ | WordPress-NJ | 1 | [Link](https://www.riverdalelibrary.org/events) |
| Riverside Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.riversidelibrary.org/events) |
| Roseland Free Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.roselandlibrary.org/events) |
| Roselle Free Public Library | NJ | WordPress-NJ | 54 | [Link](https://www.rosellelibrary.org/events) |
| Roselle Park Veterans Memorial Library | NJ | WordPress-NJ | 1 | [Link](https://www.roselleparklibrary.org/events) |
| Runnemede Public Library | NJ | WordPress-NJ | 4 | [Link](https://www.runnemedelibrary.org/events) |
| Rutherford Free Public Library | NJ | WordPress-NJ | 1 | [Link](https://www.rutherfordlibrary.org/events) |
| Saddle Brook Free Public Library | NJ | WordPress-NJ | 14 | [Link](https://saddlebrooklibrary.org/) |
| Salem Free Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.salemlibrary.org/events) |
| Scotch Plains Public Library | NJ | WordPress-NJ | 2 | [Link](https://www.scotchplainslibrary.org/events) |
| Secaucus Free Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.secaucuslibrary.org/events) |
| Franklin Twp Public Library-Somerset | NJ | WordPress-NJ | 1 | [Link](https://www.somersetlibrary.org/events) |
| Dowdell Library Of South Amboy | NJ | WordPress-NJ | 0 | [Link](https://www.southamboylibrary.org/events) |
| South River Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.southriverlibrary.org/events) |
| Sparta Public Library | NJ | WordPress-NJ | 39 | [Link](https://www.spartalibrary.org/events) |
| Spring Lake Public Library | NJ | WordPress-NJ | 4 | [Link](https://www.springlakelibrary.org/events) |
| Springfield Free Public Library | NJ | WordPress-NJ | 1 | [Link](https://www.springfieldlibrary.org/library/) |
| Stratford Public Library | NJ | WordPress-NJ | 1 | [Link](https://www.stratfordlibrary.org/events) |
| Summit Free Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.summitlibrary.org/) |
| Teaneck Public Library | NJ | WordPress-NJ | 1 | [Link](https://www.teanecklibrary.org/events) |
| Tenafly Free Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.tenaflylibrary.org/calendar) |
| Dwight D. Eisenhower Library | NJ | WordPress-NJ | 0 | [Link](https://www.totowalibrary.org/events) |
| Union Free Public Library | NJ | WordPress-NJ | 110 | [Link](https://www.unionlibrary.org/events) |
| Verona Free Public Library | NJ | WordPress-NJ | 71 | [Link](https://www.veronalibrary.org/events) |
| Sally Stretch Keen Memorial Library | NJ | WordPress-NJ | 0 | [Link](https://www.vincentownlibrary.org/events) |
| Vineland Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.vinelandlibrary.org/events) |
| Waldwick Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.waldwicklibrary.org/library-events) |
| Wanaque Borough Free Public Library | NJ | WordPress-NJ | 150 | [Link](https://www.wanaquelibrary.org/events) |
| West Orange Free Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.westorangelibrary.org/) |
| Westfield Memorial Library | NJ | WordPress-NJ | 1 | [Link](https://www.westfieldlibrary.org/events) |
| Westwood Free Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.westwoodlibrary.org/events) |
| Wharton Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.whartonlibrary.org/events) |
| Monroe Twp Public Library-Gloucester | NJ | WordPress-NJ | 150 | [Link](https://www.williamstownlibrary.org/events) |
| Wood-Ridge Memorial Library | NJ | WordPress-NJ | 26 | [Link](https://www.woodridgelibrary.org/events) |
| Woodbridge Public Library | NJ | WordPress-NJ | 13 | [Link](https://www.woodbridgelibrary.org/calendar.aspx) |
| Woodbury Public Library | NJ | WordPress-NJ | 26 | [Link](https://www.woodburylibrary.org/events) |
| Woodstown-Pilesgrove Library | NJ | WordPress-NJ | 0 | [Link](https://www.woodstownlibrary.org/) |
| Wyckoff Free Public Library | NJ | WordPress-NJ | 0 | [Link](https://www.wyckofflibrary.org/events) |
| Jackson-Hinds Library System | MS | WordPress-MS | 19 | [Link](https://www.jhlibrary.org/events) |
| Harrison County Library System | MS | WordPress-MS | 24 | [Link](https://www.harrison.lib.ms.us/) |
| First Regional Library | MS | WordPress-MS | 0 | [Link](https://www.firstregional.org/events) |
| Lee-Itawamba Library System | MS | WordPress-MS | 24 | [Link](https://www.leeitawambalibrary.org/events) |
| Jackson-George Regional Library System | MS | WordPress-MS | 32 | [Link](https://www.jgrls.org/events) |
| Columbus-Lowndes Public Library | MS | WordPress-MS | 0 | [Link](https://www.lowndeslibrary.com/) |
| Warren County-Vicksburg Public Library | MS | WordPress-MS | 1 | [Link](https://www.warren.lib.ms.us/) |
| Laurel-Jones County Library | MS | WordPress-MS | 150 | [Link](https://www.laurel.lib.ms.us/events) |
| Pine Forest Regional Library | MS | WordPress-MS | 1 | [Link](https://www.pineforest.lib.ms.us/) |
| Starkville-Oktibbeha County Public Library | MS | WordPress-MS | 1 | [Link](https://www.starkville.lib.ms.us/) |
| Bolivar County Library System | MS | WordPress-MS | 1 | [Link](https://www.bolivar.lib.ms.us/) |
| Pearl River County Library System | MS | WordPress-MS | 101 | [Link](https://www.pearlriver.lib.ms.us/events) |
| Lincoln-Lawrence-Franklin Regional Library | MS | WordPress-MS | 12 | [Link](https://www.llf.lib.ms.us/events) |
| Dixie Regional Library System | MS | WordPress-MS | 0 | [Link](https://dixie.lib.ms.us/) |
| Northeast Regional Library | MS | WordPress-MS | 0 | [Link](https://www.nereg.lib.ms.us/events) |
| Central Mississippi Regional Library System | MS | WordPress-MS | 0 | [Link](https://www.cmrls.lib.ms.us/events) |
| Tombigbee Regional Library System | MS | WordPress-MS | 1 | [Link](https://www.tombigbee.lib.ms.us/) |
| Benton County Library | MS | WordPress-MS | 0 | [Link](https://www.ashlandlibrary.org/events) |
| Avon Public Library | MS | WordPress-MS | 0 | [Link](https://www.avonlibrary.org/events) |
| William Estes Powell Memorial Library | MS | WordPress-MS | 0 | [Link](https://www.beaumontlibrary.org/events) |
| Belmont Public Library | MS | WordPress-MS | 6 | [Link](https://smcl.org/) |
| Brooksville Public Library | MS | WordPress-MS | 29 | [Link](https://www.brooksvillelibrary.org/events) |
| Caledonia Public Library | MS | WordPress-MS | 1 | [Link](https://www.caledonialibrary.org/events) |
| Charleston Public Library | MS | WordPress-MS | 0 | [Link](https://charlestonlibrary.org/library-events) |
| A. E. Wood Library | MS | WordPress-MS | 0 | [Link](https://www.clintonlibrary.org/events) |
| Columbia-Marion County Library | MS | WordPress-MS | 0 | [Link](https://www.columbialibrary.org/events) |
| Crawford Public Library | MS | WordPress-MS | 1 | [Link](https://crawfordlibrary.org/) |
| Crosby Public Library | MS | WordPress-MS | 0 | [Link](https://www.crosbylibrary.org/events) |
| Decatur Public Library | MS | WordPress-MS | 62 | [Link](https://www.decaturlibrary.org/events) |
| Dekalb Public Library | MS | WordPress-MS | 4 | [Link](https://www.dekalblibrary.org/events) |
| Enterprise Public Library | MS | WordPress-MS | 0 | [Link](https://www.enterpriselibrary.org/events) |
| Jefferson County Public Library | MS | WordPress-MS | 28 | [Link](https://www.fayettelibrary.org/events) |
| Florence Public Library | MS | WordPress-MS | 28 | [Link](https://www.florencelibrary.org/events) |
| Forest Public Library | MS | WordPress-MS | 6 | [Link](https://www.forestlibrary.org/) |
| Itawamba County-Pratt Memorial Library | MS | WordPress-MS | 0 | [Link](https://www.facebook.com/fultonlibrary) |
| Greenwood-Leflore Public Library | MS | WordPress-MS | 3 | [Link](https://www.greenwoodlibrary.org/events) |
| Hamilton Public Library | MS | WordPress-MS | 0 | [Link](https://hamiltonlibrary.org/) |
| Houston Carnegie Library | MS | WordPress-MS | 0 | [Link](https://www.houstonlibrary.org/events) |
| Leland Public Library | MS | WordPress-MS | 0 | [Link](https://www.lelandlibrary.org/events) |
| Lexington Public Library | MS | WordPress-MS | 0 | [Link](https://www.lexingtonlibrary.org/events) |
| Liberty Public Library | MS | WordPress-MS | 0 | [Link](https://libertylibrary.org/) |
| Long Beach Public Library | MS | WordPress-MS | 1 | [Link](https://www.longbeachlibrary.org/events) |
| Winston County Library | MS | WordPress-MS | 0 | [Link](https://www.louisvillelibrary.org/events) |
| Ada S. Fant Memorial Library | MS | WordPress-MS | 0 | [Link](https://www.maconlibrary.org/events) |
| Rebecca Baine Rigby Library | MS | WordPress-MS | 7 | [Link](https://www.madisonlibrary.org/events) |
| Magnolia Public Library | MS | WordPress-MS | 0 | [Link](https://www.magnolialibrary.org/events) |
| William And Dolores Mauldin Library | MS | WordPress-MS | 0 | [Link](https://www.mchenrylibrary.org/) |
| Franklin County Public Library | MS | WordPress-MS | 0 | [Link](https://www.meadvillelibrary.org/events) |
| Lawrence County Public Library | MS | WordPress-MS | 1 | [Link](https://www.allertonpubliclibrary.org/calendar) |
| Morton Public Library | MS | WordPress-MS | 0 | [Link](https://mortonlibrary.org/) |
| J. Elliott Mcmullan Library | MS | WordPress-MS | 0 | [Link](https://www.newtonlibrary.org/events) |
| Oakland Public Library | MS | WordPress-MS | 36 | [Link](https://www.oaklandlibrary.org/events) |
| Lafayette County-Oxford Public Library | MS | WordPress-MS | 0 | [Link](https://oxfordlibrary.org/) |
| Clarke County-Quitman Public Library | MS | WordPress-MS | 0 | [Link](https://www.quitmanlibrary.org/) |
| Richland Public Library | MS | WordPress-MS | 22 | [Link](https://www.richlandlibrary.org/Calendar) |
| Ripley Public Library | MS | WordPress-MS | 1 | [Link](https://ripleylibrary.org/) |
| Field Memorial Library | MS | WordPress-MS | 0 | [Link](https://www.shawlibrary.org/) |
| Dr. Robert T. Hollingsworth Library | MS | WordPress-MS | 17 | [Link](https://www.shelbylibrary.org/events) |
| Sherman Library | MS | WordPress-MS | 1 | [Link](https://www.shermanlibrary.org/) |
| Sturgis Public Library | MS | WordPress-MS | 150 | [Link](https://www.sturgislibrary.org/events) |
| Kemper-Newton Regional Library | MS | WordPress-MS | 110 | [Link](https://www.unionlibrary.org/events) |
| Evelyn Taylor Majure Library | MS | WordPress-MS | 0 | [Link](https://www.uticalibrary.org/events) |
| Woodville Public Library | MS | WordPress-MS | 0 | [Link](https://www.woodvillelibrary.org/events) |
| Portland Public Library | ME | WordPress-ME | 7 | [Link](https://www.portlandlibrary.com/events) |
| Bangor Public Library | ME | WordPress-ME | 1 | [Link](https://bangorpubliclibrary.org/) |
| Lewiston Public Library | ME | WordPress-ME | 0 | [Link](https://www.lplonline.org/events) |
| Auburn Public Library | ME | WordPress-ME | 23 | [Link](https://www.auburnpubliclibrary.org/events) |
| South Portland Public Library | ME | WordPress-ME | 34 | [Link](https://www.southportlandlibrary.com/events) |
| Biddeford-McArthur Library | ME | WordPress-ME | 41 | [Link](https://www.mcarthurlibrary.org/events) |
| Augusta - Lithgow Public Library | ME | WordPress-ME | 1 | [Link](https://www.lithgowlibrary.org/) |
| Scarborough Public Library | ME | WordPress-ME | 2 | [Link](https://www.scarboroughlibrary.org/events) |
| Waterville Public Library | ME | WordPress-ME | 21 | [Link](https://www.watervillelibrary.org/events) |
| Westbrook Public Library | ME | WordPress-ME | 90 | [Link](https://www.westbrooklibrary.org/events) |
| Brunswick Curtis Memorial Library | ME | WordPress-ME | 4 | [Link](https://curtislibrary.com/) |
| Gorham Baxter Memorial Library | ME | WordPress-ME | 150 | [Link](https://www.baxterlibrary.org/events) |
| Windham Public Library | ME | WordPress-ME | 0 | [Link](https://www.windham.lib.me.us/calendar) |
| Kennebunk Free Library | ME | WordPress-ME | 0 | [Link](https://kennebunklibrary.org/calendar/) |
| Belfast Free Library | ME | WordPress-ME | 150 | [Link](https://www.belfastlibrary.org/events) |
| Rockland Public Library | ME | WordPress-ME | 0 | [Link](https://www.rocklandlibrary.org/events) |
| Camden Public Library | ME | WordPress-ME | 150 | [Link](https://www.librarycamden.org/events) |
| Acton Public Library | ME | WordPress-ME | 2 | [Link](https://www.actonlibrary.org/events) |
| Mayhew Library Assn | ME | WordPress-ME | 14 | [Link](https://www.addisonlibrary.org/events) |
| Albion Public Library | ME | WordPress-ME | 0 | [Link](https://www.albionlibrary.org/) |
| Parsons Memorial Library | ME | WordPress-ME | 12 | [Link](https://www.alfredlibrary.org/events) |
| Andover Public Library | ME | WordPress-ME | 0 | [Link](https://www.andoverlibrary.org/events) |
| Ashland Community Library | ME | WordPress-ME | 0 | [Link](https://www.ashlandlibrary.org/events) |
| Patten Free Library | ME | WordPress-ME | 21 | [Link](https://www.bathlibrary.org/events) |
| Belgrade Public Library | ME | WordPress-ME | 0 | [Link](https://www.belgrademt.gov/544/Library) |
| Bethel Library Assn | ME | WordPress-ME | 0 | [Link](https://www.bethellibrary.org/events) |
| Blue Hill Library | ME | WordPress-ME | 0 | [Link](https://www.bluehilllibrary.org/events) |
| Boothbay Harbor Memorial Library | ME | WordPress-ME | 0 | [Link](https://www.boothbayharborlibrary.org/events) |
| Bowdoinham Public Library | ME | WordPress-ME | 6 | [Link](https://www.bowdoinhamlibrary.org/events) |
| John B. Curtis Free Public Library | ME | WordPress-ME | 0 | [Link](https://bradfordlibrary.org/) |
| Bremen Public Library | ME | WordPress-ME | 0 | [Link](https://www.bremenlibrary.org/events) |
| Bridgton Public Library | ME | WordPress-ME | 1 | [Link](https://www.bridgtonlibrary.org/events) |
| Brooksville Free Public Library | ME | WordPress-ME | 30 | [Link](https://www.brooksvillelibrary.org/events) |
| Brownville Public Library | ME | WordPress-ME | 0 | [Link](https://www.brownvillelibrary.org/events) |
| Canaan Public Library | ME | WordPress-ME | 18 | [Link](https://www.canaanlibrary.org/events) |
| Simpson Memorial Library | ME | WordPress-ME | 1 | [Link](https://carmellibrary.org/calendar/) |
| Charleston Public Library | ME | WordPress-ME | 0 | [Link](https://charlestonlibrary.org/library-events) |
| Cumberland - Chebeague Island Library | ME | WordPress-ME | 2 | [Link](https://www.chebeaguelibrary.org/events) |
| Brown Memorial Library - Clinton | ME | WordPress-ME | 0 | [Link](https://www.clintonlibrary.org/events) |
| Prince Memorial Library | ME | WordPress-ME | 2 | [Link](https://www.cumberlandlibrary.org/events) |
| Louise Clements Library | ME | WordPress-ME | 0 | [Link](https://www.cutlerlibrary.org/) |
| Chase Emerson Memorial Library | ME | WordPress-ME | 0 | [Link](https://www.deerislelibrary.org/) |
| Lawrence Public Library | ME | WordPress-ME | 1 | [Link](https://fairfieldlibrary.org/) |
| Farmington Public Library | ME | WordPress-ME | 9 | [Link](https://www.farmingtonpublic.org/) |
| Underwood Memorial Library | ME | WordPress-ME | 28 | [Link](https://www.fayettelibrary.org/events) |
| Fort Fairfield Public Library | ME | WordPress-ME | 0 | [Link](https://www.fortfairfieldlibrary.org/) |
| Frankfort - Pierce Reading Room Library | ME | WordPress-ME | 1 | [Link](https://www.frankfortlibrary.org/) |
| Freeport Community Library | ME | WordPress-ME | 0 | [Link](https://www.freeportlibrary.org/events) |
| Gardiner Public Library | ME | WordPress-ME | 0 | [Link](https://www.gardinerlibrary.org/) |
| Julia Adams Morse Memorial Library | ME | WordPress-ME | 0 | [Link](https://www.greenelibrary.org/events) |
| Shaw Public Library - Greenville | ME | WordPress-ME | 269 | [Link](https://www.greenvillelibrary.org/events) |
| Bolsters Mills Village Library | ME | WordPress-ME | 10 | [Link](https://www.harrisonpl.org/) |
| Hartland Public Library | ME | WordPress-ME | 0 | [Link](https://www.hartlandlibrary.org/events) |
| Hollis Center Public Library | ME | WordPress-ME | 0 | [Link](https://www.hollislibrary.org/events) |
| Hope Library | ME | WordPress-ME | 0 | [Link](https://www.hopelibrary.org/events) |
| Thomas Free Library | ME | WordPress-ME | 0 | [Link](https://www.howlandlibrary.org/events) |
| Katahdin Public Library | ME | WordPress-ME | 0 | [Link](https://www.islandfallslibrary.org/) |
| Parsonsfield Public Library | ME | WordPress-ME | 0 | [Link](https://www.kezarfallslibrary.org/upcoming-events) |
| Lebanon Town Library | ME | WordPress-ME | 0 | [Link](https://lebanonlibrary.org/) |
| Ivan O. Davis-Liberty Library | ME | WordPress-ME | 0 | [Link](https://libertylibrary.org/) |
| Limerick Public Library | ME | WordPress-ME | 0 | [Link](https://www.limericklibrary.org/events) |
| Frost Memorial Library | ME | WordPress-ME | 8 | [Link](https://www.limestonelibrary.org/) |
| Lincoln Memorial Library | ME | WordPress-ME | 0 | [Link](https://www.lincolnlibrary.org/events) |
| Lyman Community Library | ME | WordPress-ME | 1 | [Link](https://www.lymanlibrary.org/) |
| Machias - Porter Memorial Library | ME | WordPress-ME | 16 | [Link](https://www.machiaslibrary.org/events) |
| Madawaska Public Library | ME | WordPress-ME | 0 | [Link](https://www.madawaskalibrary.org/events) |
| Madison Public Library | ME | WordPress-ME | 8 | [Link](https://www.madisonlibrary.org/events) |
| Mercer - Shaw Library | ME | WordPress-ME | 0 | [Link](https://www.mercerlibrary.org/events) |
| Milbridge Public Library | ME | WordPress-ME | 0 | [Link](https://www.milbridgelibrary.org/events) |
| Monroe Community Library | ME | WordPress-ME | 0 | [Link](https://www.monroelibrary.org/events) |
| Naples Public Library | ME | WordPress-ME | 0 | [Link](https://www.napleslibrary.org/events) |
| New Gloucester Public Library | ME | WordPress-ME | 0 | [Link](https://www.newgloucesterlibrary.org/) |
| New Vineyard Public Library | ME | WordPress-ME | 0 | [Link](https://www.newvineyardlibrary.org/events) |
| Newport Public Library | ME | WordPress-ME | 13 | [Link](https://www.newportlibrary.org/events) |
| North Haven Public Library | ME | WordPress-ME | 0 | [Link](https://www.northhavenlibrary.org/events) |
| Oakland Public Library | ME | WordPress-ME | 62 | [Link](https://www.oaklandlibrary.org/events) |
| Ogunquit Memorial Library | ME | WordPress-ME | 0 | [Link](https://www.ogunquitlibrary.org/events) |
| Orrs Island Library | ME | WordPress-ME | 53 | [Link](https://www.orrsislandlibrary.org/events) |
| Owls Head Village Library | ME | WordPress-ME | 0 | [Link](https://www.owlsheadlibrary.org/events) |
| Freeland Holmes Library | ME | WordPress-ME | 0 | [Link](https://oxfordlibrary.org/) |
| Pembroke Library | ME | WordPress-ME | 0 | [Link](https://www.pembrokelibrary.org/upcoming-events) |
| Pittsfield Public Library | ME | WordPress-ME | 3 | [Link](https://www.pittsfieldlibrary.org/) |
| Mark And Emily Turner Memorial Library | ME | WordPress-ME | 27 | [Link](https://www.presqueislelibrary.org/events) |
| Princeton Public Library | ME | WordPress-ME | 1 | [Link](https://www.princetonlibrary.org/events) |
| Rangeley Public Library | ME | WordPress-ME | 88 | [Link](https://www.rangeleylibrary.org/events) |
| Isaac F Umberhine Public Library | ME | WordPress-ME | 0 | [Link](https://www.richmondlibrary.org/events) |
| Rockport Public Library | ME | WordPress-ME | 0 | [Link](https://www.rockportlibrary.org/events) |
| Sargentville Library Assn | ME | WordPress-ME | 2 | [Link](https://www.sargentvillelibrary.org/) |
| Sherman Public Library | ME | WordPress-ME | 1 | [Link](https://www.shermanlibrary.org/) |
| South Berwick Public Library | ME | WordPress-ME | 0 | [Link](https://www.southberwicklibrary.org/events) |
| South China Public Library | ME | WordPress-ME | 15 | [Link](https://www.southchinalibrary.org/events) |
| Southport Memorial Library | ME | WordPress-ME | 0 | [Link](https://www.southportlibrary.org/events) |
| Springvale Public Library | ME | WordPress-ME | 0 | [Link](https://www.springvalelibrary.org/events) |
| Standish - Richville Library | ME | WordPress-ME | 1 | [Link](https://standishlibrary.org/) |
| Steep Falls Library | ME | WordPress-ME | 0 | [Link](https://www.steepfallslibrary.org/events) |
| Henry D. Moore Library | ME | WordPress-ME | 0 | [Link](https://www.steubenlibrary.org/events) |
| Stockton Springs Community Library | ME | WordPress-ME | 0 | [Link](https://www.stocktonspringslibrary.org/events) |
| Stonington Public Library | ME | WordPress-ME | 0 | [Link](https://www.stoningtonlibrary.org/) |
| Frenchmans Bay Library | ME | WordPress-ME | 0 | [Link](https://www.sullivanil.us/departments/library/index.php) |
| Swans Island Public Library | ME | WordPress-ME | 0 | [Link](https://swansislandeducationalsociety.org/events/) |
| Thomaston Public Library | ME | WordPress-ME | 0 | [Link](https://thomastonlibrary.org/) |
| Topsham Public Library | ME | WordPress-ME | 0 | [Link](https://www.topshamlibrary.org/events) |
| Vose Library | ME | WordPress-ME | 110 | [Link](https://www.unionlibrary.org/events) |
| Dorothy W Quimby Library | ME | WordPress-ME | 0 | [Link](https://www.unitylibrary.org/) |
| Abel J.Morneault Memorial Library | ME | WordPress-ME | 0 | [Link](https://www.vbdl.org/events/) |
| Waldoboro Public Library | ME | WordPress-ME | 0 | [Link](https://www.waldoborolibrary.org/events) |
| Warren Free Public Library | ME | WordPress-ME | 1 | [Link](https://www.warrenlibrary.org/events) |
| Washburn Memorial Library | ME | WordPress-ME | 9 | [Link](https://www.washburnlibrary.org/events) |
| Waterford Library Association | ME | WordPress-ME | 0 | [Link](https://www.waterfordlibrary.org/events) |
| Wells Public Library | ME | WordPress-ME | 0 | [Link](https://wellslibrary.org/) |
| West Paris Public Library | ME | WordPress-ME | 0 | [Link](https://www.westparislibrary.org/) |
| Wilton Free Public Library | ME | WordPress-ME | 1 | [Link](https://www.wiltonlibrary.org/events) |
| Winterport Memorial Library | ME | WordPress-ME | 1 | [Link](https://www.winterportlibrary.org/events) |
| Bailey Public Library | ME | WordPress-ME | 1 | [Link](https://www.winthroplibrary.org/) |
| Merrill Memorial Library | ME | WordPress-ME | 41 | [Link](https://www.yarmouthlibrary.org/events) |
| York Public Library | ME | WordPress-ME | 0 | [Link](https://yorklibrary.org/) |

### Cycle-completion check

All three rotation groups have now run at least once as of today: Group 1 (2026-08-04, full per-library breakdown), Group 3 (2026-08-04, aggregate-only due to the `scraper-stdout.log` gap noted in the 2026-08-04 section), and Group 2 (2026-08-05, full per-library breakdown, this section). That closes out the first pass of the 3-day cycle, though Group 3's rows remain aggregate-only until it runs again with intact stdout logging — treat those as the one gap still worth re-verifying on the next Group 3 day rather than a completed inventory.


## Post-fix addendum: dead domains and cross-state URL collisions

Recorded 2026-08-06. An addendum to the dated inventory sections above, not a new cycle. Every row below was verified against the live site before any config change; nothing here was guessed.

### Dead Communico domains

All three of these hosts 302-redirect to `http://www.google.co.uk/` on both root and `/events`, so none could ever have returned an event. This is why the run log showed API, Puppeteer and link-fallback all failing in sequence.

| Library | Dead host | Outcome |
|---|---|---|
| Montclair Public Library, NJ | montclairlibrary.libnet.info | Migrated to LibCal-NJ at `bccls.libcal.com/calendar/montclair` — the library's own site links there |
| Greenville County Library System, SC | greenville.libnet.info | Entry removed. Site-side gap, see below |
| Richland Library, SC | richland.libnet.info | Entry removed. Already covered by CustomDrupal-Libraries |

Montclair uses a Montclair-specific calendar id rather than relying on the existing BCCLS `cid=-1` system-wide entry: that scrape files its rows under the BCCLS system venue, and only 2 rows in the entire database mentioned Montclair at all, so its own programming could not be confirmed captured or attributed.

### Cross-state URL collisions

These were **not** silent zeroes. Each was actively ingesting another state's events under the wrong label. The clearest single piece of evidence: an event titled "War in the South Carolina Backcountry" was stored as `Greenville, NY`.

| Entry | Was pointing at | Repointed to | Verified |
|---|---|---|---|
| WordPress-NY / Greenville Public Library | Greenville County **SC** | greenville.lib.ny.us | 11177 Rte 32, Greenville NY 12083 — ZIP matches the config |
| WordPress-NY / Phillips Free Library | Homer Glen **IL** | phillipsfreelibrary.org | 37 South Main St, Homer NY 13077 — ZIP matches the config |
| WordPress-ME / Shaw Public Library | Greenville County **SC** | shawpubliclibrary.org | 9 Lily Bay Road, Greenville ME 04441 — ZIP matches the config |
| WordPress-GA / Banks County Public Library | Homer Glen **IL** | Moved to LibCal-GA, prlib.libcal.com | Homer GA 30547, Piedmont Regional's own events link |

`greenvillelibrary.org` is claimed by **10 active states** at once; `homerlibrary.org` by 2. Four are now corrected.

**Orphan cleanup: 269 rows deleted** — 189 South Carolina events labelled NY/ME, and 80 Illinois events labelled NY/GA. These needed explicit deletion rather than being left to a re-scrape: their stable IDs derive from the OLD URLs, so a corrected scrape mints different IDs and would never have overwritten them. They would have persisted indefinitely as wrong-state results. Verified 0 remaining.

Cross-state collision groups measured by `scripts/find-duplicate-library-urls.js`: **653 before, 558 after**.

### CustomDrupal-Libraries — a correction and a fix

An earlier note in this cycle claimed this scraper returns nothing at all. **That was wrong**, and the error is worth recording because it will recur: the conclusion came from querying `scraper_name = 'CustomDrupal-Libraries'`, but this scraper stores each library's DISPLAY NAME in that column (the drift documented in CLAUDE.md), so the query matched zero rows regardless of health. Measured per library it is largely working:

| Library | Upcoming rows |
|---|---|
| Anderson County Library System | 61 |
| Rowan County Public Library | 12 |
| Kanawha County Public Library | 7 |
| Florence County Library System | 1 |
| Richland Library | 7 rows, today or past |
| Cobb County Public Library System | 0 — fixed, see below |
| Greenville County Library System | 0 — site-side, see below |

**Cobb County: fixed.** Its selector block reused one selector, `span.text-primary-1`, for `date`, `location` AND `description`. Every event therefore took the date string as its venue and was geocoded as an address of the form "Wednesday, August 5, 2026, Marietta, Cobb County, GA". The 2026-08-05 run logged 7 successful extractions and the database ended up with 0 rows. Cobb was verified to be the ONLY config in the file with this collision; the other seven already use distinct selectors, and Cobb now matches their shape.

**Greenville County SC: open coverage gap, and not a scraper bug.** `greenvillelibrary.org/events` serves ARCHIVED October–November 2020 events to anonymous fetches, beneath a header that renders a current "AUG 6" 2026 date. The scraper found 10 events and correctly skipped every one as past. Adding `date_start=2026-08-06` did not change the result. This library needs a different calendar source entirely; no URL change was made, because swapping one non-working address for another would hide the gap rather than close it.

### Still open after this pass

- **8 active states still claiming `greenvillelibrary.org`** — AL, FL, GA, NC, NH, PA, RI and SC. Each needs the same individual live verification the four fixed rows got. Not guessed at.
- **Fabricated county names** — 2,065 of 2,137 county values (96.6%) across the 20 active WordPress library files fail `getCountyCentroid()`, because the seed generator appended " County" to the city name ("Arcadia County", "Brandon County"). The county-centroid tier of the geocoding chain is effectively dead for that whole family. Needs a real city-to-county dataset.
- **Talbot County MD** — URL corrected to `talbot.librarycalendar.com`, but the platform changed as well as the address and this WordPress scraper is not known to parse librarycalendar.com markup. A nonzero count is not confidently expected; if it stays 0 the remaining fix is a platform move.
