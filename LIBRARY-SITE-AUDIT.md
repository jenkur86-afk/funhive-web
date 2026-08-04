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
