# Library Site Audit

Standing inventory of every individual library website FunHive scrapes, with the event count found on its most recent scrape. Scrapers run on a 3-day Group 1/2/3 rotation, so a full inventory takes 3 consecutive days to assemble.

**Link column:** each row's Link points to that library's actual calendar/events page as configured in its scraper's source file (the same URL the scraper visits) — every row below resolved to a config URL, so no row needed the database-event-URL fallback this pass, but that fallback (noted inline) remains the intended path if a future update can't find a config match; the ~33 aggregate "no per-library breakdown available" rows link to one representative library from that scraper's config rather than the specific row name, since those rows don't name a single site.


## Cycle complete — 2026-08-09

This closes out the cycle that opened 2026-08-05. Across `## 2026-08-05`, `## 2026-08-07`, `## 2026-08-08`, and `## 2026-08-09`:

- **104 of 104 active library-family scrapers** (per `isScraperActive()` over `scrapers/scraper-registry.js`) have at least one logged row this cycle.
- **~2,462 individual library-website rows** recorded across the four dated sections (1,594 from 08-05/08-07/08-08 plus 868 added 2026-08-09).
- Scrapers recorded as a **single aggregate row rather than a true per-site breakdown** (either because the scraper is a genuine single system, or because it's multi-site but doesn't log per-library output to stdout) include, from today's pass alone: Dorchester-County, Wicomico-Public, Allentown-Public, Orange-County-Library-FL, Nashville-Library-TN, Assabet-NH-MA (flagged as actually 18 sites), and LibCal-VA2 (flagged as actually 9 sites). Prior sections in this cycle carry their own such rows too (e.g. GoogleCalendar-MD, WithApps-Libraries's prior-day counterparts) — see each dated section's own notes.
- ~13% of link-column entries across the WordPress-state families added 2026-08-09 (102 of 793 rows) resolved to `[Link]()` — see that section's notes for why.

The next scraper run that reaches a library-family scraper starts a fresh cycle beneath this marker.

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

## 2026-08-07

Day 1 of a new 3-day rotation (the prior cycle closed out 2026-08-05 per the completion check above). Group 1 ran today (2026-08-07 03:00 EST start, still in progress at time of writing — RecDesk-Parks and later took the run past 8 hours). Per-library counts below are paired from `scrapers/logs/scraper-stdout.log`, bounded by each scraper's own start/completion markers, which turned out to be embedded directly in that file alongside the runner's `[INFO]` lines (no separate correlation to `scraper-run-2026-08-07.log` was needed). Scope: only the 45 Group-1 scrapers that had completed as of this check, plus 3 ad-hoc manual single-scraper reruns (Communico-MD, WordPress-MD, GoogleCalendar-MD) that also ran today outside the scheduled rotation. `KidsOutAndAbout-Eastern` and the ~4 scrapers after it in Group 1 had not finished and are excluded.

**Notes on individual entries:**
- **CivicEngage-Libraries (0/0/0/0)**: not re-verified — already confirmed genuine absence of events on the live site on 2026-07-16 (see `SCRAPER-FIX-LOG.jsonl`), and nothing suggests the site changed since.
- **Pratt-Library, BiblioCommons-NJ, BiblioCommons-VA, FullCalendar-Libraries, Fairfax-Parks, AACPL**: 100%-new / 0-dupe pattern is the known egress-saving upsert-by-stable-ID design (no read-before-write), not a real duplicate-tracking gap — closed out 2026-07-16, see `SCRAPER-FIX-LOG.jsonl`.
- **Communico-MD, WordPress-MD, GoogleCalendar-MD (3 ad-hoc reruns)**: these were manual single-scraper invocations, not part of the scheduled Group 1 run, and their child-process stdout was not captured into the shared `scraper-stdout.log` (only the scheduled group runner pipes full child output there). Per-library breakdown could not be recovered for Communico-MD or WordPress-MD this run — both are multi-library scrapers with real per-library history in earlier cycle entries of this file. GoogleCalendar-MD is single-library (Somerset County Library, MD — built today, see `SCRAPER-FIX-LOG.jsonl` `new-coverage` entry) so its aggregate total (169 found, 126 new then 116 new on a same-day rerun) fully represents its one site.
- **WordPress-{state} `found` values that repeat at exactly 150 across many unrelated libraries** (WordPress-GA, TN, AL, VT especially): this is very likely a per-request page-size cap in the TEC REST helper (`tec-rest-helper.js`), not a coincidence — the same signature as the previously-flagged `FreeLibrary-Philadelphia` 1000-row cap. Not changed this pass; flagged for follow-up the same way the Philadelphia cap was flagged in the handoff notes above (open question, not confirmed truncation).
- **Wake County Public Libraries (Communico-NC) — 0 events after all three fallback tiers** (API, Puppeteer, link-based extraction all returned 0): this is a new zero-event result not seen in a prior cycle for this site. Included in the verification deep-dive below.

| Library Website | State | Scraper | Events Found | Link |
|---|---|---|---|---|
| Delaware Libraries | DE | LibCal-DE | 19 | [Link](https://delawarelibraries.libcal.com/) |
| DC Public Library | DC | Communico-DC | 21 | [Link](https://dclibrary.libnet.info/events) |
| Worcester Public Library | MA | Communico-MA | 8 | [Link](https://mywpl.libnet.info/events) |
| Enoch Pratt Free Library | MD | Pratt-Library | 907 | [Link](https://prattlibrary.org/events) |
| Free Library of Philadelphia | PA | FreeLibrary-Philadelphia | 1000 | [Link](https://libwww.freelibrary.org/calendar/) |
| Anne Arundel County Public Library | MD | AACPL | 20 | [Link](https://aacpl.libnet.info/events) |
| Prince George's County Memorial Library System | MD | Prince-Georges-County | 16 | [Link](https://pgcmls.libcal.com/) |
| Westmoreland County Library System | PA | Westmoreland-Library | 24 | [Link](https://www.westmorelandlibrary.org/events) |
| Blue Ridge Regional Library | VA | FullCalendar-Libraries | 264 | [Link](https://events.brrl.us/iframe-events) |
| Burlington County Library System | NJ | BiblioCommons-NJ | 480 | [Link](https://bclsnj.bibliocommons.com/v2/events) |
| Central Rappahannock Regional Library | VA | BiblioCommons-VA | 499 | [Link](https://librarypoint.bibliocommons.com/v2/events) |
| Spartanburg County Public Libraries | SC | Trumba-Spartanburg | 483 | [Link](http://www.trumba.com/calendars/scpl_events.rss) |
| Lexington County Public Library | SC | EventON-Lexington | 1000 | [Link](https://lexcolibrary.com/wp-json/wp/v2/ajde_events) |
| ABBE Regional Library System | SC | WordPress-Abbe-Regional | 20 | [Link](https://www.abbe-lib.org/events/) |
| Somerset County Library | MD | GoogleCalendar-MD | 169 | [Link](https://www.somelibrary.org/adultprograms.php) |
| Communico-MD (multi-library, MD) | MD | Communico-MD | 86 *(ad-hoc rerun 10:24 UTC; per-library breakdown unavailable, stdout not captured for manual invocations)* | [Link]() |
| WordPress-MD (multi-library, MD) | MD | WordPress-MD | 157 *(ad-hoc rerun 10:28 UTC; per-library breakdown unavailable, stdout not captured for manual invocations)* | [Link]() |
| CivicEngage-Libraries (VA) | VA | CivicEngage-Libraries | 0 *(confirmed genuine absence 2026-07-16, not re-verified)* | [Link]() |
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
| Levittown Public Library | NY | LibCal-NY2 | 162 | [Link](https://levittown.librarycalendar.com/) |
| Plainview-Old Bethpage Public Library | NY | LibCal-NY2 | 154 | [Link](https://poblib.librarycalendar.com/) |
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
| Loudoun County Public Library | VA | Communico-VA | 19 | [Link](https://loudoun.libnet.info/events) |
| Prince William Public Library | VA | Communico-VA | 8 | [Link](https://pwcgov.libnet.info/events) |
| Howard County Library System | MD | LibraryCalendar-Libraries | 19 | [Link](https://howardcounty.librarycalendar.com/events/upcoming) |
| Frederick County Public Libraries | MD | LibraryCalendar-Libraries | 22 | [Link](https://frederick.librarycalendar.com/events/upcoming) |
| Talbot County Free Library | MD | LibraryCalendar-Libraries | 22 | [Link](https://talbot.librarycalendar.com/events/upcoming) |
| Caroline County Public Library | MD | LibraryCalendar-Libraries | 19 | [Link](https://carolinecounty.librarycalendar.com/events/upcoming) |
| Amherst County Public Library | VA | LibraryCalendar-Libraries | 19 | [Link](https://amherstpl.librarycalendar.com/events/upcoming) |
| Appomattox Regional Library | VA | LibraryCalendar-Libraries | 13 | [Link](https://appomattox.librarycalendar.com/events/upcoming) |
| Bedford Public Library System | VA | LibraryCalendar-Libraries | 18 | [Link](https://bedford.librarycalendar.com/events/upcoming) |
| Essex Public Library | VA | LibraryCalendar-Libraries | 14 | [Link](https://essex.librarycalendar.com/events/upcoming) |
| Lynchburg Public Library | VA | LibraryCalendar-Libraries | 14 | [Link](https://lynchburg.librarycalendar.com/events/upcoming) |
| Petersburg Public Library | VA | LibraryCalendar-Libraries | 8 | [Link](https://petersburg.librarycalendar.com/events/upcoming) |
| Poquoson Public Library | VA | LibraryCalendar-Libraries | 17 | [Link](https://poquoson.librarycalendar.com/events/upcoming) |
| Powhatan County Public Library | VA | LibraryCalendar-Libraries | 13 | [Link](https://powhatancounty.librarycalendar.com/events/upcoming) |
| Waynesboro Public Library | VA | LibraryCalendar-Libraries | 14 | [Link](https://waynesboro.librarycalendar.com/events/upcoming) |
| York County Public Library | VA | LibraryCalendar-Libraries | 21 | [Link](https://yorkcountyva.librarycalendar.com/events/upcoming) |
| Portsmouth Public Library | VA | LibraryCalendar-Libraries | 20 | [Link](https://portsmouthpl.librarycalendar.com/events/upcoming) |
| Forsyth County Public Library | NC | LibraryCalendar-Libraries | 23 | [Link](https://forsythcounty.librarycalendar.com/events/upcoming) |
| Cumberland County Public Library | NC | LibraryCalendar-Libraries | 22 | [Link](https://cumberland.librarycalendar.com/events/upcoming) |
| Atlantic County Library System | NJ | LibraryCalendar-Libraries | 24 | [Link](https://atlanticcounty.librarycalendar.com/events/upcoming) |
| Gloucester County Library System | NJ | LibraryCalendar-Libraries | 21 | [Link](https://gcls.librarycalendar.com/events/upcoming) |
| York County Library | SC | LibraryCalendar-Libraries | 23 | [Link](https://yorkcounty.librarycalendar.com/events/upcoming) |
| Bloomingdale Public Library | IL | LibraryCalendar-Libraries | 21 | [Link](https://bloomingdale.librarycalendar.com/events/upcoming) |
| Library System of Lancaster County | PA | Drupal-Pennsylvania | 189 | [Link](https://calendar.lancasterlibraries.org/events/feed/html) |
| York County Libraries | PA | Drupal-Pennsylvania | 69 | [Link](https://events.yorklibraries.org/events/feed/html) |
| Alexandria Library | VA | WordPress-VA | 0 | [Link]() |
| Chesapeake Public Library | VA | WordPress-VA | 0 | [Link]() |
| Henrico County Public Library | VA | WordPress-VA | 0 | [Link]() |
| Jefferson-Madison Regional Library | VA | WordPress-VA | 0 | [Link]() |
| Manassas Park City Library | VA | WordPress-VA | 10 | [Link]() |
| Culpeper County Library | VA | WordPress-VA | 21 | [Link]() |
| Wilcox County Public Library | GA | WordPress-GA | 7 | [Link]() |
| Wheeler County Library | GA | WordPress-GA | 0 | [Link]() |
| Alma-Bacon County Public Library | GA | WordPress-GA | 8 | [Link]() |
| Athens Regional Library System | GA | WordPress-GA | 34 | [Link]() |
| Auburn Library | GA | WordPress-GA | 0 | [Link]() |
| Appleby Branch | GA | WordPress-GA | 1 | [Link]() |
| Decatur County - Gilbert H. Gragg Library | GA | WordPress-GA | 0 | [Link]() |
| Berlin Community Library | GA | WordPress-GA | 11 | [Link]() |
| Boston Carnegie Library | GA | WordPress-GA | 0 | [Link]() |
| Bowman Branch | GA | WordPress-GA | 30 | [Link]() |
| Warren P. Sewell Memorial Library-Bremen | GA | WordPress-GA | 0 | [Link]() |
| Brunswick Glynn County Regional Library | GA | WordPress-GA | 1 | [Link]() |
| Marion County Library | GA | WordPress-GA | 108 | [Link]() |
| Butler Public Library | GA | WordPress-GA | 0 | [Link]() |
| Byron Public Library | GA | WordPress-GA | 85 | [Link]() |
| Roddenbery Memorial Library System | GA | WordPress-GA | 0 | [Link]() |
| Hickory Flat Public Library | GA | WordPress-GA | 0 | [Link]() |
| Cedartown Library | GA | WordPress-GA | 7 | [Link]() |
| Centerville Branch Library | GA | WordPress-GA | 150 | [Link]() |
| Clarkesville-Habersham Co. Lib. | GA | WordPress-GA | 0 | [Link]() |
| Clarkston Branch | GA | WordPress-GA | 0 | [Link]() |
| Rabun Co. Public Library | GA | WordPress-GA | 6 | [Link]() |
| Clermont Library | GA | WordPress-GA | 0 | [Link]() |
| White County Public Library-Cleveland Branch | GA | WordPress-GA | 1 | [Link]() |
| Chattahoochee Valley Regional Library System | GA | WordPress-GA | 2 | [Link]() |
| Commerce Public Library | GA | WordPress-GA | 0 | [Link]() |
| Coolidge Public Library | GA | WordPress-GA | 0 | [Link]() |
| Cornelia-Habersham Co. Lib. | GA | WordPress-GA | 1 | [Link]() |
| New Georgia Public Library | GA | WordPress-GA | 62 | [Link]() |
| Dalton-Whitfield County Public Library | GA | WordPress-GA | 28 | [Link]() |
| Ida Hilton Public Library | GA | WordPress-GA | 25 | [Link]() |
| Covington Branch | GA | WordPress-GA | 78 | [Link]() |
| Douglas-Coffee County Public Library | GA | WordPress-GA | 1 | [Link]() |
| Laurens County Library | GA | WordPress-GA | 0 | [Link]() |
| Duluth | GA | WordPress-GA | 0 | [Link]() |
| Gibbs Memorial Library | GA | WordPress-GA | 0 | [Link]() |
| Fayette County Public Library | GA | WordPress-GA | 0 | [Link]() |
| Monroe County Library | GA | WordPress-GA | 0 | [Link]() |
| Heard County Public Library | GA | WordPress-GA | 0 | [Link]() |
| Gordon Public Library | GA | WordPress-GA | 0 | [Link]() |
| Grantville Public Library | GA | WordPress-GA | 5 | [Link]() |
| Greene County Library | GA | WordPress-GA | 0 | [Link]() |
| Greenville Area Public Library | GA | WordPress-GA | 13 | [Link]() |
| Harris County Public Library | GA | WordPress-GA | 0 | [Link]() |
| Wayne County Library | GA | WordPress-GA | 14 | [Link]() |
| Cherokee Regional Library System | GA | WordPress-GA | 1 | [Link]() |
| Lagrange Memorial Library | GA | WordPress-GA | 5 | [Link]() |
| Miller Lakeland Library | GA | WordPress-GA | 5 | [Link]() |
| Oglethorpe County Library | GA | WordPress-GA | 0 | [Link]() |
| Jefferson County Library System | GA | WordPress-GA | 15 | [Link]() |
| Nelle Brown Memorial Public Library | GA | WordPress-GA | 0 | [Link]() |
| Middle Georgia Regional Library System | GA | WordPress-GA | 0 | [Link]() |
| Morgan County Library | GA | WordPress-GA | 13 | [Link]() |
| Manchester Public Library | GA | WordPress-GA | 0 | [Link]() |
| Maysville Public Library | GA | WordPress-GA | 0 | [Link]() |
| Meigs Public Library | GA | WordPress-GA | 4 | [Link]() |
| Lake Sinclair Library | GA | WordPress-GA | 0 | [Link]() |
| Monroe-Walton County Library | GA | WordPress-GA | 0 | [Link]() |
| Baker County | GA | WordPress-GA | 0 | [Link]() |
| Pelham-Carnegie Library | GA | WordPress-GA | 81 | [Link]() |
| Pembroke Public Library | GA | WordPress-GA | 0 | [Link]() |
| Houston County Public Libraries System | GA | WordPress-GA | 0 | [Link]() |
| Webster County Library | GA | WordPress-GA | 0 | [Link]() |
| Brooks County Public Library System | GA | WordPress-GA | 0 | [Link]() |
| Parks Memorial Library | GA | WordPress-GA | 47 | [Link]() |
| Riverdale Branch Library | GA | WordPress-GA | 1 | [Link]() |
| Rockmart Library | GA | WordPress-GA | 0 | [Link]() |
| Rossville Public Library | GA | WordPress-GA | 0 | [Link]() |
| Scottdale-Tobie Grant Branch | GA | WordPress-GA | 0 | [Link]() |
| Senoia Area Public Library | GA | WordPress-GA | 5 | [Link]() |
| Lewis A. Ray Library | GA | WordPress-GA | 0 | [Link]() |
| Hancock County Library | GA | WordPress-GA | 38 | [Link]() |
| Effingham | GA | WordPress-GA | 1 | [Link]() |
| Cochran Public Library | GA | WordPress-GA | 14 | [Link]() |
| Chattooga County Library System | GA | WordPress-GA | 0 | [Link]() |
| Hightower Memorial Library | GA | WordPress-GA | 0 | [Link]() |
| Thomson-Mcduffie County Library | GA | WordPress-GA | 0 | [Link]() |
| Tyrone Public Library | GA | WordPress-GA | 0 | [Link]() |
| Elizabeth Harris Library | GA | WordPress-GA | 1 | [Link]() |
| Warren County Public Library | GA | WordPress-GA | 0 | [Link]() |
| Warwick City Library | GA | WordPress-GA | 7 | [Link]() |
| Harlie Fulford Memorial Library | GA | WordPress-GA | 0 | [Link]() |
| Hazel W. Guilford Memorial Library | NC | WordPress-NC | 0 | [Link]() |
| Bath Community Library | NC | WordPress-NC | 0 | [Link]() |
| Belmont Branch Library | NC | WordPress-NC | 12 | [Link]() |
| Mary Duncan Public Library | NC | WordPress-NC | 0 | [Link]() |
| Margaret Little Blount Library | NC | WordPress-NC | 4 | [Link]() |
| Black Creek Branch Library | NC | WordPress-NC | 51 | [Link]() |
| Watauga County Public Library | NC | WordPress-NC | 0 | [Link]() |
| Boonville Community Public Library | NC | WordPress-NC | 0 | [Link]() |
| Bunn Branch Library | NC | WordPress-NC | 0 | [Link]() |
| Alamance County Public Library | NC | WordPress-NC | 0 | [Link]() |
| Canton Branch Library | NC | WordPress-NC | 0 | [Link]() |
| Moore County Library | NC | WordPress-NC | 0 | [Link]() |
| Cary Branch Library | NC | WordPress-NC | 0 | [Link]() |
| Beatties Ford Road Branch Library | NC | WordPress-NC | 1 | [Link]() |
| Claremont Branch Library | NC | WordPress-NC | 2 | [Link]() |
| Hocutt Ellington Memorial Library | NC | WordPress-NC | 0 | [Link]() |
| J.C. Holliday Library | NC | WordPress-NC | 0 | [Link]() |
| Tyrrell County Library | NC | WordPress-NC | 0 | [Link]() |
| Polk County Public Library | NC | WordPress-NC | 19 | [Link]() |
| Cabarrus County Public Library | NC | WordPress-NC | 1 | [Link]() |
| Dallas Branch Library | NC | WordPress-NC | 12 | [Link]() |
| Danbury Public Library | NC | WordPress-NC | 0 | [Link]() |
| Florence S. Shanklin Branch Library | NC | WordPress-NC | 34 | [Link]() |
| Dobson Community Library | NC | WordPress-NC | 0 | [Link]() |
| Bragtown Branch Library | NC | WordPress-NC | 29 | [Link]() |
| Erwin Public Library | NC | WordPress-NC | 0 | [Link]() |
| Fairview Branch Library | NC | WordPress-NC | 0 | [Link]() |
| Farmville Public Library | NC | WordPress-NC | 0 | [Link]() |
| Bordeaux Branch Library | NC | WordPress-NC | 0 | [Link]() |
| Macon County Public Library | NC | WordPress-NC | 0 | [Link]() |
| John W. Clark Public Library | NC | WordPress-NC | 17 | [Link]() |
| Wayne County Public Library, Fremont | NC | WordPress-NC | 4 | [Link]() |
| Graham Public Library | NC | WordPress-NC | 0 | [Link]() |
| Blanche Benjamin Branch Library | NC | WordPress-NC | 0 | [Link]() |
| Carver Branch Library | NC | WordPress-NC | 4 | [Link]() |
| Halifax County Library System | NC | WordPress-NC | 3 | [Link]() |
| Hampstead Branch Library | NC | WordPress-NC | 0 | [Link]() |
| Harmony Branch Library | NC | WordPress-NC | 0 | [Link]() |
| Harrisburg Library | NC | WordPress-NC | 17 | [Link]() |
| Havelock-Craven County Public | NC | WordPress-NC | 0 | [Link]() |
| Henderson County Public Library | NC | WordPress-NC | 0 | [Link]() |
| Hickory Public Library | NC | WordPress-NC | 0 | [Link]() |
| Hudson Branch Library | NC | WordPress-NC | 1 | [Link]() |
| Union West Branch Library | NC | WordPress-NC | 0 | [Link]() |
| King Public Library | NC | WordPress-NC | 0 | [Link]() |
| La Grange Branch Library | NC | WordPress-NC | 5 | [Link]() |
| Leicester Branch Library | NC | WordPress-NC | 0 | [Link]() |
| Leland Branch Library | NC | WordPress-NC | 0 | [Link]() |
| Davidson County Public Library System | NC | WordPress-NC | 0 | [Link]() |
| Liberty Public Library | NC | WordPress-NC | 0 | [Link]() |
| Littleton Public Library | NC | WordPress-NC | 0 | [Link]() |
| Franklin County Library | NC | WordPress-NC | 3 | [Link]() |
| Lowell Branch Library | NC | WordPress-NC | 12 | [Link]() |
| Madison Branch Library | NC | WordPress-NC | 13 | [Link]() |
| Florence Gallier Library | NC | WordPress-NC | 0 | [Link]() |
| Mcdowell County Law Library | NC | WordPress-NC | 3 | [Link]() |
| Madison County Public Library | NC | WordPress-NC | 0 | [Link]() |
| Matthews Branch Library | NC | WordPress-NC | 1 | [Link]() |
| Maysville Public Library | NC | WordPress-NC | 0 | [Link]() |
| Union County Public Library | NC | WordPress-NC | 0 | [Link]() |
| Mooresville Public Library | NC | WordPress-NC | 1 | [Link]() |
| Craven-Pamlico-Carteret Regional Library | NC | WordPress-NC | 16 | [Link]() |
| Newport Public Library | NC | WordPress-NC | 0 | [Link]() |
| Catawba County Library | NC | WordPress-NC | 2 | [Link]() |
| Norwood Branch Library | NC | WordPress-NC | 1 | [Link]() |
| Berea Branch Library | NC | WordPress-NC | 0 | [Link]() |
| Pembroke Public Library | NC | WordPress-NC | 0 | [Link]() |
| Pinebluff Public Library | NC | WordPress-NC | 0 | [Link]() |
| Pettigrew Regional Library | NC | WordPress-NC | 0 | [Link]() |
| Princeton Public Library | NC | WordPress-NC | 0 | [Link]() |
| Roanoke Rapids Public Library | NC | WordPress-NC | 5 | [Link]() |
| Robbins Area Branch | NC | WordPress-NC | 0 | [Link]() |
| Leath Memorial Library | NC | WordPress-NC | 0 | [Link]() |
| Rowan Public Library | NC | WordPress-NC | 0 | [Link]() |
| Saluda Branch Library | NC | WordPress-NC | 114 | [Link]() |
| Selma Public Library | NC | WordPress-NC | 0 | [Link]() |
| Cleveland County Memorial Library | NC | WordPress-NC | 17 | [Link]() |
| Public Library Of Johnston County Smithfield | NC | WordPress-NC | 0 | [Link]() |
| Brunswick County Library | NC | WordPress-NC | 0 | [Link]() |
| Alleghany County Public Library | NC | WordPress-NC | 0 | [Link]() |
| Spring Lake Branch | NC | WordPress-NC | 4 | [Link]() |
| Stanley Branch Library | NC | WordPress-NC | 12 | [Link]() |
| Star Branch | NC | WordPress-NC | 0 | [Link]() |
| Montgomery County Library | NC | WordPress-NC | 0 | [Link]() |
| Warren County Memorial Library | NC | WordPress-NC | 0 | [Link]() |
| Warsaw-Kornegay Public Library | NC | WordPress-NC | 10 | [Link]() |
| Myrtle Grove Branch | NC | WordPress-NC | 3 | [Link]() |
| East Branch Library | NC | WordPress-NC | 51 | [Link]() |
| Lawrence Memorial Library | NC | WordPress-NC | 0 | [Link]() |
| Hartford Public Library | CT | WordPress-CT | 0 | [Link]() |
| New Haven Free Public Library | CT | WordPress-CT | 1 | [Link]() |
| Bridgeport Public Library | CT | WordPress-CT | 14 | [Link]() |
| Stamford Public Library | CT | WordPress-CT | 0 | [Link]() |
| Waterbury Public Library | CT | WordPress-CT | 0 | [Link]() |
| Norwalk Public Library | CT | WordPress-CT | 0 | [Link]() |
| Danbury Public Library | CT | WordPress-CT | 0 | [Link]() |
| New Britain Public Library | CT | WordPress-CT | 57 | [Link]() |
| West Hartford Public Library | CT | WordPress-CT | 83 | [Link]() |
| Greenwich Library | CT | WordPress-CT | 0 | [Link]() |
| Fairfield Public Library | CT | WordPress-CT | 82 | [Link]() |
| Bristol Public Library | CT | WordPress-CT | 196 | [Link]() |
| Manchester Public Library | CT | WordPress-CT | 9 | [Link]() |
| Milford Public Library | CT | WordPress-CT | 0 | [Link]() |
| Stratford Library | CT | WordPress-CT | 1 | [Link]() |
| East Hartford Public Library | CT | WordPress-CT | 0 | [Link]() |
| Middletown Public Library | CT | WordPress-CT | 1 | [Link]() |
| Wallingford Public Library | CT | WordPress-CT | 30 | [Link]() |
| Enfield Public Library | CT | WordPress-CT | 4 | [Link]() |
| Southington Public Library | CT | WordPress-CT | 0 | [Link]() |
| Shelton Public Library | CT | WordPress-CT | 0 | [Link]() |
| Torrington Library | CT | WordPress-CT | 0 | [Link]() |
| Trumbull Library | CT | WordPress-CT | 0 | [Link]() |
| Vernon Public Library | CT | WordPress-CT | 0 | [Link]() |
| Andover Public Library | CT | WordPress-CT | 0 | [Link]() |
| Ansonia Public Library | CT | WordPress-CT | 0 | [Link]() |
| Avon Free Public Library | CT | WordPress-CT | 0 | [Link]() |
| Beacon Falls Public Library | CT | WordPress-CT | 0 | [Link]() |
| Berlin Free Library Association | CT | WordPress-CT | 10 | [Link]() |
| Clark Memorial Library | CT | WordPress-CT | 10 | [Link]() |
| Bethel Public Library | CT | WordPress-CT | 0 | [Link]() |
| Bethlehem Public Library | CT | WordPress-CT | 0 | [Link]() |
| Brookfield Library | CT | WordPress-CT | 88 | [Link]() |
| Burlington Public Library | CT | WordPress-CT | 45 | [Link]() |
| Canterbury Public Library | CT | WordPress-CT | 0 | [Link]() |
| Canton Public Library | CT | WordPress-CT | 0 | [Link]() |
| Cheshire Public Library | CT | WordPress-CT | 2 | [Link]() |
| Chester Public Library | CT | WordPress-CT | 0 | [Link]() |
| Henry Carter Hull Library | CT | WordPress-CT | 0 | [Link]() |
| Saxton B. Little Free Library | CT | WordPress-CT | 1 | [Link]() |
| Cornwall Library Association | CT | WordPress-CT | 4 | [Link]() |
| Booth Dimock Memorial Library | CT | WordPress-CT | 2 | [Link]() |
| Darien Library | CT | WordPress-CT | 24 | [Link]() |
| Durham Public Library | CT | WordPress-CT | 37 | [Link]() |
| East Hampton Public Library | CT | WordPress-CT | 28 | [Link]() |
| Easton Public Library | CT | WordPress-CT | 0 | [Link]() |
| Hall Memorial Library | CT | WordPress-CT | 0 | [Link]() |
| Essex Library Association | CT | WordPress-CT | 0 | [Link]() |
| Farmington Library | CT | WordPress-CT | 9 | [Link]() |
| Janet Carlson Calvert Library | CT | WordPress-CT | 3 | [Link]() |
| Goshen Public Library | CT | WordPress-CT | 0 | [Link]() |
| Frederick H. Cossitt Library | CT | WordPress-CT | 1 | [Link]() |
| Community Branch Library | CT | WordPress-CT | 1 | [Link]() |
| Hartland Public Library | CT | WordPress-CT | 0 | [Link]() |
| Harwinton Public Library | CT | WordPress-CT | 112 | [Link]() |
| Douglas Library Of Hebron | CT | WordPress-CT | 0 | [Link]() |
| Ivoryton Library Association | CT | WordPress-CT | 0 | [Link]() |
| Kent Library Association | CT | WordPress-CT | 62 | [Link]() |
| Killingworth Library | CT | WordPress-CT | 0 | [Link]() |
| Jonathan Trumbull Library | CT | WordPress-CT | 0 | [Link]() |
| Bill Library | CT | WordPress-CT | 1 | [Link]() |
| E.C. Scranton Memorial Library | CT | WordPress-CT | 9 | [Link]() |
| Mansfield Public Library | CT | WordPress-CT | 0 | [Link]() |
| Middlebury Public Library | CT | WordPress-CT | 22 | [Link]() |
| Levi E.Coe Library | CT | WordPress-CT | 0 | [Link]() |
| Edith Wheeler Memorial Library | CT | WordPress-CT | 0 | [Link]() |
| Mystic Noank Library | CT | WordPress-CT | 0 | [Link]() |
| New Canaan Library | CT | WordPress-CT | 79 | [Link]() |
| New Fairfield Free Public Library | CT | WordPress-CT | 6 | [Link]() |
| Public Library Of New London | CT | WordPress-CT | 11 | [Link]() |
| New Milford Public Library | CT | WordPress-CT | 1 | [Link]() |
| Cyrenius H. Booth Library | CT | WordPress-CT | 0 | [Link]() |
| Norfolk Library | CT | WordPress-CT | 13 | [Link]() |
| North Haven Memorial Library | CT | WordPress-CT | 0 | [Link]() |
| Otis Library | CT | WordPress-CT | 1 | [Link]() |
| Old Lyme - Phoebe Griffin Noyes Library | CT | WordPress-CT | 0 | [Link]() |
| Oxford Public Library | CT | WordPress-CT | 0 | [Link]() |
| Central Village Public Library | CT | WordPress-CT | 7 | [Link]() |
| Plainville Public Library | CT | WordPress-CT | 0 | [Link]() |
| Plymouth Library Association | CT | WordPress-CT | 0 | [Link]() |
| Pomfret Public Library | CT | WordPress-CT | 0 | [Link]() |
| Portland Public Library | CT | WordPress-CT | 0 | [Link]() |
| Preston Public Library | CT | WordPress-CT | 1 | [Link]() |
| Prospect Public Library | CT | WordPress-CT | 0 | [Link]() |
| Ridgefield Library | CT | WordPress-CT | 10 | [Link]() |
| Minor Memorial Library | CT | WordPress-CT | 39 | [Link]() |
| Salem Free Public Library | CT | WordPress-CT | 0 | [Link]() |
| Scoville Memorial Library | CT | WordPress-CT | 0 | [Link]() |
| Seymour Public Library | CT | WordPress-CT | 144 | [Link]() |
| Sherman Library Assn. | CT | WordPress-CT | 1 | [Link]() |
| Somers Public Library | CT | WordPress-CT | 14 | [Link]() |
| South Windsor Public Library | CT | WordPress-CT | 66 | [Link]() |
| Southbury Public Library | CT | WordPress-CT | 61 | [Link]() |
| Pequot Library Association | CT | WordPress-CT | 0 | [Link]() |
| Stafford Library Association | CT | WordPress-CT | 1 | [Link]() |
| Stonington Free Library | CT | WordPress-CT | 0 | [Link]() |
| Kent Memorial Library | CT | WordPress-CT | 0 | [Link]() |
| Thomaston Public Library | CT | WordPress-CT | 0 | [Link]() |
| Union Free Public Library | CT | WordPress-CT | 108 | [Link]() |
| Warren Public Library | CT | WordPress-CT | 1 | [Link]() |
| Waterford Public Library | CT | WordPress-CT | 0 | [Link]() |
| Oakville Branch Library | CT | WordPress-CT | 0 | [Link]() |
| Louis Piantino Branch Library | CT | WordPress-CT | 0 | [Link]() |
| Westbrook Public Library | CT | WordPress-CT | 93 | [Link]() |
| Weston Public Library | CT | WordPress-CT | 0 | [Link]() |
| Westport Library | CT | WordPress-CT | 44 | [Link]() |
| Wethersfield Public Library | CT | WordPress-CT | 0 | [Link]() |
| Willimantic Public Library | CT | WordPress-CT | 19 | [Link]() |
| Wilton Library Association | CT | WordPress-CT | 1 | [Link]() |
| Beardsley Memorial Library | CT | WordPress-CT | 1 | [Link]() |
| Windham Free Library | CT | WordPress-CT | 2 | [Link]() |
| Wilson Branch Library | CT | WordPress-CT | 0 | [Link]() |
| Windsor Locks Public Library | CT | WordPress-CT | 0 | [Link]() |
| Wolcott Public Library | CT | WordPress-CT | 1 | [Link]() |
| Woodbridge Town Library | CT | WordPress-CT | 0 | [Link]() |
| Woodbury Public Library | CT | WordPress-CT | 23 | [Link]() |
| Nashville Public Library | TN | WordPress-TN | 1 | [Link]() |
| Memphis Public Libraries | TN | WordPress-TN | 33 | [Link]() |
| Knox County Public Library | TN | WordPress-TN | 26 | [Link]() |
| Chattanooga Public Library | TN | WordPress-TN | 150 | [Link]() |
| Clarksville-Montgomery County Public Library | TN | WordPress-TN | 0 | [Link]() |
| Johnson City Public Library | TN | WordPress-TN | 21 | [Link]() |
| Kingsport Public Library | TN | WordPress-TN | 0 | [Link]() |
| Williamson County Public Library | TN | WordPress-TN | 0 | [Link]() |
| Rutherford County Library System | TN | WordPress-TN | 0 | [Link]() |
| Blount County Public Library | TN | WordPress-TN | 0 | [Link]() |
| Cleveland-Bradley County Public Library | TN | WordPress-TN | 1 | [Link]() |
| Germantown Community Library | TN | WordPress-TN | 150 | [Link]() |
| Collierville Burch Library | TN | WordPress-TN | 0 | [Link]() |
| Bartlett Library | TN | WordPress-TN | 0 | [Link]() |
| Hendersonville Public Library | TN | WordPress-TN | 0 | [Link]() |
| Morristown-Hamblen Library | TN | WordPress-TN | 0 | [Link]() |
| Smyrna Public Library | TN | WordPress-TN | 0 | [Link]() |
| Sevier County Public Library System | TN | WordPress-TN | 0 | [Link]() |
| Tullahoma Public Library | TN | WordPress-TN | 0 | [Link]() |
| Athens Public Library | TN | WordPress-TN | 34 | [Link]() |
| Lawrenceburg Public Library | TN | WordPress-TN | 0 | [Link]() |
| Crossville-Cumberland County Public Library | TN | WordPress-TN | 0 | [Link]() |
| Manchester Public Library | TN | WordPress-TN | 0 | [Link]() |
| Rogersville Public Library | TN | WordPress-TN | 0 | [Link]() |
| Tipton County Public Library | TN | WordPress-TN | 0 | [Link]() |
| Savannah-Hardin County Library | TN | WordPress-TN | 1 | [Link]() |
| Crockett County Library | TN | WordPress-TN | 0 | [Link]() |
| Alexandria Branch Library | TN | WordPress-TN | 6 | [Link]() |
| Southeast Branch Library | TN | WordPress-TN | 0 | [Link]() |
| Ardmore Public Library | TN | WordPress-TN | 0 | [Link]() |
| Sam T. Wilson Public Library | TN | WordPress-TN | 0 | [Link]() |
| Auburntown Public Library | TN | WordPress-TN | 1 | [Link]() |
| Baxter Branch Library | TN | WordPress-TN | 150 | [Link]() |
| The Brentwood Library | TN | WordPress-TN | 0 | [Link]() |
| Benton County Library | TN | WordPress-TN | 0 | [Link]() |
| Smith County Public Library | TN | WordPress-TN | 0 | [Link]() |
| Hickman County Public Library | TN | WordPress-TN | 150 | [Link]() |
| Clinton Public Library | TN | WordPress-TN | 0 | [Link]() |
| Cordova Branch Library | TN | WordPress-TN | 0 | [Link]() |
| Meigs-Decatur Public Library | TN | WordPress-TN | 96 | [Link]() |
| Stewart County Public Library | TN | WordPress-TN | 0 | [Link]() |
| Sequatchie County Public Library | TN | WordPress-TN | 0 | [Link]() |
| Englewood Public Library | TN | WordPress-TN | 0 | [Link]() |
| Unicoi County Public Library | TN | WordPress-TN | 0 | [Link]() |
| Fairview Public Library | TN | WordPress-TN | 0 | [Link]() |
| Gleason Memorial Library | TN | WordPress-TN | 0 | [Link]() |
| Dr. Nathan Porter Library | TN | WordPress-TN | 3 | [Link]() |
| Harriman Public Library | TN | WordPress-TN | 0 | [Link]() |
| Carroll County Library | TN | WordPress-TN | 0 | [Link]() |
| Fentress County Library | TN | WordPress-TN | 0 | [Link]() |
| Kingston Public Library | TN | WordPress-TN | 10 | [Link]() |
| Macon County Public Library | TN | WordPress-TN | 1 | [Link]() |
| Millard Oakley Public Library | TN | WordPress-TN | 0 | [Link]() |
| Nashville Talking Library | TN | WordPress-TN | 8 | [Link]() |
| Madisonville Public Library | TN | WordPress-TN | 0 | [Link]() |
| Middleton Community Library | TN | WordPress-TN | 0 | [Link]() |
| Mildred G. Fields Memorial Library | TN | WordPress-TN | 1 | [Link]() |
| Monterey Branch Library | TN | WordPress-TN | 0 | [Link]() |
| Mt. Juliet-Harvey Freeman Public Library | TN | WordPress-TN | 0 | [Link]() |
| Newbern City Library | TN | WordPress-TN | 16 | [Link]() |
| Palmer Public Library | TN | WordPress-TN | 0 | [Link]() |
| Parsons Public Library | TN | WordPress-TN | 0 | [Link]() |
| Portland Public Library | TN | WordPress-TN | 8 | [Link]() |
| Lauderdale County Library | TN | WordPress-TN | 1 | [Link]() |
| Seymour Branch Library | TN | WordPress-TN | 0 | [Link]() |
| Somerville-Fayette County Library | TN | WordPress-TN | 0 | [Link]() |
| White County Public Library | TN | WordPress-TN | 38 | [Link]() |
| Audrey Pack Memorial Library | TN | WordPress-TN | 0 | [Link]() |
| Spring Hill Public Library | TN | WordPress-TN | 0 | [Link]() |
| Sweetwater Public Library | TN | WordPress-TN | 1 | [Link]() |
| Mary E. Tippitt Memorial Library | TN | WordPress-TN | 0 | [Link]() |
| Hamilton Parks Public Library | TN | WordPress-TN | 1 | [Link]() |
| Washburn Public Library | TN | WordPress-TN | 10 | [Link]() |
| Watertown-Wilson County Library | TN | WordPress-TN | 0 | [Link]() |
| Humphreys County Public Library | TN | WordPress-TN | 1 | [Link]() |
| Westmoreland Public Library | TN | WordPress-TN | 0 | [Link]() |
| White Pine Public Library | TN | WordPress-TN | 0 | [Link]() |
| Franklin County Public Library | TN | WordPress-TN | 0 | [Link]() |
| Winfield Public Library | TN | WordPress-TN | 0 | [Link]() |
| Adams Memorial Library | TN | WordPress-TN | 23 | [Link]() |
| Franklin Public Library | TN | WordPress-TN | 0 | [Link]() |
| Birmingham Public Library | AL | WordPress-AL | 1 | [Link]() |
| Huntsville-Madison County Public Library | AL | WordPress-AL | 13 | [Link]() |
| Mobile Public Library | AL | WordPress-AL | 28 | [Link]() |
| Montgomery City-County Public Library | AL | WordPress-AL | 37 | [Link]() |
| Tuscaloosa Public Library | AL | WordPress-AL | 150 | [Link]() |
| Auburn Public Library | AL | WordPress-AL | 1 | [Link]() |
| Dothan Houston County Library System | AL | WordPress-AL | 73 | [Link]() |
| Decatur Public Library | AL | WordPress-AL | 107 | [Link]() |
| Florence-Lauderdale Public Library | AL | WordPress-AL | 0 | [Link]() |
| Hoover Public Library | AL | WordPress-AL | 7 | [Link]() |
| Vestavia Hills Library | AL | WordPress-AL | 150 | [Link]() |
| Homewood Public Library | AL | WordPress-AL | 0 | [Link]() |
| Jefferson County Library Cooperative | AL | WordPress-AL | 0 | [Link]() |
| Selma-Dallas County Public Library | AL | WordPress-AL | 1 | [Link]() |
| Athens-Limestone Public Library | AL | WordPress-AL | 34 | [Link]() |
| Fairhope Public Library | AL | WordPress-AL | 150 | [Link]() |
| Daphne Public Library | AL | WordPress-AL | 0 | [Link]() |
| Scottsboro Public Library | AL | WordPress-AL | 0 | [Link]() |
| Troy Public Library | AL | WordPress-AL | 0 | [Link]() |
| Pelham Public Library | AL | WordPress-AL | 81 | [Link]() |
| Trussville Public Library | AL | WordPress-AL | 3 | [Link]() |
| Gardendale Public Library | AL | WordPress-AL | 1 | [Link]() |
| Abbeville Memorial Library | AL | WordPress-AL | 7 | [Link]() |
| Akron Public Library | AL | WordPress-AL | 0 | [Link]() |
| Andalusia Public Library | AL | WordPress-AL | 0 | [Link]() |
| Ashland City Public Library | AL | WordPress-AL | 0 | [Link]() |
| Bridgeport - Lena Cagle Public Library | AL | WordPress-AL | 0 | [Link]() |
| Choctaw County Public Library | AL | WordPress-AL | 0 | [Link]() |
| Wilcox County Library | AL | WordPress-AL | 0 | [Link]() |
| Chelsea Public Library | AL | WordPress-AL | 0 | [Link]() |
| Clayton Town And County Public Library | AL | WordPress-AL | 0 | [Link]() |
| Collinsville Public Library | AL | WordPress-AL | 0 | [Link]() |
| Houston-Love Memorial Library - Columbia | AL | WordPress-AL | 0 | [Link]() |
| Cordova Public Library | AL | WordPress-AL | 0 | [Link]() |
| Daleville Public Library | AL | WordPress-AL | 1 | [Link]() |
| Walter J. Hanna Memorial Library | AL | WordPress-AL | 1 | [Link]() |
| Fayette County Memorial Library | AL | WordPress-AL | 81 | [Link]() |
| Foley Public Library | AL | WordPress-AL | 0 | [Link]() |
| Grant Public Library | AL | WordPress-AL | 0 | [Link]() |
| Hale County Library | AL | WordPress-AL | 0 | [Link]() |
| Butler County Public Library | AL | WordPress-AL | 13 | [Link]() |
| Guntersville Public Library | AL | WordPress-AL | 0 | [Link]() |
| Clyde Nix Public Library | AL | WordPress-AL | 0 | [Link]() |
| Hartford - Mcgregor-Mckinney Public Library | AL | WordPress-AL | 0 | [Link]() |
| Blanche R. Solomon Memorial Library | AL | WordPress-AL | 0 | [Link]() |
| Jane B. Holmes Public Library | AL | WordPress-AL | 0 | [Link]() |
| Hueytown Public Library | AL | WordPress-AL | 0 | [Link]() |
| Irondale Public Library | AL | WordPress-AL | 0 | [Link]() |
| City Of Bayou La Batre Public Library | AL | WordPress-AL | 0 | [Link]() |
| Kennedy Public Library | AL | WordPress-AL | 0 | [Link]() |
| Lafayette Pilot Public Library | AL | WordPress-AL | 1 | [Link]() |
| Jane Culbreth Library | AL | WordPress-AL | 0 | [Link]() |
| Leighton Public Library | AL | WordPress-AL | 22 | [Link]() |
| Burchell Campbell Memorial Library | AL | WordPress-AL | 0 | [Link]() |
| Lincoln Public Library | AL | WordPress-AL | 0 | [Link]() |
| Ruby Pickens Tartt Public Library | AL | WordPress-AL | 1 | [Link]() |
| Louisville Public Library | AL | WordPress-AL | 15 | [Link]() |
| Madison Public Library | AL | WordPress-AL | 13 | [Link]() |
| Marion-Perry County Library | AL | WordPress-AL | 3 | [Link]() |
| Millbrook Public Library | AL | WordPress-AL | 0 | [Link]() |
| Monroe County Public Library | AL | WordPress-AL | 0 | [Link]() |
| Doris Stanley Memorial Library | AL | WordPress-AL | 1 | [Link]() |
| Newton Public Library | AL | WordPress-AL | 0 | [Link]() |
| Opp Public Library | AL | WordPress-AL | 0 | [Link]() |
| Orange Beach Public Library | AL | WordPress-AL | 0 | [Link]() |
| Oxford Public Library | AL | WordPress-AL | 0 | [Link]() |
| Piedmont Public Library | AL | WordPress-AL | 0 | [Link]() |
| Pine Hill Branch Public Library | AL | WordPress-AL | 1 | [Link]() |
| Clay Public Library | AL | WordPress-AL | 0 | [Link]() |
| Satsuma Public Library | AL | WordPress-AL | 0 | [Link]() |
| Evergreen Public Library | AL | WordPress-AL | 0 | [Link]() |
| Sheffield Public Library | AL | WordPress-AL | 0 | [Link]() |
| Somerville Public Library | AL | WordPress-AL | 0 | [Link]() |
| Stevenson Public Library | AL | WordPress-AL | 0 | [Link]() |
| H. Grady Bradshaw - Chambers County Library | AL | WordPress-AL | 1 | [Link]() |
| Vernon - Mary Wallace Cobb Memorial Library | AL | WordPress-AL | 0 | [Link]() |
| Warrior Public Library | AL | WordPress-AL | 0 | [Link]() |
| Wilsonville - Vernice Stoudenmire Library | AL | WordPress-AL | 85 | [Link]() |
| Northwest Regional Library | AL | WordPress-AL | 0 | [Link]() |
| Woodville Public Library | AL | WordPress-AL | 0 | [Link]() |
| Fletcher Free Library | VT | WordPress-VT | 5 | [Link]() |
| Kellogg-Hubbard Library | VT | WordPress-VT | 150 | [Link]() |
| Brooks Memorial Library | VT | WordPress-VT | 150 | [Link]() |
| St. Johnsbury Athenaeum | VT | WordPress-VT | 3 | [Link]() |
| Ilsley Public Library | VT | WordPress-VT | 20 | [Link]() |
| Norman Williams Public Library | VT | WordPress-VT | 150 | [Link]() |
| Aldrich Public Library | VT | WordPress-VT | 0 | [Link]() |
| Brownell Library | VT | WordPress-VT | 150 | [Link]() |
| Pierson Library | VT | WordPress-VT | 39 | [Link]() |
| Rockingham Free Public Library | VT | WordPress-VT | 6 | [Link]() |
| Springfield Town Library | VT | WordPress-VT | 2 | [Link]() |
| Morristown Centennial Library | VT | WordPress-VT | 0 | [Link]() |
| Haskell Free Library | VT | WordPress-VT | 0 | [Link]() |
| Cobleigh Public Library | VT | WordPress-VT | 0 | [Link]() |
| Hartland Public Library | VT | WordPress-VT | 0 | [Link]() |
| Deborah Rawson Memorial Library | VT | WordPress-VT | 15 | [Link]() |
| Martha Canfield Memorial | VT | WordPress-VT | 0 | [Link]() |
| Barton Public | VT | WordPress-VT | 0 | [Link]() |
| Mount Holly | VT | WordPress-VT | 13 | [Link]() |
| Bennington Free | VT | WordPress-VT | 150 | [Link]() |
| Benson Public | VT | WordPress-VT | 0 | [Link]() |
| Bethel Public | VT | WordPress-VT | 0 | [Link]() |
| Bradford Public | VT | WordPress-VT | 0 | [Link]() |
| Brandon Free Public | VT | WordPress-VT | 61 | [Link]() |
| Brookfield Free Public | VT | WordPress-VT | 88 | [Link]() |
| Cabot Public | VT | WordPress-VT | 0 | [Link]() |
| Alice M. Ward Memorial | VT | WordPress-VT | 17 | [Link]() |
| Charlotte | VT | WordPress-VT | 68 | [Link]() |
| Chelsea Public | VT | WordPress-VT | 0 | [Link]() |
| Whiting | VT | WordPress-VT | 0 | [Link]() |
| Concord Public Library | VT | WordPress-VT | 3 | [Link]() |
| Cornwall Free Public | VT | WordPress-VT | 4 | [Link]() |
| Pope Memorial | VT | WordPress-VT | 0 | [Link]() |
| Essex Free | VT | WordPress-VT | 0 | [Link]() |
| Fair Haven Free | VT | WordPress-VT | 1 | [Link]() |
| Fairfax Community | VT | WordPress-VT | 0 | [Link]() |
| Bent Northrup Memorial | VT | WordPress-VT | 1 | [Link]() |
| Haston | VT | WordPress-VT | 3 | [Link]() |
| Gilman Public Library | VT | WordPress-VT | 0 | [Link]() |
| Glover Public | VT | WordPress-VT | 0 | [Link]() |
| Grafton Public | VT | WordPress-VT | 0 | [Link]() |
| Greensboro Free | VT | WordPress-VT | 0 | [Link]() |
| Hancock Free Public | VT | WordPress-VT | 4 | [Link]() |
| Hartford | VT | WordPress-VT | 0 | [Link]() |
| Huntington Public | VT | WordPress-VT | 0 | [Link]() |
| Lanpher Memorial | VT | WordPress-VT | 41 | [Link]() |
| Lincoln | VT | WordPress-VT | 0 | [Link]() |
| Lowell Community | VT | WordPress-VT | 0 | [Link]() |
| Alden Balch Memorial | VT | WordPress-VT | 0 | [Link]() |
| Mark Skinner | VT | WordPress-VT | 0 | [Link]() |
| Jaquith Public | VT | WordPress-VT | 0 | [Link]() |
| Milton Public Library | VT | WordPress-VT | 0 | [Link]() |
| Russell Memorial | VT | WordPress-VT | 1 | [Link]() |
| Tenney Memorial | VT | WordPress-VT | 1 | [Link]() |
| Moore Free | VT | WordPress-VT | 0 | [Link]() |
| Goodrich Memorial | VT | WordPress-VT | 1 | [Link]() |
| North Hero Public | VT | WordPress-VT | 1 | [Link]() |
| Norwich Public | VT | WordPress-VT | 1 | [Link]() |
| Peacham | VT | WordPress-VT | 1 | [Link]() |
| Roger Clark Memorial | VT | WordPress-VT | 2 | [Link]() |
| Cutler Memorial | VT | WordPress-VT | 7 | [Link]() |
| Proctor Free | VT | WordPress-VT | 0 | [Link]() |
| Putney Public | VT | WordPress-VT | 22 | [Link]() |
| Quechee | VT | WordPress-VT | 6 | [Link]() |
| Kimball Public | VT | WordPress-VT | 0 | [Link]() |
| Reading Public | VT | WordPress-VT | 1 | [Link]() |
| Readsboro Community | VT | WordPress-VT | 0 | [Link]() |
| Richmond Free | VT | WordPress-VT | 0 | [Link]() |
| Rochester Public | VT | WordPress-VT | 0 | [Link]() |
| Roxbury Free | VT | WordPress-VT | 39 | [Link]() |
| Salisbury Free Public | VT | WordPress-VT | 0 | [Link]() |
| Sheldon Public | VT | WordPress-VT | 0 | [Link]() |
| Shrewsbury | VT | WordPress-VT | 0 | [Link]() |
| Stamford Community | VT | WordPress-VT | 0 | [Link]() |
| Stowe Free | VT | WordPress-VT | 0 | [Link]() |
| Morrill Mem. Harris | VT | WordPress-VT | 0 | [Link]() |
| Franklin-Grand Isle Bookmobile | VT | WordPress-VT | 34 | [Link]() |
| Latham Memorial | VT | WordPress-VT | 1 | [Link]() |
| Tunbridge Public | VT | WordPress-VT | 35 | [Link]() |
| Vernon Free | VT | WordPress-VT | 7 | [Link]() |
| Gilbert Hart | VT | WordPress-VT | 30 | [Link]() |
| Warren Public | VT | WordPress-VT | 1 | [Link]() |
| Waterville Town | VT | WordPress-VT | 21 | [Link]() |
| Wells Village | VT | WordPress-VT | 0 | [Link]() |
| West Hartford | VT | WordPress-VT | 83 | [Link]() |
| Hitchcock Museum | VT | WordPress-VT | 1 | [Link]() |
| Westford Town | VT | WordPress-VT | 1 | [Link]() |
| Butterfield | VT | WordPress-VT | 0 | [Link]() |
| Westminster West Public | VT | WordPress-VT | 0 | [Link]() |
| Wilder Memorial | VT | WordPress-VT | 0 | [Link]() |
| Ainsworth Public | VT | WordPress-VT | 150 | [Link]() |
| Pettee Memorial | VT | WordPress-VT | 3 | [Link]() |
| Windham Town | VT | WordPress-VT | 2 | [Link]() |
| Windsor Public | VT | WordPress-VT | 0 | [Link]() |
| G. M. Kelley Community | VT | WordPress-VT | 1 | [Link]() |
| Woodbury Community | VT | WordPress-VT | 23 | [Link]() |
| Manchester City Library |  | LibCal-NH | 48 | [Link]() |
| Nashua Public Library |  | LibCal-NH | 48 | [Link]() |
| Concord Public Library |  | LibCal-NH | 35 | [Link]() |
| Keene Public Library |  | LibCal-NH | 48 | [Link]() |
| Lebanon Public Libraries |  | LibCal-NH | 48 | [Link]() |
| Merrimack Public Library |  | LibCal-NH | 48 | [Link]() |
| Hooksett Public Library |  | LibCal-NH | 48 | [Link]() |
| Hollis Social Library |  | LibCal-NH | 48 | [Link]() |
| Pelham Public Library |  | LibCal-NH | 48 | [Link]() |
| Forsyth County Public Library | NC | Communico-NC | 4 | [Link](https://forsyth.libnet.info/events) |
| Wake County Public Libraries | NC | Communico-NC | 0 | [Link](https://wake.libnet.info/events) |
| Ferguson Library |  | LibraryMarket-CT | 24 | [Link]() |
| New Britain Public Library |  | LibraryMarket-CT | 0 | [Link]() |
| West Hartford Public Library |  | LibraryMarket-CT | 34 | [Link]() |
| Meriden Public Library |  | LibraryMarket-CT | 3 | [Link]() |
| Fairfield Public Library |  | LibraryMarket-CT | 114 | [Link]() |
| Sumter County Library |  | LibraryMarket-SC | 10 | [Link]() |
| Beaufort County Library |  | LibraryMarket-SC | 34 | [Link]() |

### Cycle-completion check (2026-08-07)

This begins a new 3-day pass (Group 1 today). Group 2 and Group 3 have not yet run in this new cycle, so the cycle is **not complete** — Day 1 of 3 only.

## 2026-08-08

Today's target run is `scrapers/logs/scraper-run-2026-08-07.log` (started 2026-08-07 03:00 local, completed into 2026-08-08 — the log's own "Today is day 7 → Group 1" line confirms this is a Group 1 run). Cross-checking every library scraper named in that run against the currently-open cycle's `## 2026-08-05` and `## 2026-08-07` sections: **all of them already have at least one row logged this cycle.** The `## 2026-08-07` section captured this same Group 1 run's library-scraper output directly (per its own header note, bounded from `scraper-stdout.log`), and `CustomDrupal-Libraries` / `WordPress-MD` were logged back in `## 2026-08-05`. Per the skip rule, none are re-added here:

LibCal-DE, LibCal-NC, LibCal-NY2, LibCal-RI, LibCal-KY, LibCal-NH, Communico-DC, Communico-MA, Communico-VA, Communico-NC, Communico-MD, BiblioCommons-NJ, BiblioCommons-VA, Pratt-Library, FreeLibrary-Philadelphia, AACPL, Prince-Georges-County, Westmoreland-Library, CivicEngage-Libraries, FullCalendar-Libraries, LibraryCalendar-Libraries, WordPress-CT, WordPress-VT, WordPress-AL, WordPress-TN, WordPress-GA, WordPress-NC, WordPress-VA, WordPress-Abbe-Regional, WordPress-MD, LibraryMarket-CT, LibraryMarket-SC, CustomDrupal-Libraries, GoogleCalendar-MD.

The one genuinely new entry is **SandhillRegional-NC** — a brand-new scraper committed today, with no prior row anywhere in this cycle (or in the file at all). Its per-branch breakdown comes from a fresh 2026-08-08 DB query rather than stdout, since it doesn't log per-branch counts to stdout; supplied directly rather than re-derived. All 10 branches share the same listing page.

**Notes on this entry:**
- **SandhillRegional-NC**: 10 branches of the Sandhills Regional Library System (NC), one shared LibGuides listing page (`https://srls.libguides.com/c.php?g=824539&p=5958576`). 98 total rows currently in the DB vs. 106 found in the live run — the found/saved gap is first-run new-coverage noise (likely dedup or a rejected row or two), not investigated further here.

| Library Website | State | Scraper | Events Found | Link |
|---|---|---|---|---|
| Sandhills Regional Library — Star Branch | NC | SandhillRegional-NC | 4 | [Link](https://srls.libguides.com/c.php?g=824539&p=5958576) |
| Sandhills Regional Library — Troy Branch | NC | SandhillRegional-NC | 9 | [Link](https://srls.libguides.com/c.php?g=824539&p=5958576) |
| Sandhills Regional Library — Robbins Branch | NC | SandhillRegional-NC | 22 | [Link](https://srls.libguides.com/c.php?g=824539&p=5958576) |
| Sandhills Regional Library — Carthage Branch | NC | SandhillRegional-NC | 24 | [Link](https://srls.libguides.com/c.php?g=824539&p=5958576) |
| Sandhills Regional Library — Pinebluff Branch | NC | SandhillRegional-NC | 8 | [Link](https://srls.libguides.com/c.php?g=824539&p=5958576) |
| Sandhills Regional Library — Aberdeen Branch | NC | SandhillRegional-NC | 13 | [Link](https://srls.libguides.com/c.php?g=824539&p=5958576) |
| Sandhills Regional Library — Biscoe Branch | NC | SandhillRegional-NC | 8 | [Link](https://srls.libguides.com/c.php?g=824539&p=5958576) |
| Sandhills Regional Library — Rockingham Branch | NC | SandhillRegional-NC | 4 | [Link](https://srls.libguides.com/c.php?g=824539&p=5958576) |
| Sandhills Regional Library — Hamlet Branch | NC | SandhillRegional-NC | 1 | [Link](https://srls.libguides.com/c.php?g=824539&p=5958576) |
| Sandhills Regional Library — Vass Branch | NC | SandhillRegional-NC | 4 | [Link](https://srls.libguides.com/c.php?g=824539&p=5958576) |

### Cycle-completion check (2026-08-08)

**Not complete.** Checked every active library-family scraper in `scrapers/scraper-registry.js` (filtered through `isScraperActive()`) against the union of `## 2026-08-05` + `## 2026-08-07` + `## 2026-08-08`. Two active library scrapers still have zero rows anywhere in this open cycle:

- **LibCal-VA2** (`scraper-libcal-libraries-va.js`, VA, Group 3)
- **Intercept-Camden** (`scraper-intercept-camden-nj.js`, NJ, Group 3)

Both are Group 3, and Group 3 has not run yet in this cycle — only Group 2 (2026-08-05) and Group 1 (2026-08-07 / 2026-08-08, same run) have. The cycle can close out once Group 3 runs and both scrapers pick up at least one logged row.

## 2026-08-09

Day 5 of the open cycle (day 1 of a fresh 3-day rotation counter doesn't apply here — this is Group 3's first run of the current cycle, per `scrapers/logs/scraper-run-2026-08-09.log`'s own "Today is day 9 → Group 3" line). This run closes out the open cycle: every active library-family scraper now has at least one entry (see Cycle-completion check below).

Per-library counts below are paired from `scrapers/logs/scraper-stdout.log`, bounded by each scraper's start/end timestamp taken from `scrapers/logs/scraper-run-2026-08-09.log`. Rows already logged earlier this cycle are skipped per the standing skip-duplicates rule: **WordPress-NY** (2026-08-05), **LibCal-GA** (2026-08-05), **GoogleCalendar-MD** and **Communico-MD** (2026-08-07), **WordPress-GA**, **WordPress-NC**, and **SandhillRegional-NC** (2026-08-07/08-08). Non-library scrapers in today's run (RollyPollies-MD — a kids' activity venue chain, not a library; the VenueList-\*-DMV family; AARecParks-MD; WordPressTec-Parks; Venue-Events-ZoosAquariums; Farms-Eastern-US; Patch-Community-Eastern; CivicRec-Parks-Eastern; Gardens-Nature-Eastern; MacaroniKid-NJ/VA/SC/DE) are excluded per the task's standing skip list.

**Notes on individual entries:**
- **LibCal-FL**: 2 of 5 sites (St. Johns County Public Library, Seminole County Library) errored before printing a per-library `Found` count — consistent with the run's own "Failed: 2" summary line. Recorded as 0 with an inline error flag rather than guessed at.
- **Communico-FL**: 4 of 9 sites (Miami-Dade, Broward, Martin County, Alachua County) fell back to raw API-page counts (`📡 API returned N events`) rather than the post-filter `Found N events` line the other 5 sites printed; used as the per-library count since no later line supersedes it in the raw log.
- **BiblioCommons-MA**: only 2 sites tracked this run (Boston Public Library, Lawrence Public Library) — matches the run's own "📍 2 sites tracked" summary line.
- **Squarespace-Libraries**: config now covers only 1 active site (Queen Anne's County Library, MD) — the file's own comment notes Dorchester County was removed to avoid duplicating `scraper-dorchester-county-library-MD.js`'s coverage.
- **Drupal-Virginia** and **WithApps-Libraries**: both confirmed single-site scrapers (Handley Regional Library, VA and Hampton Public Library, VA respectively) via their own "📍 1 sites tracked" summary lines — not itemized-but-incomplete, genuinely one site each.
- **WordPress-Events-Calendar**: 13 sites itemized this run (an improvement over the 2026-08-04 deep-dive pass, which could not itemize it at all).
- **WordPress-PA / WordPress-MA / WordPress-KY / WordPress-SC / WordPress-WV / WordPress-DE / WordPress-RI / WordPress-NH**: fully itemized per-library from stdout. Link column resolved via each scraper's own `LIBRARIES` config array matched by name; **~13% of rows across these eight families (102 of 793) could not be matched** — mostly punctuation/apostrophe differences between the console's display name and the config's `name` field (e.g. "Guthrie Memorial Library - Hanovers Public Library" in the log vs. an apostrophe'd form in config) — left as `[Link]()` rather than guessed at, consistent with this file's existing convention for unresolved links.
- **LibraryMarket-PA / LibraryMarket-NC**: these use a different log pattern (`📚 Scraping {name}...` / `✅ Found {N} events`) than the LibCal/Communico `📍` pattern; both fully itemized (3 and 2 sites respectively) with links from their own `LIBRARIES` config arrays.
- **Orange-County-Library-FL** and **Nashville-Library-TN**: confirmed single-system scrapers (one shared calendar URL each) via their own file headers — the "17"/"22" `name:` matches in those files are internal branch-address lookups for venue matching, not separate scrape targets.
- **Assabet-NH-MA**: genuinely multi-site (18 libraries across NH/MA, each with its own `eventsUrl` in the `LIBRARIES` config array) but this scraper does not print a per-library breakdown to stdout — recorded as one aggregate row per the standing single-system-standalone convention, with a note flagging the real site count rather than silently treating it as one library.
- **LibCal-VA2**: ran twice today (07:25 EST, pre-fix, Found: 0; 22:15 EST, post-fix, Found: 182) — per the task's standing instruction, the second run's totals are used. Neither run's stdout was captured with a per-library breakdown (both were ad-hoc reruns outside the main rotation's logged pipeline, same gap as the SouthwestGeorgia-GA and LibCal-GA/WordPress-GA ad-hoc reruns below). Its `LIBRARIES` config now holds 9 systems (2 removed since the 2026-08-08 note): Fairfax County, Arlington, Prince William, Richmond, Norfolk, Roanoke, Suffolk, Williamsburg Regional, and the Library of Virginia. Recorded as one aggregate row with a note, not guessed at per-library.
- **SouthwestGeorgia-GA**: brand-new scraper (built today, per the task brief), 3 branches, all sharing one listing page (`https://swgrl.org/calendar.php`). Per-branch counts (141/29/47) were supplied directly rather than re-derived from stdout, since — like LibCal-VA2's second run — this ad-hoc invocation wasn't captured in `scraper-stdout.log` (it ran as a separate `🐝 FunHive Local Scraper Runner` process, visible only in `scraper-run-2026-08-09.log`'s aggregate line). Branch order confirmed against the scraper file's own `LIBRARIES` array.

| Library Website | State | Scraper | Events Found | Link |
|---|---|---|---|---|
| Lakeland Public Library | FL | LibCal-FL | 20 | [Link](https://lakelandpl.libcal.com/calendar?cid=2787&t=d&d=0000-00-00&cal=2787&inc=0) |
| Palm Beach County Library System | FL | LibCal-FL | 0 | [Link](https://pbclibrary.libcal.com/calendar?cid=-1&t=d) |
| St. Johns County Public Library | FL | LibCal-FL | 0 *(error/no count captured)* | [Link](https://sjcpls.libcal.com/calendar?cid=-1&t=d) |
| Seminole County Library | FL | LibCal-FL | 0 *(error/no count captured)* | [Link](https://seminolecountylibrary.libcal.com/calendar?cid=-1&t=d) |
| Marion County Public Library System | FL | LibCal-FL | 10 | [Link](https://mcpls.libcal.com/) |
| BCCLS - Bergen County Cooperative Library System | NJ | LibCal-NJ | 3005 | [Link](https://bccls.libcal.com/calendar/bccls/?cid=-1&t=m&d=0000-00-00&cal=-1&inc=0) |
| Montclair Public Library | NJ | LibCal-NJ | 20 | [Link](https://bccls.libcal.com/calendar/montclair?cid=10306&t=d&d=0000-00-00&cal=10306&inc=0) |
| Jersey City Free Public Library | NJ | LibCal-NJ | 20 | [Link](https://jclibrary.libcal.com/calendar?cid=-1&t=d) |
| Newark Public Library | NJ | LibCal-NJ | 20 | [Link](https://npl.libcal.com/calendar?cid=-1&t=d) |
| Monmouth County Library System | NJ | LibCal-NJ | 20 | [Link](https://monmouthcountylib.libcal.com/calendar?cid=-1&t=d) |
| Mercer County Library System | NJ | LibCal-NJ | 20 | [Link](https://events.mcl.org/) |
| Hunterdon County Library | NJ | LibCal-NJ | 48 | [Link](https://hclibrary.libcal.com/calendars) |
| Sussex County Library | NJ | LibCal-NJ | 10 | [Link](https://sussexcountylibrary.libcal.com/) |
| Union County Libraries | NJ | LibCal-NJ | 20 | [Link](https://unioncountylibraries.libcal.com/calendar/UCLSPrograms) |
| Charleston County Public Library | SC | LibCal-SC | 20 | [Link](https://ccplsc.libcal.com/calendar?cid=-1&t=d) |
| Berkeley County Library System | SC | LibCal-SC | 20 | [Link](https://berkeleylibrarysc.libcal.com/calendar?cid=-1&t=d) |
| South Carolina State Library | SC | LibCal-SC | 20 | [Link](https://statelibrary.sc.libcal.com/calendar/events?cid=-1&t=d) |
| Lexington County Public Library | SC | LibCal-SC | 10 | [Link](https://lexcolibrary.libcal.com/) |
| Dorchester County Library | SC | LibCal-SC | 10 | [Link](https://dorchesterlibrarysc.libcal.com/) |
| Arlington County Public Library | VA | LibCal-VA | 20 | [Link](https://arlingtonva.libcal.com/calendar?cid=-1&t=d&d=0000-00-00&cal=-1&inc=0) |
| Massanutten Regional Library | VA | LibCal-VA | 20 | [Link](https://mrlib.libcal.com/calendar?cid=22185&t=d&d=0000-00-00&cal=22185&inc=0) |
| Fairfax County Public Library | VA | LibCal-VA | 20 | [Link](https://librarycalendar.fairfaxcounty.gov/calendar?cid=6524&t=d&d=0000-00-00&cal=6524&inc=0) |
| Bangor Public Library | ME | LibCal-ME | 12 | [Link](https://bangorpubliclibrary.libcal.com/) |
| LibCal-VA2 (9 libraries — see note) | VA | LibCal-VA2 | 182 | [Link](https://www.fairfaxcounty.gov/library) |
| Miami-Dade Public Library | FL | Communico-FL | 1 | [Link](https://mdpls.org/events) |
| Broward County Library | FL | Communico-FL | 25 | [Link](https://broward.libnet.info/events) |
| Hillsborough County Public Library Cooperative | FL | Communico-FL | 646 | [Link](https://attend.hcplc.org/events) |
| Jacksonville Public Library | FL | Communico-FL | 492 | [Link](https://jaxpubliclibrary.libnet.info/events) |
| Pasco County Libraries | FL | Communico-FL | 275 | [Link](https://pascolibraries.libnet.info/events) |
| Martin County Library System | FL | Communico-FL | 5 | [Link](https://mcls.libnet.info/events) |
| Largo Public Library | FL | Communico-FL | 100 | [Link](https://largopubliclibrary.libnet.info/events) |
| Alachua County Library District | FL | Communico-FL | 7 | [Link](https://attend.aclib.us/events) |
| Hernando County Public Library | FL | Communico-FL | 105 | [Link](https://hernandocounty.librarycalendar.com/) |
| Huntington Public Library | NY | Communico-NY | 200 | [Link](https://myhpl.libnet.info/events) |
| Massapequa Public Library | NY | Communico-NY | 193 | [Link](https://massapequa.librarycalendar.com/events) |
| Patchogue-Medford Library | NY | Communico-NY | 139 | [Link](https://pmlib.libnet.info/events) |
| Poughkeepsie Public Library District | NY | Communico-NY | 24 | [Link](https://poughkeepsie.librarycalendar.com/events/list) |
| Reading Public Library | PA | Communico-PA | 33 | [Link](https://readingpl.libnet.info/events) |
| Boston Public Library | MA | BiblioCommons-MA | 490 | [Link](https://bpl.bibliocommons.com/v2/events) |
| Lawrence Public Library | MA | BiblioCommons-MA | 498 | [Link](https://lawrence.bibliocommons.com/v2/events) |
| Dorchester County Public Library | MD | Dorchester-County | 12 | [Link](https://www.dorchesterlibrary.org/calendar-of-events) |
| Wicomico Public Libraries | MD | Wicomico-Public | 17 | [Link](https://www.wicomicolibrary.org/events/upcoming) |
| Allentown Public Library | PA | Allentown-Public | 10 | [Link](https://www.allentownpl.org) |
| Hampton Public Library | VA | WithApps-Libraries | 42 | [Link](https://calendar.hampton.gov/hamptonva/calendar) |
| Washington County Public Library | VA | WordPress-Events-Calendar | 0 | [Link](https://www.wcpl.net/events/) |
| Wythe-Grayson Regional Library | VA | WordPress-Events-Calendar | 50 | [Link](https://wythegrayson.lib.va.us/calendar/) |
| Alleghany Highlands Regional Library | VA | WordPress-Events-Calendar | 2 | [Link](https://ahrlib.org/events/) |
| Galax-Carroll Regional Library | VA | WordPress-Events-Calendar | 50 | [Link](https://galaxcarroll.lib.va.us/events/) |
| Charlotte County Library | VA | WordPress-Events-Calendar | 50 | [Link](https://cclibrary.net/events/) |
| Halifax County-South Boston Library | VA | WordPress-Events-Calendar | 3 | [Link](https://halifaxlibrary.org/events/) |
| Blackwater Regional Library | VA | WordPress-Events-Calendar | 50 | [Link](https://blackwaterlib.org/events/) |
| Rappahannock County Library | VA | WordPress-Events-Calendar | 50 | [Link](https://rappahannocklibrary.org/events/) |
| Heritage Public Library | VA | WordPress-Events-Calendar | 0 | [Link](https://heritagepubliclibrary.org/events-programs/) |
| Bristol Public Library | VA | WordPress-Events-Calendar | 0 | [Link](https://bristolpubliclibrary.org/events/) |
| Pittsylvania County Public Library | VA | WordPress-Events-Calendar | 46 | [Link](https://pcplib.org/events/) |
| Carnegie Library of Pittsburgh | PA | WordPress-Events-Calendar | 0 | [Link](https://www.carnegielibrary.org/events/) |
| Osterhout Free Library | PA | WordPress-Events-Calendar | 24 | [Link](https://osterhout.info/events/) |
| Queen Anne's County Library | MD | Squarespace-Libraries | 74 | [Link](https://api3.libcal.com/embed_calendar.php?iid=3092&cal_id=13052&w=800&h=600&dv=month) |
| Handley Regional Library | VA | Drupal-Virginia | 23 | [Link](https://www.handleyregional.org/events/upcoming) |
| Camden County Library System | NJ | Intercept-Camden | 10 | [Link](https://events.camdencountylibrary.org/) |
| Free Library of Philadelphia | PA | WordPress-PA | 0 | [Link]() |
| Carnegie Library of Pittsburgh | PA | WordPress-PA | 12 | [Link]() |
| Albion Area Public Library | PA | WordPress-PA | 0 | [Link](https://www.albionlibrary.org/) |
| Allentown Public Library | PA | WordPress-PA | 0 | [Link](https://sites.google.com/) |
| Altoona Area Public Library | PA | WordPress-PA | 107 | [Link](https://www.altoonalibrary.org) |
| Ardmore Library | PA | WordPress-PA | 0 | [Link]() |
| Ashland Public Library | PA | WordPress-PA | 0 | [Link]() |
| Aston Public Library | PA | WordPress-PA | 0 | [Link](https://www.astonlibrary.org) |
| Spalding Memorial Library | PA | WordPress-PA | 33 | [Link](https://www.athenslibrary.org) |
| Avalon Public Library | PA | WordPress-PA | 0 | [Link](https://avalonlibrary.org/) |
| Avella Area Library Center | PA | WordPress-PA | 0 | [Link](https://www.avellalibrary.org) |
| Avonmore Public Library | PA | WordPress-PA | 0 | [Link](https://www.avonmorelibrary.org) |
| Bangor Public Library | PA | WordPress-PA | 0 | [Link](https://www.bangorlibrary.org) |
| Beaver County Bookmobile Schedule | PA | WordPress-PA | 4 | [Link](https://www.beaverfallslibrary.org) |
| Bedford County Library | PA | WordPress-PA | 0 | [Link](https://www.bedfordlibrary.org) |
| Belle Vernon Public Library | PA | WordPress-PA | 0 | [Link](https://www.bellevernonlibrary.org/) |
| Andrew Bayne Memorial Library | PA | WordPress-PA | 0 | [Link](https://www.bellevue.net/) |
| Bellwood Antis Public Library | PA | WordPress-PA | 10 | [Link](https://www.bellwoodlibrary.org) |
| Bernville Area Community Library | PA | WordPress-PA | 0 | [Link](https://www.bernvillelibrary.org) |
| Bethany Public Library | PA | WordPress-PA | 0 | [Link](https://bethanylibrary.org/) |
| Bethel-Tulpehocken Public Library | PA | WordPress-PA | 0 | [Link](https://www.bethellibrary.org) |
| Bethel Park Public Library | PA | WordPress-PA | 0 | [Link](https://www.bethelparklibrary.org/) |
| Bethlehem Area Public Library | PA | WordPress-PA | 0 | [Link](https://www.bethlehemlibrary.org) |
| Boyertown Community Library | PA | WordPress-PA | 0 | [Link](https://www.boyertownlibrary.org) |
| Bradford Area Public Library | PA | WordPress-PA | 0 | [Link](https://bradfordlibrary.org/) |
| Bridgeville Public Library | PA | WordPress-PA | 0 | [Link](https://bridgevillelibrary.org/) |
| Mengle Memorial Library | PA | WordPress-PA | 0 | [Link](https://www.brockwaylibrary.org) |
| Butler Area Public Library | PA | WordPress-PA | 1 | [Link](https://www.butlerlibrary.org) |
| Green Free Library | PA | WordPress-PA | 0 | [Link](https://www.cantonlibrary.org) |
| Carbondale Public Library | PA | WordPress-PA | 0 | [Link](https://carbondalelibrary.org/) |
| Bosler Free Library | PA | WordPress-PA | 0 | [Link](https://www.carlislelibrary.org) |
| Andrew Carnegie Free Library | PA | WordPress-PA | 12 | [Link](https://www.carnegielibrary.org) |
| Community Library Of Castle Shannon | PA | WordPress-PA | 0 | [Link](https://castleshannonlibrary.org/) |
| John K Tener Library | PA | WordPress-PA | 0 | [Link](https://www.charleroilibrary.org) |
| J. Lewis Crozer Library | PA | WordPress-PA | 0 | [Link](https://www.chesterlibrary.org/) |
| Chester Springs Library | PA | WordPress-PA | 0 | [Link](https://www.chesterspringslibrary.org/) |
| Moores Memorial Library | PA | WordPress-PA | 0 | [Link](https://www.christianalibrary.org) |
| Clairton Public Library | PA | WordPress-PA | 0 | [Link](https://clairtonlibrary.org/) |
| Claysburg Area Public Library Inc | PA | WordPress-PA | 0 | [Link](https://www.claysburglibrary.org) |
| Coatesville Area Public Library | PA | WordPress-PA | 0 | [Link](https://www.coatesvillelibrary.org) |
| Columbia Public Library | PA | WordPress-PA | 0 | [Link](https://www.columbialibrary.org) |
| Cooperstown Public Library | PA | WordPress-PA | 0 | [Link](https://www.cooperstownlibrary.org) |
| Coraopolis Memorial Library | PA | WordPress-PA | 0 | [Link](https://coraopolislibrary.org/) |
| Corry Public Library | PA | WordPress-PA | 5 | [Link](https://www.corrylibrary.org) |
| Coudersport Public Library | PA | WordPress-PA | 4 | [Link](https://www.coudersportlibrary.org) |
| Back Mountain Memorial Library | PA | WordPress-PA | 7 | [Link](https://www.dallaslibrary.org) |
| Dalton Community Library | PA | WordPress-PA | 25 | [Link](https://www.daltonlibrary.org) |
| Thomas Beaver Free Library | PA | WordPress-PA | 0 | [Link]() |
| Darby Library | PA | WordPress-PA | 4 | [Link](https://www.darbylibrary.org) |
| Delmont Public Library | PA | WordPress-PA | 0 | [Link](https://www.delmontlibrary.org) |
| Dover Area Community Library | PA | WordPress-PA | 0 | [Link](https://www.doverlibrary.org) |
| Downingtown Library Company | PA | WordPress-PA | 0 | [Link](https://downingtownlibrary.org/) |
| Dunbar Community Library | PA | WordPress-PA | 0 | [Link](https://www.dunbarlibrary.org) |
| East Berlin Community Library | PA | WordPress-PA | 1 | [Link](https://www.adamslibrary.org/) |
| Easton Area Public Library | PA | WordPress-PA | 0 | [Link](https://www.eastonlibrary.org/) |
| Ellwood City Area Pub Library | PA | WordPress-PA | 0 | [Link](https://www.ellwoodcitylibrary.org) |
| Emmaus Public Library | PA | WordPress-PA | 0 | [Link](https://www.emmauslibrary.org/) |
| Barbara Moscato Brown Memorial Library | PA | WordPress-PA | 0 | [Link](https://www.emporiumlibrary.org) |
| Erie County Public Library | PA | WordPress-PA | 0 | [Link](https://erielibrary.org/) |
| Evans City Public Library | PA | WordPress-PA | 0 | [Link](https://www.evanscitylibrary.org) |
| Everett Free Library | PA | WordPress-PA | 0 | [Link](https://www.everettlibrary.org) |
| Bucks County Free Library - Fallsington Library | PA | WordPress-PA | 0 | [Link](https://www.fallsingtonlibrary.org) |
| Fleetwood Area Public Library | PA | WordPress-PA | 0 | [Link](https://www.fleetwoodlibrary.org) |
| Borough Of Folcroft Public Library | PA | WordPress-PA | 0 | [Link](https://www.folcroftlibrary.org) |
| Foxburg Free Library Association | PA | WordPress-PA | 0 | [Link](https://www.foxburglibrary.org) |
| Franklin Public Library | PA | WordPress-PA | 0 | [Link](https://www.franklinlibrary.org) |
| Pequea Valley Public Library - Gap Branch | PA | WordPress-PA | 0 | [Link](https://www.gaplibrary.org) |
| Genesee Area Library | PA | WordPress-PA | 0 | [Link](https://www.geneseelibrary.org) |
| Arthur Hufnagel Public Library Of Glen Rock | PA | WordPress-PA | 0 | [Link]() |
| Glenolden Library | PA | WordPress-PA | 0 | [Link](https://www.glenoldenlibrary.org) |
| Greensburg Hempfield Area Library | PA | WordPress-PA | 0 | [Link](https://www.greensburglibrary.org) |
| Greenville Area Public Library | PA | WordPress-PA | 0 | [Link](https://www.greenvillelibrary.org) |
| Hamburg Public Library | PA | WordPress-PA | 0 | [Link](https://www.hamburglibrary.org/) |
| Salem Public Library | PA | WordPress-PA | 0 | [Link](https://www.hamlinlibrary.org/) |
| Guthrie Memorial Library - Hanovers Public Library | PA | WordPress-PA | 0 | [Link]() |
| Dauphin County Library System | PA | WordPress-PA | 0 | [Link](https://www.harrisburglibrary.org/) |
| Hastings Public Library | PA | WordPress-PA | 15 | [Link]() |
| Union Library Company Of Hatborough | PA | WordPress-PA | 0 | [Link](https://www.hatborolibrary.org) |
| Hawley Library | PA | WordPress-PA | 0 | [Link](https://www.hawleylibrary.org/) |
| Hazleton Area Public Library | PA | WordPress-PA | 0 | [Link](https://www.hazletonlibrary.org/) |
| Hellertown Area Library | PA | WordPress-PA | 0 | [Link](https://www.hellertownlibrary.org) |
| Hershey Public Library | PA | WordPress-PA | 0 | [Link](https://www.hersheylibrary.org/) |
| Hollidaysburg Area Public Library | PA | WordPress-PA | 0 | [Link](https://hollidaysburglibrary.org/) |
| Honey Brook Community Library | PA | WordPress-PA | 0 | [Link](https://www.honeybrooklibrary.org) |
| Horsham Township Library | PA | WordPress-PA | 0 | [Link](https://www.horshamlibrary.org/) |
| Chartiers-Houston Com Library | PA | WordPress-PA | 0 | [Link](https://www.houstonlibrary.org) |
| Hughesville Area Public Library | PA | WordPress-PA | 52 | [Link](https://www.hughesvillelibrary.org) |
| Huntingdon County Library | PA | WordPress-PA | 3 | [Link](https://www.huntingdonlibrary.org) |
| Hyde Park Public Library | PA | WordPress-PA | 41 | [Link](https://www.hydeparklibrary.org) |
| Hyndman-Londonderry Public Library | PA | WordPress-PA | 0 | [Link](https://www.hyndmanlibrary.org/) |
| Pequea Valley Public Library | PA | WordPress-PA | 3 | [Link](https://www.intercourselibrary.org) |
| Jefferson Hills Public Library | PA | WordPress-PA | 1 | [Link](https://www.jeffersonhillslibrary.org) |
| Jenkintown Library | PA | WordPress-PA | 2 | [Link](https://www.jenkintownlibrary.org) |
| Johnsonburg Public Library | PA | WordPress-PA | 0 | [Link](https://www.johnsonburglibrary.org/) |
| Hoyt Library | PA | WordPress-PA | 4 | [Link](https://www.kingstonlibrary.org) |
| Knox Public Library | PA | WordPress-PA | 0 | [Link]() |
| Louisa Gonser Community Library Inc | PA | WordPress-PA | 2 | [Link](https://www.berkslibraries.org/) |
| Northern Wayne Community Library | PA | WordPress-PA | 0 | [Link](https://lakewoodlibrary.org/) |
| Lancaster Public Library | PA | WordPress-PA | 0 | [Link]() |
| Lansdale Public Library | PA | WordPress-PA | 108 | [Link](https://www.lansdalelibrary.org) |
| Lansdowne Public Library | PA | WordPress-PA | 1 | [Link](https://lansdownelibrary.org/) |
| Adams Memorial Library | PA | WordPress-PA | 80 | [Link](https://www.latrobelibrary.org) |
| Lebanon Community Library | PA | WordPress-PA | 0 | [Link](https://lebanonlibrary.org/) |
| Mifflin County Library | PA | WordPress-PA | 0 | [Link](https://www.lewistownlibrary.org) |
| Ligonier Valley Library | PA | WordPress-PA | 10 | [Link](https://www.ligonierlibrary.org) |
| Lilly Washington Pub Library | PA | WordPress-PA | 0 | [Link](https://www.lillylibrary.org/) |
| Lititz Public Library | PA | WordPress-PA | 0 | [Link](https://www.lititzlibrary.org) |
| Malvern Public Library | PA | WordPress-PA | 0 | [Link](https://www.malvernlibrary.org) |
| Manheim Community Library | PA | WordPress-PA | 0 | [Link](https://www.manheimlibrary.org) |
| Mansfield Free Public Library | PA | WordPress-PA | 1 | [Link]() |
| Marienville Area Library | PA | WordPress-PA | 0 | [Link](https://www.marienvillelibrary.org) |
| Mars Area Public Library | PA | WordPress-PA | 0 | [Link](https://www.marslibrary.org) |
| Martinsburg Community Library | PA | WordPress-PA | 1 | [Link](https://www.martinsburglibrary.org) |
| Carnegie Library Of Mckeesport | PA | WordPress-PA | 0 | [Link](https://mckeesportlibrary.org/) |
| Meadville Public Library | PA | WordPress-PA | 0 | [Link](https://www.meadvillelibrary.org) |
| Joseph T. Simpson Public Library | PA | WordPress-PA | 0 | [Link](https://www.mechanicsburglibrary.org) |
| Francis J. Catania Law Library | PA | WordPress-PA | 0 | [Link](https://www.medialibrary.org) |
| Mercer Area Library | PA | WordPress-PA | 0 | [Link](https://www.mercerlibrary.org) |
| Meyersdale Public Library | PA | WordPress-PA | 0 | [Link](https://www.meyersdalelibrary.org/) |
| Middletown Public Library | PA | WordPress-PA | 0 | [Link](https://www.middletownlibrary.org) |
| Carnegie Library, Midland | PA | WordPress-PA | 0 | [Link](https://www.midlandlibrary.org) |
| Pike County Public Library - Dingman Township Branch | PA | WordPress-PA | 0 | [Link]() |
| Milton Public Library | PA | WordPress-PA | 0 | [Link]() |
| Minersville Public Library | PA | WordPress-PA | 0 | [Link](https://www.minersvillelibrary.org/) |
| Community College Of Beaver County | PA | WordPress-PA | 0 | [Link](https://www.monacalibrary.org/) |
| Monessen Public Library District Center | PA | WordPress-PA | 0 | [Link](https://www.monessenlibrary.org) |
| Monroeton Public Library | PA | WordPress-PA | 4 | [Link](https://www.monroetonlibrary.org) |
| Monroeville Public Library | PA | WordPress-PA | 0 | [Link](https://www.monroevillelibrary.org) |
| Montgomery Area Public Library | PA | WordPress-PA | 0 | [Link](https://www.montgomerylibrary.org) |
| Susquehanna County Historical Society Free Library Association | PA | WordPress-PA | 0 | [Link]() |
| South Fayette Township Library | PA | WordPress-PA | 0 | [Link](https://www.morganlibrary.org) |
| Mount Pleasant Free Public Library Association | PA | WordPress-PA | 0 | [Link](https://www.mountpleasantlibrary.org/) |
| Marian Sutherland Kirby Library | PA | WordPress-PA | 47 | [Link](https://mountaintoplibrary.org/) |
| Murrysville Community Library | PA | WordPress-PA | 0 | [Link](https://www.murrysvillelibrary.org) |
| Narberth Community Library | PA | WordPress-PA | 10 | [Link](https://www.narberthlibrary.org) |
| Memorial Library Of Nazareth Vicinity | PA | WordPress-PA | 5 | [Link](https://www.nazarethlibrary.org) |
| New Cumberland Public Library | PA | WordPress-PA | 0 | [Link](https://www.newcumberlandlibrary.org) |
| New Florence Community Library | PA | WordPress-PA | 45 | [Link](https://www.newflorencelibrary.org) |
| Pratt Memorial Library | PA | WordPress-PA | 1 | [Link](https://newmilfordlibrary.org/) |
| Newport Public Library | PA | WordPress-PA | 4 | [Link]() |
| North Versailles Public Library | PA | WordPress-PA | 0 | [Link](https://northversailleslibrary.org/) |
| North Wales Library | PA | WordPress-PA | 0 | [Link](https://www.northwaleslibrary.org) |
| Priestley Forsyth Memorial Library | PA | WordPress-PA | 0 | [Link](https://www.northumberlandlibrary.org/) |
| Norwood Public Library | PA | WordPress-PA | 0 | [Link](https://norwoodlibrary.org/) |
| Oakmont Carnegie Library | PA | WordPress-PA | 5 | [Link](https://oakmontlibrary.org/) |
| Oil City Library | PA | WordPress-PA | 0 | [Link](https://www.oilcitylibrary.org) |
| Orwigsburg Area Fr Pub Library | PA | WordPress-PA | 0 | [Link](https://www.orwigsburglibrary.org/) |
| Oxford Public Library | PA | WordPress-PA | 0 | [Link](https://oxfordlibrary.org/) |
| Parkesburg Free Library | PA | WordPress-PA | 1 | [Link](https://www.parkesburglibrary.org/) |
| Phoenixville Public Library | PA | WordPress-PA | 1 | [Link](https://phoenixvillelibrary.org/) |
| Bucks County Free Library - Pipersville Free Library | PA | WordPress-PA | 0 | [Link](https://pipersvillelibrary.org/) |
| Plymouth Public Library | PA | WordPress-PA | 0 | [Link]() |
| Portage Public Library | PA | WordPress-PA | 2 | [Link](https://www.portagelibrary.org) |
| Pottsville Free Public Library | PA | WordPress-PA | 12 | [Link](https://www.pottsvillelibrary.org) |
| Prospect Community Library | PA | WordPress-PA | 0 | [Link](https://www.prospectlibrary.org/) |
| Prospect Park Free Library | PA | WordPress-PA | 0 | [Link](https://prospectparklibrary.org/) |
| Punxsutawney Memorial Library | PA | WordPress-PA | 0 | [Link](https://www.punxsutawneylibrary.org) |
| Quarryville Library Center | PA | WordPress-PA | 0 | [Link](https://quarryvillelibrary.org/) |
| Ralston Link | PA | WordPress-PA | 0 | [Link](https://www.ralstonlibrary.org/) |
| Berks County Public Libraries | PA | WordPress-PA | 0 | [Link](https://www.readinglibrary.org) |
| Reynoldsville Public Library | PA | WordPress-PA | 0 | [Link](https://www.reynoldsvillelibrary.org) |
| Richland Community Library | PA | WordPress-PA | 0 | [Link](https://www.richlandlibrary.org/) |
| Ridgway Public Library | PA | WordPress-PA | 0 | [Link](https://www.ridgwaylibrary.org) |
| Ridley Park Public Library | PA | WordPress-PA | 0 | [Link](https://www.ridleyparklibrary.org) |
| Ringtown Area Library | PA | WordPress-PA | 0 | [Link](https://www.ringtownlibrary.org/) |
| Roaring Spring Comm Library | PA | WordPress-PA | 0 | [Link](https://www.roaringspringlibrary.org/) |
| Robesonia Community Library | PA | WordPress-PA | 0 | [Link](https://www.robesonialibrary.org) |
| Rochester Public Library | PA | WordPress-PA | 0 | [Link](https://www.rochesterlibrary.org/) |
| Saxonburg Area Library | PA | WordPress-PA | 0 | [Link](https://www.saxonburglibrary.org) |
| Saxton Community Library | PA | WordPress-PA | 0 | [Link](https://www.saxtonlibrary.org/) |
| Scottdale Public Library | PA | WordPress-PA | 0 | [Link](https://www.scottdalelibrary.org/) |
| Albright Memorial Library | PA | WordPress-PA | 0 | [Link](https://www.scrantonlibrary.org) |
| Sewickley Public Library | PA | WordPress-PA | 4 | [Link](https://www.sewickleylibrary.org) |
| Sheffield Township Library | PA | WordPress-PA | 0 | [Link](https://www.sheffieldlibrary.org/) |
| Shippensburg Public Library | PA | WordPress-PA | 0 | [Link](https://www.shippensburglibrary.org) |
| Paul Smith Library Of Southern York County | PA | WordPress-PA | 0 | [Link](https://www.shrewsburylibrary.org) |
| Sinking Spring Public Library | PA | WordPress-PA | 0 | [Link](https://www.sinkingspringlibrary.org) |
| Slatington Library Inc | PA | WordPress-PA | 0 | [Link](https://sites.google.com/) |
| Smithfield Library | PA | WordPress-PA | 0 | [Link](https://www.smithfieldlibrary.org/) |
| Mary S Biesecker Public Library | PA | WordPress-PA | 0 | [Link](https://www.somersetlibrary.org) |
| South Park Township Library | PA | WordPress-PA | 0 | [Link](https://southparklibrary.org/) |
| Bucks County Free Library - Southampton Free Library | PA | WordPress-PA | 4 | [Link]() |
| Spring City Free Public Library | PA | WordPress-PA | 0 | [Link](https://springcitylibrary.org/) |
| Springdale Free Public Library | PA | WordPress-PA | 0 | [Link](https://springdalelibrary.org/) |
| Springfield Township Library | PA | WordPress-PA | 1 | [Link](https://www.springfieldlibrary.org/) |
| Strasburg-Heisler Library | PA | WordPress-PA | 0 | [Link](https://www.strasburglibrary.org) |
| Summerville Public Library | PA | WordPress-PA | 0 | [Link](https://www.summervillelibrary.org) |
| Degenstein Community Library | PA | WordPress-PA | 4 | [Link](https://www.sunburylibrary.org) |
| Carnegie Free Library Of Swissvale | PA | WordPress-PA | 0 | [Link](https://swissvalelibrary.org/) |
| Sykesville Public Library | PA | WordPress-PA | 0 | [Link](https://www.sykesvillelibrary.org) |
| Taylor Community Library | PA | WordPress-PA | 13 | [Link](https://www.taylorlibrary.org) |
| Sarah S Bovard Memorial Library | PA | WordPress-PA | 0 | [Link](https://www.tionestalibrary.org/) |
| Towanda Public Library | PA | WordPress-PA | 5 | [Link](https://towandalibrary.org/) |
| Trafford Community Public Library | PA | WordPress-PA | 3 | [Link](https://www.traffordlibrary.org) |
| Allen F. Pierce Free Library | PA | WordPress-PA | 0 | [Link]() |
| Tunkhannock Public Library | PA | WordPress-PA | 0 | [Link](https://www.tunkhannocklibrary.org/) |
| Tyrone-Snyder Township Public Library | PA | WordPress-PA | 0 | [Link](https://www.tyronelibrary.org) |
| Helen Kate Furness Fr Library | PA | WordPress-PA | 0 | [Link]() |
| Warren Library Association | PA | WordPress-PA | 0 | [Link](https://www.warrenlibrary.org) |
| Waterford Public Library | PA | WordPress-PA | 0 | [Link](https://www.waterfordlibrary.org) |
| West Chester Public Library | PA | WordPress-PA | 0 | [Link](https://www.westchesterlibrary.org) |
| West Newton Public Library | PA | WordPress-PA | 4 | [Link](https://www.westnewtonlibrary.org) |
| West Pittston Library | PA | WordPress-PA | 0 | [Link](https://www.westpittstonlibrary.org) |
| Westfield Public Library | PA | WordPress-PA | 0 | [Link](https://www.westfieldlibrary.org) |
| Carnegie Library Of Mckeesport - White Oak | PA | WordPress-PA | 0 | [Link](https://www.whiteoaklibrary.org) |
| Wilcox Public Library | PA | WordPress-PA | 0 | [Link](https://www.wilcoxlibrary.org/) |
| Wilkinsburg Public Library | PA | WordPress-PA | 0 | [Link](https://wilkinsburglibrary.org/) |
| Windber Public Library Association | PA | WordPress-PA | 0 | [Link](https://www.windberlibrary.org) |
| Bucks County Free Library - Village Library Of Wrightstown | PA | WordPress-PA | 0 | [Link](https://wrightstownlibrary.org/) |
| Wyalusing Public Library | PA | WordPress-PA | 37 | [Link](https://www.wyalusinglibrary.org) |
| Yeadon Public Library | PA | WordPress-PA | 0 | [Link](https://www.yeadonlibrary.org) |
| Jefferson Resource Center And Computer Lab | PA | WordPress-PA | 0 | [Link](https://yorklibrary.org/) |
| Zelienople Public Library | PA | WordPress-PA | 33 | [Link](https://www.zelienoplelibrary.org) |
| Acton Memorial Library | MA | WordPress-MA | 1 | [Link](https://www.actonlibrary.org) |
| Adams Free Library | MA | WordPress-MA | 49 | [Link]() |
| Agawam Public Library | MA | WordPress-MA | 5 | [Link](https://www.agawamlibrary.org/) |
| Amesbury Public Library | MA | WordPress-MA | 0 | [Link](https://www.amesburylibrary.org) |
| Jones Library, Inc. | MA | WordPress-MA | 1 | [Link](https://www.amherstlibrary.org) |
| Memorial Hall Library | MA | WordPress-MA | 0 | [Link](https://www.andoverlibrary.org) |
| Aquinnah Public Library | MA | WordPress-MA | 3 | [Link](https://www.aquinnahlibrary.org) |
| Edith M. Fox Library | MA | WordPress-MA | 4 | [Link](https://www.arlingtonlibrary.org/) |
| Stevens Memorial Library | MA | WordPress-MA | 0 | [Link](https://www.ashburnhamlibrary.org) |
| Ashby Free Public Library | MA | WordPress-MA | 0 | [Link](https://www.ashbylibrary.org/) |
| Ashland Public Library | MA | WordPress-MA | 0 | [Link]() |
| Athol Public Library | MA | WordPress-MA | 0 | [Link](https://www.athollibrary.org/) |
| Attleboro Public Library | MA | WordPress-MA | 1 | [Link](https://www.attleborolibrary.org) |
| Auburn Free Public Library | MA | WordPress-MA | 0 | [Link](https://auburnlibrary.org/) |
| Auburndale Branch Library | MA | WordPress-MA | 23 | [Link](https://auburndalelibrary.org/) |
| Avon Public Library | MA | WordPress-MA | 0 | [Link]() |
| Ayer Public Library | MA | WordPress-MA | 1 | [Link](https://www.ayerlibrary.org) |
| Woods Memorial Library | MA | WordPress-MA | 1 | [Link](https://www.barrelibrary.org/) |
| Bedford Free Public Library | MA | WordPress-MA | 0 | [Link](https://www.bedfordlibrary.org) |
| Bellingham Public Library | MA | WordPress-MA | 0 | [Link](https://www.bellinghamlibrary.org) |
| Belmont Public Library | MA | WordPress-MA | 6 | [Link](https://smcl.org/) |
| Berkley Public Library | MA | WordPress-MA | 0 | [Link](https://sails.ent.sirsi.net/) |
| Berlin Public Library | MA | WordPress-MA | 11 | [Link]() |
| Beverly Farms Branch Library | MA | WordPress-MA | 0 | [Link]() |
| Billerica Public Library | MA | WordPress-MA | 0 | [Link](https://www.billericalibrary.org) |
| Blackstone Free Public Library | MA | WordPress-MA | 0 | [Link](https://www.blackstonelibrary.org) |
| Boston Public Library | MA | WordPress-MA | 0 | [Link]() |
| Jonathan Bourne Public Library | MA | WordPress-MA | 0 | [Link](https://www.bournelibrary.org) |
| Boxford Town Library | MA | WordPress-MA | 0 | [Link](https://www.boxfordlibrary.org/) |
| Boylston Public Library | MA | WordPress-MA | 0 | [Link](https://www.boylstonlibrary.org) |
| Brewster Ladies Library Assoc. | MA | WordPress-MA | 33 | [Link](https://brewsterlibrary.libcal.com/) |
| Brighton Branch Library | MA | WordPress-MA | 0 | [Link](https://www.brightonlibrary.org) |
| Brimfield Public Library | MA | WordPress-MA | 1 | [Link](https://www.brimfieldlibrary.org) |
| Merrick Public Library | MA | WordPress-MA | 134 | [Link]() |
| Brookline Public Library | MA | WordPress-MA | 0 | [Link](https://www.brooklinelibrary.org) |
| Burlington Public Library | MA | WordPress-MA | 40 | [Link]() |
| Cambridge Public Library | MA | WordPress-MA | 13 | [Link](https://www.cambridgelibrary.org) |
| Canton Public Library | MA | WordPress-MA | 1 | [Link](https://www.cantonlibrary.org) |
| Gleason Public Library | MA | WordPress-MA | 0 | [Link](https://www.carlislelibrary.org) |
| Carver Public Library | MA | WordPress-MA | 0 | [Link](https://www.carverlibrary.org/) |
| Centerville Public Library | MA | WordPress-MA | 139 | [Link](https://www.centervillelibrary.org) |
| Tyler Memorial Library | MA | WordPress-MA | 0 | [Link](https://www.charlemontlibrary.org) |
| Eldredge Public Library | MA | WordPress-MA | 188 | [Link](https://chathamlibrary.librarycalendar.com/) |
| Chelmsford Public Library | MA | WordPress-MA | 0 | [Link](https://www.chelmsfordlibrary.org/) |
| Chelsea Public Library | MA | WordPress-MA | 0 | [Link](https://www.chelsealibrary.org) |
| Cheshire Public Library | MA | WordPress-MA | 1 | [Link]() |
| Hamilton Memorial Library | MA | WordPress-MA | 0 | [Link](https://www.chesterlibrary.org/) |
| Chesterfield Public Library | MA | WordPress-MA | 1 | [Link](https://www.chesterfieldlibrary.org) |
| Aldenville Branch Library | MA | WordPress-MA | 3 | [Link](https://www.chicopeelibrary.org) |
| Chilmark Free Public Library | MA | WordPress-MA | 2 | [Link](https://www.chilmarklibrary.org) |
| Clarksburg Town Library | MA | WordPress-MA | 13 | [Link](https://www.clarksburglibrary.org) |
| Bigelow Free Public Library | MA | WordPress-MA | 0 | [Link](https://www.clintonlibrary.org) |
| Paul Pratt Memorial Library | MA | WordPress-MA | 0 | [Link](https://www.cohassetlibrary.org/) |
| Concord Free Public Library | MA | WordPress-MA | 1 | [Link](https://www.concordlibrary.org) |
| Cotuit Library | MA | WordPress-MA | 1 | [Link](https://www.cotuitlibrary.org/) |
| Dalton Free Public Library | MA | WordPress-MA | 28 | [Link](https://www.daltonlibrary.org) |
| Peabody Institute Library | MA | WordPress-MA | 1 | [Link](https://peabodylibrary.org/) |
| Dighton Public Library | MA | WordPress-MA | 0 | [Link](https://dightonlibrary.org/) |
| Adams Street Branch Library | MA | WordPress-MA | 1 | [Link]() |
| Simon Fairfield Public Library | MA | WordPress-MA | 1 | [Link](https://douglaslibrary.org/) |
| Dover Town Library | MA | WordPress-MA | 0 | [Link](https://www.doverlibrary.org) |
| Moses Greeley Parker Memorial Lib. | MA | WordPress-MA | 0 | [Link](https://www.dracutlibrary.org) |
| East Bridgewater Public Library | MA | WordPress-MA | 2 | [Link](https://www.eastbridgewaterlibrary.org) |
| Eastham Public Library | MA | WordPress-MA | 3 | [Link](https://easthamlibrary.org/) |
| Emily Williston Memorial Library | MA | WordPress-MA | 29 | [Link](https://www.easthamptonlibrary.org) |
| Five Corners Library | MA | WordPress-MA | 0 | [Link](https://www.eastonlibrary.org/) |
| Edgartown Free Public Library | MA | WordPress-MA | 0 | [Link](https://www.edgartownlibrary.org) |
| T.O.H.P. Burnham Free Library | MA | WordPress-MA | 2 | [Link](https://www.essexlibrary.org) |
| Parlin Memorial Library | MA | WordPress-MA | 0 | [Link]() |
| Millicent Library | MA | WordPress-MA | 1 | [Link](https://fairhavenlibrary.org/) |
| East End Branch Library | MA | WordPress-MA | 0 | [Link](https://www.fallriverlibrary.org) |
| Fitchburg Public Library | MA | WordPress-MA | 1 | [Link](http://fitchburgwi.gov/) |
| Lilly Library | MA | WordPress-MA | 76 | [Link](https://www.florencelibrary.org) |
| Framingham Public Library | MA | WordPress-MA | 89 | [Link](https://framinghamlibrary.org/) |
| Franklin Public Library | MA | WordPress-MA | 0 | [Link](https://www.franklinlibrary.org) |
| Levi Heywood Memorial Library | MA | WordPress-MA | 7 | [Link](https://www.gardnerlibrary.org/) |
| Gloucester Lyceum Sawyer Free Lib | MA | WordPress-MA | 0 | [Link](https://www.gloucesterlibrary.org) |
| Goshen Free Public Library | MA | WordPress-MA | 0 | [Link](https://www.goshenlibrary.org/) |
| Grafton Public Library | MA | WordPress-MA | 0 | [Link](https://www.graftonlibrary.org) |
| Granby Free Public Library | MA | WordPress-MA | 1 | [Link](https://granbylibrary.org/) |
| Granville Public Library | MA | WordPress-MA | 3 | [Link](https://www.granvillelibrary.org/) |
| Greenfield Public Library | MA | WordPress-MA | 3 | [Link]() |
| Holmes Public Library | MA | WordPress-MA | 2 | [Link]() |
| Taylor Memorial Library | MA | WordPress-MA | 4 | [Link](https://hancocklibrary.org/) |
| John Curtis Free Library | MA | WordPress-MA | 0 | [Link]() |
| Hanson Public Library | MA | WordPress-MA | 0 | [Link](https://hansonlibrary.org/) |
| Harvard Public Library | MA | WordPress-MA | 8 | [Link](https://www.harvardlibrary.org) |
| Harwich Port Library Assoc. | MA | WordPress-MA | 0 | [Link](https://www.harwichportlibrary.org) |
| Haverhill Public Library | MA | WordPress-MA | 0 | [Link](https://www.haverhilllibrary.org) |
| Heath Free Public Library | MA | WordPress-MA | 0 | [Link](https://www.heathlibrary.org) |
| Hingham Public Library | MA | WordPress-MA | 1 | [Link](https://www.hinghamlibrary.org/) |
| Holbrook Public Library | MA | WordPress-MA | 0 | [Link](https://holbrooklibrary.org/) |
| Holland Public Library | MA | WordPress-MA | 0 | [Link](https://www.hollandlibrary.org/) |
| Holliston Public Library | MA | WordPress-MA | 0 | [Link](https://hollistonlibrary.org/) |
| Holyoke Public Library | MA | WordPress-MA | 149 | [Link](https://holyokelibrary.org/) |
| Hopkinton Public Library | MA | WordPress-MA | 0 | [Link](https://hopkintonlibrary.org/) |
| Hubbardston Public Library | MA | WordPress-MA | 7 | [Link](http://hubbardston.blogspot.com/) |
| Hudson Public Library | MA | WordPress-MA | 1 | [Link](https://www.hudsonlibrary.org) |
| Huntington Public Library | MA | WordPress-MA | 0 | [Link](https://www.huntingtonlibrary.org) |
| Hyannis Public Library Assoc. | MA | WordPress-MA | 119 | [Link](https://www.hyannislibrary.org) |
| Hyde Park Branch Library | MA | WordPress-MA | 41 | [Link](https://www.hydeparklibrary.org) |
| Ipswich Public Library | MA | WordPress-MA | 0 | [Link](https://www.ipswichlibrary.org) |
| Kingston Public Library | MA | WordPress-MA | 10 | [Link](https://www.kingstonlibrary.org) |
| Lakeville Free Public Library | MA | WordPress-MA | 0 | [Link](https://lakevillelibrary.org/) |
| Thayer Memorial Library | MA | WordPress-MA | 0 | [Link]() |
| Lawrence Public Library | MA | WordPress-MA | 4 | [Link](https://lawrencelibrary.org/) |
| Leicester Public Library | MA | WordPress-MA | 0 | [Link](https://www.leicesterlibrary.org) |
| Lenox Library Association | MA | WordPress-MA | 0 | [Link](https://www.lenoxlibrary.org) |
| Leominster Public Library | MA | WordPress-MA | 0 | [Link](https://www.leominsterlibrary.org/) |
| Leverett Library | MA | WordPress-MA | 0 | [Link](https://www.leverettlibrary.org) |
| Cary Memorial Library | MA | WordPress-MA | 0 | [Link](https://www.lexingtonlibrary.org) |
| Lincoln Public Library | MA | WordPress-MA | 1 | [Link]() |
| Reuben Hoar Library | MA | WordPress-MA | 0 | [Link](https://www.littletonlibrary.org) |
| Richard Salter Storrs Library | MA | WordPress-MA | 0 | [Link](https://longmeadowlibrary.org/) |
| Pollard Memorial Library | MA | WordPress-MA | 0 | [Link](https://www.lowelllibrary.org) |
| Lunenburg Public Library | MA | WordPress-MA | 0 | [Link](https://lunenburglibrary.org/) |
| Lynnfield Public Library | MA | WordPress-MA | 0 | [Link](https://lynnfieldlibrary.org/) |
| Mansfield Public Library | MA | WordPress-MA | 1 | [Link]() |
| Elizabeth Taber Memorial Library | MA | WordPress-MA | 3 | [Link](https://www.marionlibrary.org/) |
| Ventress Memorial Library | MA | WordPress-MA | 0 | [Link](https://marshfieldlibrary.org/) |
| Mashpee Public Library | MA | WordPress-MA | 0 | [Link](https://mashpeepubliclibrary.org/) |
| Mattapoisett Public Library | MA | WordPress-MA | 0 | [Link](https://mattapoisettlibrary.org/) |
| Medfield Memorial Library | MA | WordPress-MA | 0 | [Link](https://www.medfieldlibrary.org) |
| Medford Public Library | MA | WordPress-MA | 0 | [Link](https://www.medfordlibrary.org) |
| Taft Public Library | MA | WordPress-MA | 15 | [Link](https://mendonlibrary.org/) |
| Merrimac Public Library | MA | WordPress-MA | 0 | [Link](https://merrimaclibrary.org/) |
| Middlefield Public Library | MA | WordPress-MA | 0 | [Link](https://middlefieldlibrary.org/) |
| Flint Public Library | MA | WordPress-MA | 0 | [Link](https://www.middletonlibrary.org/) |
| Milford Town Library | MA | WordPress-MA | 0 | [Link]() |
| Millbury Public Library | MA | WordPress-MA | 0 | [Link](https://www.millburylibrary.org/) |
| Millis Public Library | MA | WordPress-MA | 1 | [Link](https://www.millislibrary.org/) |
| Millville Free Public Library | MA | WordPress-MA | 11 | [Link](https://www.millvillelibrary.org) |
| East Milton Branch Library | MA | WordPress-MA | 0 | [Link](https://www.miltonlibrary.org) |
| Monterey Public Library | MA | WordPress-MA | 0 | [Link](https://www.montereylibrary.org) |
| Grace Hall Memorial Library | MA | WordPress-MA | 0 | [Link](https://www.montgomerylibrary.org) |
| Nahant Public Library | MA | WordPress-MA | 60 | [Link](https://www.nahantlibrary.org) |
| Nantucket Atheneum | MA | WordPress-MA | 0 | [Link](https://www.nantucketlibrary.org) |
| Needham Free Public Library | MA | WordPress-MA | 0 | [Link](https://www.needhamlibrary.org) |
| Casa Da Saudade | MA | WordPress-MA | 0 | [Link](https://www.newbedfordlibrary.org) |
| Andrews Branch Library | MA | WordPress-MA | 0 | [Link](https://www.newburyportlibrary.org) |
| Newton Free Library | MA | WordPress-MA | 0 | [Link](https://www.newtonlibrary.org) |
| Norfolk Public Library | MA | WordPress-MA | 9 | [Link]() |
| North Adams Public Library | MA | WordPress-MA | 1 | [Link](https://www.northadamslibrary.org) |
| Haston Free Public Library | MA | WordPress-MA | 0 | [Link](https://www.northbrookfieldlibrary.org) |
| Northborough Free Library | MA | WordPress-MA | 0 | [Link](https://www.northboroughlibrary.org) |
| Norton Public Library | MA | WordPress-MA | 44 | [Link](https://nortonlibrary.org/) |
| Morrill Memorial Library | MA | WordPress-MA | 1 | [Link](https://norwoodlibrary.org/) |
| Oak Bluffs Public Library | MA | WordPress-MA | 0 | [Link](https://www.oakbluffslibrary.org) |
| Oxford Free Public Library | MA | WordPress-MA | 0 | [Link](https://oxfordlibrary.org/) |
| Palmer Public Library | MA | WordPress-MA | 0 | [Link](https://www.palmerlibrary.org) |
| Richards Memorial Library | MA | WordPress-MA | 1 | [Link](https://paxtonflorida.com/) |
| Peabody Institute Library | MA | WordPress-MA | 1 | [Link](https://peabodylibrary.org/) |
| Pelham Library | MA | WordPress-MA | 81 | [Link]() |
| Pembroke Public Library | MA | WordPress-MA | 0 | [Link](https://www.pembrokelibrary.org/) |
| Peru Library | MA | WordPress-MA | 26 | [Link](https://www.perulibrary.org) |
| Petersham Memorial Library | MA | WordPress-MA | 0 | [Link](https://www.petershamlibrary.org) |
| Berkshire Athenaeum | MA | WordPress-MA | 5 | [Link](https://www.pittsfieldlibrary.org/) |
| Shaw Memorial Library | MA | WordPress-MA | 7 | [Link](https://www.plainfieldlibrary.org) |
| Plainville Public Library | MA | WordPress-MA | 0 | [Link](https://www.plainvillelibrary.org) |
| Plymouth Public Library | MA | WordPress-MA | 0 | [Link]() |
| Plympton Public Library | MA | WordPress-MA | 30 | [Link](https://plymptonpubliclibrary.org/) |
| Princeton Public Library | MA | WordPress-MA | 0 | [Link]() |
| Provincetown Public Library | MA | WordPress-MA | 34 | [Link](https://www.provincetownlibrary.org) |
| Adams Shore Branch Library | MA | WordPress-MA | 127 | [Link]() |
| Turner Free Library | MA | WordPress-MA | 0 | [Link]() |
| Reading Public Library | MA | WordPress-MA | 1 | [Link](https://www.readinglibrary.org) |
| Blanding Public Library | MA | WordPress-MA | 0 | [Link](https://www.rehobothlibrary.org) |
| Revere Public Library | MA | WordPress-MA | 1 | [Link](https://www.reverelibrary.org) |
| Richmond Free Public Library | MA | WordPress-MA | 0 | [Link]() |
| Joseph H. Plumb Memorial Library | MA | WordPress-MA | 0 | [Link](https://www.rochesterlibrary.org/) |
| Rockland Memorial Library | MA | WordPress-MA | 1 | [Link]() |
| Rockport Public Library | MA | WordPress-MA | 1 | [Link](https://www.rockportlibrary.org) |
| Rowley Public Library | MA | WordPress-MA | 0 | [Link](https://www.rowleylibrary.org/) |
| Dudley Branch Library | MA | WordPress-MA | 38 | [Link](https://www.roxburylibrary.org) |
| Phinehas S. Newton Library | MA | WordPress-MA | 0 | [Link](https://www.royalstonlibrary.org/) |
| Russell Public Library | MA | WordPress-MA | 1 | [Link](https://russelllibrary.org/) |
| Rutland Free Public Library | MA | WordPress-MA | 0 | [Link](https://www.rutlandlibrary.org) |
| Salem Public Library | MA | WordPress-MA | 0 | [Link](https://www.salemlibrary.org) |
| Salisbury Public Library | MA | WordPress-MA | 0 | [Link](https://www.salisburylibrary.org/) |
| Sandisfield Public Library | MA | WordPress-MA | 2 | [Link](https://www.sandisfieldlibrary.org) |
| Scituate Town Library | MA | WordPress-MA | 35 | [Link](https://www.scituatelibrary.org) |
| Seekonk Public Library | MA | WordPress-MA | 0 | [Link](https://www.seekonklibrary.org) |
| Bushnell-Sage Library | MA | WordPress-MA | 0 | [Link](https://www.sheffieldlibrary.org/) |
| Sherborn Library | MA | WordPress-MA | 0 | [Link](https://sherbornlibrary.org/) |
| Hazen Memorial Library | MA | WordPress-MA | 1 | [Link](https://www.shirleylibrary.org/) |
| Shrewsbury Free Public Library | MA | WordPress-MA | 0 | [Link](https://www.shrewsburylibrary.org) |
| Somerset Public Library | MA | WordPress-MA | 1 | [Link](https://www.somersetlibrary.org) |
| South Dennis Free Public Library | MA | WordPress-MA | 0 | [Link](https://www.southdennislibrary.org/) |
| Edwards Public Library | MA | WordPress-MA | 5 | [Link](https://www.southamptonlibrary.org) |
| Brightwood Branch Library | MA | WordPress-MA | 1 | [Link](https://www.springfieldlibrary.org/) |
| Conant Free Public Library | MA | WordPress-MA | 0 | [Link](https://sterlinglibrary.org/) |
| Stockbridge Library Association | MA | WordPress-MA | 14 | [Link](https://www.stockbridgelibrary.org) |
| Stoneham Public Library | MA | WordPress-MA | 4 | [Link](https://www.stonehamlibrary.org) |
| Stoughton Public Library | MA | WordPress-MA | 1 | [Link](https://www.stoughtonlibrary.org) |
| Joshua Hyde Public Library | MA | WordPress-MA | 78 | [Link](https://www.sturbridgelibrary.org) |
| Swampscott Public Library | MA | WordPress-MA | 1 | [Link](https://www.swampscottlibrary.org) |
| Swansea Free Public Library | MA | WordPress-MA | 0 | [Link](https://www.swansealibrary.org) |
| Taunton Public Library | MA | WordPress-MA | 0 | [Link](https://www.tauntonlibrary.org) |
| Boynton Public Library | MA | WordPress-MA | 0 | [Link](https://www.templetonlibrary.org) |
| Tewksbury Public Library | MA | WordPress-MA | 1 | [Link](https://www.tewksburylibrary.org) |
| Topsfield Town Library | MA | WordPress-MA | 0 | [Link](https://www.topsfieldlibrary.org) |
| Townsend Public Library | MA | WordPress-MA | 0 | [Link](https://www.townsendlibrary.org) |
| Upton Town Library | MA | WordPress-MA | 0 | [Link]() |
| Uxbridge Free Public Library | MA | WordPress-MA | 0 | [Link](https://uxbridgelibrary.org/) |
| Waban Branch Library | MA | WordPress-MA | 5 | [Link](https://www.wabanlibrary.org/) |
| Lucius Beebe Memorial Library | MA | WordPress-MA | 3 | [Link](https://wakefieldlibrary.org/) |
| Walpole Public Library | MA | WordPress-MA | 96 | [Link](https://www.walpolelibrary.org) |
| Young Mens Library Association | MA | WordPress-MA | 0 | [Link](https://warelibrary.org/) |
| Warren Public Library | MA | WordPress-MA | 0 | [Link](https://www.warrenlibrary.org) |
| Warwick Free Public Library | MA | WordPress-MA | 7 | [Link]() |
| East Branch Library | MA | WordPress-MA | 0 | [Link]() |
| Wayland Free Public Library | MA | WordPress-MA | 0 | [Link](https://www.waylandlibrary.org) |
| Chester C. Corbin Public Library | MA | WordPress-MA | 0 | [Link](https://www.websterlibrary.org) |
| Wellfleet Public Library | MA | WordPress-MA | 31 | [Link](https://www.wellfleetlibrary.org) |
| Merriam-Gilbert Public Library | MA | WordPress-MA | 0 | [Link](https://www.westbrookfieldlibrary.org/) |
| West Dennis Free Public Library | MA | WordPress-MA | 0 | [Link](https://www.westdennislibrary.org/) |
| West Falmouth Library, Inc. | MA | WordPress-MA | 13 | [Link](https://www.westfalmouthlibrary.org) |
| G. A. R. Memorial Library | MA | WordPress-MA | 0 | [Link](https://westnewburylibrary.org/) |
| Westborough Public Library | MA | WordPress-MA | 8 | [Link](https://www.westboroughlibrary.org/) |
| Westfield Athenaeum | MA | WordPress-MA | 1 | [Link](https://www.westfieldlibrary.org) |
| J. V. Fletcher Library | MA | WordPress-MA | 1 | [Link](https://www.westfordlibrary.org) |
| Westhampton Memorial Library | MA | WordPress-MA | 0 | [Link](https://www.westhamptonlibrary.org) |
| Forbush Memorial Library | MA | WordPress-MA | 0 | [Link](https://www.westminsterlibrary.org) |
| Weston Public Library | MA | WordPress-MA | 5 | [Link](https://www.westonlibrary.org) |
| Westport Free Public Library | MA | WordPress-MA | 23 | [Link](https://www.westportlibrary.org) |
| Islington Branch Library | MA | WordPress-MA | 0 | [Link](https://www.westwoodlibrary.org) |
| Whitinsville Social Library | MA | WordPress-MA | 0 | [Link](https://www.whitinsvillelibrary.org) |
| Wilbraham Public Library | MA | WordPress-MA | 0 | [Link](https://www.wilbrahamlibrary.org) |
| David Joyce Milne Public Library | MA | WordPress-MA | 0 | [Link](https://www.williamstownlibrary.org) |
| Wilmington Memorial Library | MA | WordPress-MA | 3 | [Link](https://www.wilmingtonlibrary.org) |
| Beals Memorial Library | MA | WordPress-MA | 0 | [Link](https://winchendonlibrary.org/) |
| Winchester Public Library | MA | WordPress-MA | 0 | [Link](https://www.winchesterlibrary.org) |
| Windsor Free Public Library | MA | WordPress-MA | 0 | [Link](https://www.windsorlibrary.org) |
| Winthrop Public Library | MA | WordPress-MA | 0 | [Link]() |
| Frances Perkins Branch Library At Greendale | MA | WordPress-MA | 1 | [Link](https://www.worcesterlibrary.org) |
| Louisville Free Public Library | KY | WordPress-KY | 22 | [Link](https://www.lfpl.org) |
| Lexington Public Library | KY | WordPress-KY | 4 | [Link](https://www.lexpublib.org) |
| Kenton County Public Library | KY | WordPress-KY | 30 | [Link](https://www.kentonlibrary.org) |
| Campbell County Public Library | KY | WordPress-KY | 3 | [Link](https://www.cc-pl.org) |
| Boone County Public Library | KY | WordPress-KY | 3 | [Link](https://www.bcpl.org) |
| Warren County Public Library | KY | WordPress-KY | 10 | [Link](https://www.warrenpl.org) |
| Daviess County Public Library | KY | WordPress-KY | 15 | [Link](https://www.dcplibrary.org) |
| McCracken County Public Library | KY | WordPress-KY | 68 | [Link](https://www.mclib.net) |
| Hardin County Public Library | KY | WordPress-KY | 0 | [Link](https://www.hcpl.info) |
| Madison County Public Library | KY | WordPress-KY | 0 | [Link](https://www.madisoncountylibrary.org) |
| Oldham County Public Library | KY | WordPress-KY | 18 | [Link](https://www.crestwoodlibrary.org/) |
| Bullitt County Public Library | KY | WordPress-KY | 0 | [Link](https://bcplibrary.org/) |
| Jessamine County Public Library | KY | WordPress-KY | 0 | [Link](https://www.jesspublib.org) |
| Scott County Public Library | KY | WordPress-KY | 1 | [Link](https://scottpublib.org/) |
| Clark County Public Library | KY | WordPress-KY | 0 | [Link](https://www.clarkbooks.org) |
| Laurel County Public Library | KY | WordPress-KY | 21 | [Link](https://www.laurellibrary.org) |
| Christian County Public Library | KY | WordPress-KY | 1 | [Link](https://www.christiancountylibrary.org) |
| Pike County Public Library | KY | WordPress-KY | 0 | [Link](https://www.pikelibrary.org) |
| Greenup County Public Library | KY | WordPress-KY | 0 | [Link](https://www.greenuplibrary.org) |
| Franklin County Public Library | KY | WordPress-KY | 0 | [Link]() |
| Henderson County Public Library | KY | WordPress-KY | 99 | [Link](https://www.hcpl.org) |
| Graves County Public Library | KY | WordPress-KY | 106 | [Link](https://www.graveslibrary.org) |
| Calloway County Public Library | KY | WordPress-KY | 0 | [Link](https://www.callowaycountylibrary.org) |
| Woodford County Library | KY | WordPress-KY | 0 | [Link](https://www.woodfordlibrary.org) |
| Rowan County Public Library | KY | WordPress-KY | 85 | [Link](https://www.rowancountylibrary.org) |
| Montgomery County Public Library | KY | WordPress-KY | 0 | [Link](https://www.mcplib.org) |
| Grant County Public Library | KY | WordPress-KY | 0 | [Link](https://www.grantlibrary.net/) |
| Marshall County Public Library | KY | WordPress-KY | 1 | [Link]() |
| Whitley County Public Library | KY | WordPress-KY | 0 | [Link](https://www.whitleylibrary.org) |
| Floyd County Public Library | KY | WordPress-KY | 1 | [Link](https://floydlibrary.org/) |
| Knox County Public Library | KY | WordPress-KY | 0 | [Link]() |
| Auburn Branch | KY | WordPress-KY | 0 | [Link](https://auburnlibrary.org/) |
| Trimble County Public Library | KY | WordPress-KY | 0 | [Link](https://www.bedfordlibrary.org) |
| Bracken County Public Library | KY | WordPress-KY | 29 | [Link]() |
| Nicholas County Public Library | KY | WordPress-KY | 0 | [Link](https://www.carlislelibrary.org) |
| Hickman County Memorial Library | KY | WordPress-KY | 0 | [Link](https://www.clintonlibrary.org) |
| Adair County Public Library | KY | WordPress-KY | 0 | [Link](https://www.columbialibrary.org) |
| South Branch | KY | WordPress-KY | 10 | [Link](https://corbinlibrary.org/) |
| Oldham County Public Library | KY | WordPress-KY | 1 | [Link](https://www.crestwoodlibrary.org/) |
| Rebecca Caudill Public Library | KY | WordPress-KY | 2 | [Link](https://www.cumberlandlibrary.org) |
| Cynthiana-Harrison County Public Library | KY | WordPress-KY | 0 | [Link](https://www.cynthianalibrary.org/) |
| Boyle County Public Library | KY | WordPress-KY | 0 | [Link]() |
| Florence Branch | KY | WordPress-KY | 57 | [Link](https://www.florencelibrary.org) |
| Goodnight Memorial Library | KY | WordPress-KY | 0 | [Link](https://www.franklinlibrary.org) |
| Fulton Public Library | KY | WordPress-KY | 0 | [Link](https://www.facebook.com/) |
| Mary Wood Weldon Memorial Public Library | KY | WordPress-KY | 0 | [Link](https://www.glasgowlibrary.org/) |
| Mahan-Oldham County Library | KY | WordPress-KY | 0 | [Link](https://www.goshenlibrary.org/) |
| Green County Public Library | KY | WordPress-KY | 0 | [Link](https://www.greensburglibrary.org) |
| Harlan County Public Library | KY | WordPress-KY | 0 | [Link](https://www.harlanlibrary.org) |
| Ohio County Public Library | KY | WordPress-KY | 0 | [Link](https://www.hartfordlibrary.org) |
| Perry County Public Library | KY | WordPress-KY | 8 | [Link](https://www.hazardlibrary.org/) |
| Lents Branch | KY | WordPress-KY | 0 | [Link](https://www.hebronlibrary.org) |
| Estill County Public Library | KY | WordPress-KY | 0 | [Link](https://www.irvinelibrary.org) |
| Irvington Branch | KY | WordPress-KY | 0 | [Link](https://irvingtonlibrary.org/) |
| Russell County Public Library District | KY | WordPress-KY | 1 | [Link]() |
| Garrard County Public Library | KY | WordPress-KY | 0 | [Link]() |
| Marion County Public Library | KY | WordPress-KY | 0 | [Link](https://lebanonlibrary.org/) |
| Casey County Public Library | KY | WordPress-KY | 0 | [Link](https://libertylibrary.org/) |
| Clay County Public Library | KY | WordPress-KY | 0 | [Link]() |
| Crittenden County Public Library | KY | WordPress-KY | 2 | [Link](https://www.marionlibrary.org/) |
| Mason County Public Library | KY | WordPress-KY | 0 | [Link](https://www.maysvillelibrary.org) |
| Wayne County Public Library | KY | WordPress-KY | 1 | [Link](https://www.allertonpubliclibrary.org/) |
| Newport Branch | KY | WordPress-KY | 5 | [Link]() |
| Phelps Branch | KY | WordPress-KY | 0 | [Link]() |
| George Coon Public Library | KY | WordPress-KY | 0 | [Link]() |
| Allen County Public Library | KY | WordPress-KY | 0 | [Link](https://www.scottsvillelibrary.org) |
| Washington County Public Library | KY | WordPress-KY | 1 | [Link](https://www.springfieldlibrary.org/) |
| Sturgis Branch | KY | WordPress-KY | 94 | [Link]() |
| Gallatin County Public Library | KY | WordPress-KY | 11 | [Link](https://www.warsawlibrary.org/) |
| Abbeville County Library System | SC | WordPress-SC | 7 | [Link](https://www.abbevillelibrary.org/) |
| Allendale County Library | SC | WordPress-SC | 76 | [Link]() |
| Anderson County Library | SC | WordPress-SC | 109 | [Link](https://www.andersonlibrary.org) |
| Kershaw County Library - Camden Branch Library | SC | WordPress-SC | 0 | [Link](https://www.camdenlibrary.org/) |
| Pickens County Library - Central-Clemson Branch Library | SC | WordPress-SC | 0 | [Link](https://www.centrallibrary.org) |
| Lexington County Library - Chapin | SC | WordPress-SC | 3 | [Link](https://www.chapinlibrary.org) |
| Berkeley County Library - Daniel Island | SC | WordPress-SC | 1 | [Link]() |
| Chester County Library | SC | WordPress-SC | 0 | [Link](https://www.chesterlibrary.org/) |
| Chesterfield County Library System | SC | WordPress-SC | 1 | [Link](https://www.chesterfieldlibrary.org) |
| Clinton Public Library | SC | WordPress-SC | 0 | [Link](https://www.clintonlibrary.org) |
| Lexington County Library - Irmo | SC | WordPress-SC | 0 | [Link](https://www.columbialibrary.org) |
| Dillon County Library System | SC | WordPress-SC | 1 | [Link](https://www.dillonlibrary.org/) |
| Kershaw County Library - Elgin Branch Library | SC | WordPress-SC | 0 | [Link](https://www.elginlibrary.org/) |
| Hampton County Library - Estill Branch Library | SC | WordPress-SC | 0 | [Link](https://www.estilllibrary.org) |
| Florence County Library System | SC | WordPress-SC | 76 | [Link](https://www.florencelibrary.org) |
| Lexington County Library - Gaston | SC | WordPress-SC | 0 | [Link](https://www.gastonlibrary.org/) |
| Lexington County Library - Gilbert-Summit | SC | WordPress-SC | 0 | [Link](https://www.gilbertlibrary.org/) |
| Great Falls Library | SC | WordPress-SC | 138 | [Link](https://www.greatfallslibrary.org) |
| Greenville County Library - Anderson Road (West) Branch | SC | WordPress-SC | 13 | [Link](https://www.greenvillelibrary.org) |
| Greenwood County Library System | SC | WordPress-SC | 0 | [Link]() |
| Edgefield County Public Library - Johnston Branch (Mobley Library) | SC | WordPress-SC | 0 | [Link](https://www.johnstonlibrary.org) |
| Lake View Library | SC | WordPress-SC | 1 | [Link](https://lakeviewlibrary.org/) |
| Lamar District Library | SC | WordPress-SC | 0 | [Link](https://www.lamarlibrary.org) |
| Lancaster County Library System | SC | WordPress-SC | 0 | [Link]() |
| Aiken County Library - Midland Valley Branch Library | SC | WordPress-SC | 1 | [Link](https://www.langleylibrary.org) |
| Lexington County Public Library System - Main | SC | WordPress-SC | 0 | [Link](https://www.lexingtonlibrary.org) |
| Pickens County Library - Sarlin Branch Library | SC | WordPress-SC | 0 | [Link](https://libertylibrary.org/) |
| Horry County Memorial Library - Loris Library | SC | WordPress-SC | 0 | [Link](https://www.lorislibrary.org/) |
| Spartanburg County Public Library - Middle Tyger Branch Library | SC | WordPress-SC | 1 | [Link]() |
| Marion County Library System | SC | WordPress-SC | 3 | [Link](https://www.marionlibrary.org/) |
| Mccormick County Library System | SC | WordPress-SC | 3 | [Link](https://mccormicklibrary.org/) |
| Hal Kohn Memorial Library | SC | WordPress-SC | 0 | [Link](https://www.newberrylibrary.org) |
| Orangeburg County Library Commission | SC | WordPress-SC | 9 | [Link](https://orangeburglibrary.org/) |
| Anderson County Library - Piedmont Branch Library | SC | WordPress-SC | 0 | [Link](https://www.piedmontlibrary.org) |
| Oconee County Public Library - Salem Branch Library | SC | WordPress-SC | 0 | [Link](https://www.salemlibrary.org) |
| Saluda County Library System | SC | WordPress-SC | 73 | [Link](https://www.saludalibrary.org) |
| Oconee County Public Library - Seneca Branch Library | SC | WordPress-SC | 0 | [Link](https://www.senecalibrary.org) |
| Spartanburg County Public Library - H. Carlisle Bean Law Library | SC | WordPress-SC | 0 | [Link](https://www.spartanburglibrary.org) |
| Orangeburg County Library - Springfield Branch Library | SC | WordPress-SC | 1 | [Link](https://www.springfieldlibrary.org/) |
| Berkeley County Library - Sangaree Library | SC | WordPress-SC | 0 | [Link](https://www.summervillelibrary.org) |
| Lexington County Library - Swansea | SC | WordPress-SC | 0 | [Link](https://www.swansealibrary.org) |
| Union County Library System | SC | WordPress-SC | 4 | [Link](https://www.unionlibrary.org) |
| Oconee County Public Library - Westminster Branch Library | SC | WordPress-SC | 0 | [Link](https://www.westminsterlibrary.org) |
| York Public Library | SC | WordPress-SC | 0 | [Link](https://yorklibrary.org/) |
| Kanawha County Public Library | WV | WordPress-WV | 24 | [Link](https://www.kcpls.org/) |
| Ohio County Public Library | WV | WordPress-WV | 0 | [Link](https://www.ohiocountylibrary.org/) |
| Berkeley County Public Library | WV | WordPress-WV | 0 | [Link](https://bcpls.org/) |
| Harrison County Public Library | WV | WordPress-WV | 15 | [Link](https://www.clarksburglibrary.org) |
| Marion County Public Library | WV | WordPress-WV | 0 | [Link](https://www.marioncountylibrary.org/) |
| Mercer County Public Library | WV | WordPress-WV | 1 | [Link](https://www.mercercountylibrary.org/) |
| Putnam County Public Library | WV | WordPress-WV | 0 | [Link](https://putnamcountylibrary.org/) |
| Marshall County Public Library | WV | WordPress-WV | 3 | [Link]() |
| East Hardy Branch Public Library | WV | WordPress-WV | 0 | [Link](https://www.bakerlibrary.org/) |
| Barrett-Wharton Public Library | WV | WordPress-WV | 105 | [Link](https://www.barrettlibrary.org) |
| Bridgeport Public Library | WV | WordPress-WV | 21 | [Link](https://www.bridgeportlibrary.org/) |
| Burlington Public Library | WV | WordPress-WV | 45 | [Link]() |
| Cameron Public Library | WV | WordPress-WV | 0 | [Link](https://www.cameronlibrary.org/) |
| Center Point Public Library | WV | WordPress-WV | 9 | [Link](https://www.centerpointlibrary.org) |
| Lynn Murray Memorial Library | WV | WordPress-WV | 0 | [Link](https://www.chesterlibrary.org/) |
| Clay County Public Library | WV | WordPress-WV | 2 | [Link](https://www.claylibrary.org/) |
| Sand Hill Public Library | WV | WordPress-WV | 448 | [Link](https://www.dallaslibrary.org) |
| Dunbar Branch Library | WV | WordPress-WV | 1 | [Link](https://www.dunbarlibrary.org) |
| Fairview Public Library | WV | WordPress-WV | 0 | [Link]() |
| Pendleton County Public Library | WV | WordPress-WV | 3 | [Link](https://www.franklinlibrary.org) |
| Gilbert Public Library | WV | WordPress-WV | 0 | [Link](https://www.gilbertlibrary.org/) |
| Glasgow Branch Library | WV | WordPress-WV | 0 | [Link](https://www.glasgowlibrary.org/) |
| Taylor County Public Library | WV | WordPress-WV | 0 | [Link]() |
| Hamlin-Lincoln County Public Library | WV | WordPress-WV | 0 | [Link](https://www.hamlinlibrary.org/) |
| Hanover Public Library | WV | WordPress-WV | 0 | [Link]() |
| Hillsboro Public Library | WV | WordPress-WV | 1 | [Link](https://www.hillsborolibrary.org) |
| Summers County Public Library | WV | WordPress-WV | 44 | [Link](https://www.hintonlibrary.org) |
| Boone-Madison Public Library | WV | WordPress-WV | 9 | [Link](https://www.madisonlibrary.org) |
| Milton Branch Library | WV | WordPress-WV | 0 | [Link]() |
| Montgomery Public Library | WV | WordPress-WV | 0 | [Link](https://www.montgomerylibrary.org) |
| Swaney Memorial Library | WV | WordPress-WV | 0 | [Link](https://www.newcumberlandlibrary.org) |
| Paden City Public Library | WV | WordPress-WV | 2 | [Link](https://www.padencitylibrary.org/) |
| Paw Paw Public Library | WV | WordPress-WV | 1 | [Link](https://www.pawpawlibrary.org) |
| Piedmont Public Library | WV | WordPress-WV | 0 | [Link](https://www.piedmontlibrary.org) |
| Richwood Public Library | WV | WordPress-WV | 0 | [Link](https://www.richwoodlibrary.org) |
| Jackson County Public Library | WV | WordPress-WV | 9 | [Link](https://ripleylibrary.org/) |
| Ronceverte Public Library | WV | WordPress-WV | 0 | [Link](https://www.roncevertelibrary.org/) |
| South Charleston Public Library | WV | WordPress-WV | 9 | [Link](https://www.scplwv.org/) |
| Pleasants County Public Library | WV | WordPress-WV | 0 | [Link](https://www.stmaryslibrary.org) |
| Monroe County Public Library | WV | WordPress-WV | 20 | [Link](https://www.unionlibrary.org) |
| Waverly Library | WV | WordPress-WV | 2 | [Link](https://www.waverlylibrary.com/) |
| Louis Bennett Public Library | WV | WordPress-WV | 0 | [Link]() |
| Whitesville Public Library | WV | WordPress-WV | 12 | [Link](https://www.whitesvillelibrary.org) |
| Williamson Public Library | WV | WordPress-WV | 0 | [Link]() |
| Williamstown Library | WV | WordPress-WV | 84 | [Link](https://www.williamstownlibrary.org) |
| Wilmington Public Library | DE | WordPress-DE | 0 | [Link](https://www.wilmingtonde.gov/library) |
| Newark Free Library | DE | WordPress-DE | 0 | [Link](https://www.nccde.org/newark) |
| Bear Library | DE | WordPress-DE | 0 | [Link](https://www.nccde.org/bear) |
| Kirkwood Library | DE | WordPress-DE | 0 | [Link](https://www.nccde.org/kirkwood) |
| Claymont Library | DE | WordPress-DE | 0 | [Link](https://www.nccde.org/claymont) |
| Elsmere Library | DE | WordPress-DE | 0 | [Link](https://www.nccde.org/elsmere) |
| Hockessin Library | DE | WordPress-DE | 0 | [Link](https://www.nccde.org/hockessin) |
| Garfield Park Library | DE | WordPress-DE | 0 | [Link](https://www.nccde.org/garfield) |
| Brandywine Hundred Library | DE | WordPress-DE | 0 | [Link](https://www.nccde.org/brandywine) |
| Woodlawn Library | DE | WordPress-DE | 0 | [Link](https://www.nccde.org/woodlawn) |
| Dover Public Library | DE | WordPress-DE | 0 | [Link](https://www.doverpubliclibrary.org) |
| Kent County Library | DE | WordPress-DE | 0 | [Link](https://www.kentcountyde.gov/library) |
| Georgetown Public Library | DE | WordPress-DE | 0 | [Link](https://www.georgetownpubliclibrary.org) |
| Lewes Public Library | DE | WordPress-DE | 0 | [Link](https://www.leweslibrary.org) |
| Rehoboth Beach Public Library | DE | WordPress-DE | 192 | [Link](https://www.rehobothbeachde.gov/library) |
| Seaford District Library | DE | WordPress-DE | 0 | [Link]() |
| Bridgeville Public Library | DE | WordPress-DE | 0 | [Link](https://bridgevillelibrary.org/) |
| Laurel Public Library | DE | WordPress-DE | 37 | [Link](https://www.laurellibrary.org) |
| Milton Public Library | DE | WordPress-DE | 0 | [Link]() |
| Frankford Public Library | DE | WordPress-DE | 0 | [Link](https://www.frankfordlibrary.org) |
| Greenwood Public Library | DE | WordPress-DE | 4 | [Link]() |
| Appoquinimink Public Library | DE | WordPress-DE | 0 | [Link](https://www.nccde.org/appoquinimink) |
| Rogers Free Library | RI | WordPress-RI | 0 | [Link](https://rogersfreelibrary.org/) |
| Central Falls Free Public Library | RI | WordPress-RI | 0 | [Link](https://www.centralfallslibrary.org) |
| Coventry Public Library | RI | WordPress-RI | 2 | [Link](https://www.coventrylibrary.org/) |
| East Greenwich Free Library | RI | WordPress-RI | 1 | [Link](https://www.eastgreenwichlibrary.org) |
| Exeter Public Library | RI | WordPress-RI | 0 | [Link](https://www.exeterlibrary.org) |
| Harmony Library | RI | WordPress-RI | 0 | [Link](https://www.harmonylibrary.org) |
| Greene Public Library | RI | WordPress-RI | 0 | [Link](https://www.greenelibrary.org) |
| Ashaway Free Library | RI | WordPress-RI | 0 | [Link](https://www.ashawaylibrary.org) |
| Langworthy Public Library | RI | WordPress-RI | 0 | [Link](https://www.langworthylibrary.org) |
| Jamestown Philomenian Library | RI | WordPress-RI | 1 | [Link]() |
| Marian J. Mohr Memorial Library | RI | WordPress-RI | 0 | [Link](https://www.mohrlibrary.org/) |
| Lincoln Public Library | RI | WordPress-RI | 1 | [Link]() |
| Brownell Library, Home Of Little Compton | RI | WordPress-RI | 173 | [Link](https://www.brownelllibrary.org) |
| Middletown Public Library | RI | WordPress-RI | 0 | [Link](https://www.middletownlibrary.org) |
| Island Free Library | RI | WordPress-RI | 0 | [Link](https://www.islandfreelibrary.org) |
| Pascoag Free Public Library | RI | WordPress-RI | 10 | [Link](https://www.pascoaglibrary.org/) |
| Portsmouth Free Public Library | RI | WordPress-RI | 0 | [Link](https://www.portsmouthlibrary.org/) |
| Fox Point Library | RI | WordPress-RI | 1 | [Link](https://provlib.org/) |
| Knight Memorial Library | RI | WordPress-RI | 1 | [Link](https://provlib.org/) |
| Mount Pleasant Library | RI | WordPress-RI | 1 | [Link](https://provlib.org/) |
| Olneyville Library | RI | WordPress-RI | 1 | [Link](https://provlib.org/) |
| Providence Public Library | RI | WordPress-RI | 1 | [Link](https://provlib.org/) |
| Rochambeau Library | RI | WordPress-RI | 1 | [Link](https://provlib.org/) |
| Smith Hill Library | RI | WordPress-RI | 1 | [Link](https://provlib.org/) |
| South Providence Library | RI | WordPress-RI | 1 | [Link](https://provlib.org/) |
| Wanskuck Library | RI | WordPress-RI | 1 | [Link](https://provlib.org/) |
| Washington Park Library | RI | WordPress-RI | 1 | [Link](https://provlib.org/) |
| Clark Memorial Library | RI | WordPress-RI | 0 | [Link]() |
| Rumford Branch | RI | WordPress-RI | 0 | [Link](https://eastprovidencelibrary.org/) |
| Hope Library | RI | WordPress-RI | 0 | [Link]() |
| North Smithfield Public Library | RI | WordPress-RI | 0 | [Link](https://www.northsmithfieldlibrary.org) |
| Greenville Public Library | RI | WordPress-RI | 269 | [Link](https://www.greenvillelibrary.org) |
| Essex Public Library | RI | WordPress-RI | 1 | [Link](https://www.tivertonlibrary.org) |
| George Hail Free Library | RI | WordPress-RI | 0 | [Link](https://www.georgehail.org/) |
| Louttit Memorial Library | RI | WordPress-RI | 37 | [Link](https://www.louttitlibrary.org) |
| Westerly Public Library | RI | WordPress-RI | 4 | [Link](https://www.westerlylibrary.org/) |
| Fairmount Branch | RI | WordPress-RI | 17 | [Link](https://www.woonsocketlibrary.org) |
| Woonsocket Harris Public Library | RI | WordPress-RI | 17 | [Link](https://www.woonsocketlibrary.org) |
| Orange County Library System | FL | Orange-County-Library-FL | 1974 | [Link](https://ocls.org/calendar/) |
| Peterborough Town Library | NH | Communico-NH | 15 | [Link](https://peterboroughtownlibrary.libnet.info/events) |
| Collierville Burch Library | TN | Communico-TN | 3 | [Link](https://collierville.libnet.info/events) |
| Nashville Public Library | TN | Nashville-Library-TN | 1 | [Link](https://events.library.nashville.org/) |
| Bridgeport Public Library | WV | Communico-WV | 1 | [Link](https://bplwv.libnet.info/events) |
| Huntington Public Library | WV | Communico-WV | 200 | [Link](https://myhpl.libnet.info/events) |
| York County Libraries | PA | LibraryMarket-PA | 24 | [Link](https://events.yorklibraries.org/events/upcoming) |
| Lancaster Public Library | PA | LibraryMarket-PA | 24 | [Link](https://calendar.lancasterlibraries.org/events/upcoming) |
| Bethlehem Area Public Library | PA | LibraryMarket-PA | 24 | [Link](https://bethlehemarea.librarycalendar.com/events/upcoming) |
| Buncombe County Libraries | NC | LibraryMarket-NC | 5 | [Link](https://buncombe.librarycalendar.com/events/month) |
| Hickory Public Library | NC | LibraryMarket-NC | 8 | [Link](https://hickory.librarycalendar.com/) |
| Manchester City Library | NH | WordPress-NH | 3 | [Link](https://www.manchester.lib.nh.us) |
| Nashua Public Library | NH | WordPress-NH | 0 | [Link](https://www.nashualibrary.org) |
| Concord Public Library | NH | WordPress-NH | 0 | [Link](https://concordpubliclibrary.net) |
| Dover Public Library | NH | WordPress-NH | 0 | [Link](https://library.dover.nh.gov) |
| Laconia Public Library | NH | WordPress-NH | 0 | [Link](https://www.laconialibrary.org) |
| Derry Public Library | NH | WordPress-NH | 0 | [Link](https://www.derrypl.org) |
| Hampton Lane Memorial Library | NH | WordPress-NH | 0 | [Link](https://www.hampton.lib.nh.us) |
| Milford Wadleigh Memorial Library | NH | WordPress-NH | 1 | [Link](https://www.wadleighlibrary.org) |
| Exeter Public Library | NH | WordPress-NH | 0 | [Link](https://www.exeterpl.org) |
| Goffstown Public Library | NH | WordPress-NH | 0 | [Link](https://goffstownlibrary.com/) |
| Bedford Public Library | NH | WordPress-NH | 2 | [Link](https://www.bedfordnhlibrary.org) |
| Amherst Town Library | NH | WordPress-NH | 1 | [Link](https://www.amherstlibrary.org) |
| Windham Nesmith Library | NH | WordPress-NH | 1 | [Link](https://www.nesmithlibrary.org) |
| Lebanon Public Libraries | NH | WordPress-NH | 3 | [Link](https://leblibrary.com/) |
| Salem Kelley Library | NH | WordPress-NH | 0 | [Link](https://www.ci.salem.nh.us/kelleylibrary) |
| Londonderry Leach Library | NH | WordPress-NH | 0 | [Link](https://www.londonderrynh.org/leach-library) |
| Hudson Rodgers Memorial Library | NH | WordPress-NH | 1 | [Link](https://www.rodgerslibrary.org/) |
| Hooksett Public Library | NH | WordPress-NH | 1 | [Link](https://www.hooksettlibrary.org) |
| Haynes Library | NH | WordPress-NH | 7 | [Link](https://www.alexandrialibrary.org) |
| Andover Public Library | NH | WordPress-NH | 0 | [Link](https://www.andoverlibrary.org) |
| Ashland Town Library | NH | WordPress-NH | 0 | [Link]() |
| Griffin Free Public Library | NH | WordPress-NH | 1 | [Link](https://auburnlibrary.org/) |
| Barrington Public Library | NH | WordPress-NH | 2 | [Link](https://barringtonlibrary.org/) |
| Bartlett Public Library | NH | WordPress-NH | 63 | [Link](https://www.bartlettlibrary.org) |
| Bath Public Library | NH | WordPress-NH | 21 | [Link](https://www.bathlibrary.org) |
| Belmont Public Library | NH | WordPress-NH | 12 | [Link](https://smcl.org/) |
| G. E.P. Dodge Library | NH | WordPress-NH | 123 | [Link](https://www.benningtonlibrary.org) |
| Berlin Public Library | NH | WordPress-NH | 10 | [Link]() |
| Bethlehem Public Library | NH | WordPress-NH | 0 | [Link](https://www.bethlehemlibrary.org) |
| Brown Memorial Library | NH | WordPress-NH | 0 | [Link](https://bradfordlibrary.org/) |
| Mary E. Bartlett Library | NH | WordPress-NH | 0 | [Link](https://www.brentwoodlibrary.org) |
| Brookline Public Library | NH | WordPress-NH | 19 | [Link]() |
| Canaan Town Library | NH | WordPress-NH | 25 | [Link](https://www.canaanlibrary.org) |
| Elkins Library | NH | WordPress-NH | 0 | [Link](https://www.canterburylibrary.org) |
| James E. Nichols Memorial Library | NH | WordPress-NH | 4 | [Link](https://centerharborlibrary.org/) |
| Chester Public Library | NH | WordPress-NH | 0 | [Link](https://www.chesterlibrary.org/) |
| Chesterfield Public Library | NH | WordPress-NH | 1 | [Link](https://www.chesterfieldlibrary.org) |
| Chocorua Public Library | NH | WordPress-NH | 2 | [Link](https://www.chocorualibrary.org/) |
| Fiske Free Library | NH | WordPress-NH | 0 | [Link](https://www.claremontlibrary.org/) |
| Dalton Public Library | NH | WordPress-NH | 36 | [Link](https://www.daltonlibrary.org) |
| George Gamble Library | NH | WordPress-NH | 0 | [Link](https://danburylibrary.org/) |
| Colby Memorial Library | NH | WordPress-NH | 0 | [Link]() |
| Philbrick-James Library | NH | WordPress-NH | 1 | [Link](https://www.deerfieldlibrary.org) |
| Dublin Public Library | NH | WordPress-NH | 1 | [Link](https://www.dublinlibrary.org/) |
| Dunbarton Public Library | NH | WordPress-NH | 0 | [Link](https://www.dunbartonlibrary.org) |
| Durham Public Library | NH | WordPress-NH | 38 | [Link]() |
| East Kingston Public Library | NH | WordPress-NH | 0 | [Link](https://www.eastkingstonlibrary.org/) |
| East Rochester Public Library | NH | WordPress-NH | 0 | [Link](https://www.eastrochesterlibrary.org) |
| Effingham Free Public Library | NH | WordPress-NH | 0 | [Link](https://effinghamlibrary.org/) |
| Harvey-Mitchell Memorial Library | NH | WordPress-NH | 1 | [Link](https://www.eppinglibrary.org) |
| Goodwin Library | NH | WordPress-NH | 9 | [Link](https://www.farmingtonpublic.org/) |
| George Holmes Bixby Memorial Library | NH | WordPress-NH | 0 | [Link](https://www.francestownlibrary.org) |
| Franklin Public Library | NH | WordPress-NH | 3 | [Link](https://www.franklinlibrary.org) |
| Fremont Public Library | NH | WordPress-NH | 6 | [Link](https://www.fremontlibrary.org) |
| Gilford Public Library | NH | WordPress-NH | 1 | [Link](https://gilfordlibrary.org/) |
| Gorham Public Library | NH | WordPress-NH | 1 | [Link](https://gorhamlibrary.org/) |
| Olive G. Pettis Library | NH | WordPress-NH | 0 | [Link](https://www.goshenlibrary.org/) |
| Grafton Public Library | NH | WordPress-NH | 0 | [Link]() |
| Stephenson Memorial Library | NH | WordPress-NH | 12 | [Link]() |
| Chamberlin Free Public Library | NH | WordPress-NH | 269 | [Link](https://www.greenvillelibrary.org) |
| Hampstead Public Library | NH | WordPress-NH | 0 | [Link](https://www.hampsteadlibrary.org/) |
| Hampton Falls Free Library | NH | WordPress-NH | 115 | [Link](https://hamptonfallslibrary.org/) |
| Hancock Town Library | NH | WordPress-NH | 4 | [Link](https://hancocklibrary.org/) |
| Howe Library | NH | WordPress-NH | 0 | [Link]() |
| Haverhill Library Association | NH | WordPress-NH | 0 | [Link](https://www.haverhilllibrary.org) |
| Hebron Public Library | NH | WordPress-NH | 0 | [Link](https://www.hebronlibrary.org) |
| Hill Public Library | NH | WordPress-NH | 65 | [Link](https://www.hilllibrary.org) |
| Holderness Library | NH | WordPress-NH | 0 | [Link](https://www.holdernesslibrary.org) |
| Hollis Social Library | NH | WordPress-NH | 0 | [Link](https://www.hollislibrary.org) |
| Nichols Memorial Library | NH | WordPress-NH | 11 | [Link](https://www.kingstonlibrary.org) |
| William D. Weeks Memorial Library | NH | WordPress-NH | 0 | [Link]() |
| Lincoln Public Library | NH | WordPress-NH | 1 | [Link]() |
| Littleton Public Library | NH | WordPress-NH | 0 | [Link](https://www.littletonlibrary.org) |
| Madbury Public Library | NH | WordPress-NH | 1 | [Link](https://madburylibrary.org/) |
| Madison Library | NH | WordPress-NH | 9 | [Link](https://www.madisonlibrary.org) |
| Mason Public Library | NH | WordPress-NH | 1 | [Link](https://www.masonlibrary.org) |
| Meredith Public Library | NH | WordPress-NH | 2 | [Link](https://www.meredithlibrary.org) |
| Meriden Library | NH | WordPress-NH | 62 | [Link]() |
| Merrimack Public Library | NH | WordPress-NH | 0 | [Link](https://www.merrimacklibrary.org) |
| Milan Public Library | NH | WordPress-NH | 0 | [Link](https://milanlibrary.org/) |
| Nute Library | NH | WordPress-NH | 0 | [Link]() |
| Monroe Public Library | NH | WordPress-NH | 29 | [Link](https://www.monroelibrary.org) |
| Moultonborough Public Library | NH | WordPress-NH | 1 | [Link](https://www.moultonboroughlibrary.org) |
| Olivia Rodham Memorial Library | NH | WordPress-NH | 26 | [Link](https://www.nelsonlibrary.org) |
| New Durham Public Library | NH | WordPress-NH | 17 | [Link](https://newdurhamlibrary.org/) |
| New Ipswich Library | NH | WordPress-NH | 0 | [Link](https://www.newipswichlibrary.org/) |
| Tracy Memorial Library | NH | WordPress-NH | 11 | [Link](https://www.newlondonlibrary.org) |
| Newbury Public Library | NH | WordPress-NH | 1 | [Link](https://www.newburylibrary.org) |
| Newfields Public Library | NH | WordPress-NH | 26 | [Link](https://www.newfieldslibrary.org) |
| Newmarket Public Library | NH | WordPress-NH | 0 | [Link](https://newmarketlibrary.org/) |
| Richards Free Library | NH | WordPress-NH | 9 | [Link]() |
| Gale Library | NH | WordPress-NH | 0 | [Link](https://www.newtonlibrary.org) |
| Blaisdell Memorial Library | NH | WordPress-NH | 1 | [Link](https://nottinghamlibrary.org/) |
| Pelham Public Library | NH | WordPress-NH | 47 | [Link]() |
| Pembroke Town Library | NH | WordPress-NH | 0 | [Link](https://www.pembrokelibrary.org/) |
| Piermont Public Library | NH | WordPress-NH | 1 | [Link]() |
| Pike Library | NH | WordPress-NH | 0 | [Link](https://www.pikelibrary.org) |
| Bremer Pond Memorial Library | NH | WordPress-NH | 2 | [Link](https://www.pittsburglibrary.org/) |
| Josiah Carpenter Library | NH | WordPress-NH | 3 | [Link](https://www.pittsfieldlibrary.org/) |
| Philip Read Memorial Library | NH | WordPress-NH | 7 | [Link](https://www.plainfieldlibrary.org) |
| Pease Public Library | NH | WordPress-NH | 0 | [Link]() |
| Portsmouth Public Library | NH | WordPress-NH | 0 | [Link]() |
| Randolph Public Library | NH | WordPress-NH | 0 | [Link]() |
| Richmond Public Library | NH | WordPress-NH | 0 | [Link]() |
| Rollinsford Public Library | NH | WordPress-NH | 23 | [Link](https://www.rollinsfordlibrary.org/) |
| Byron G. Merrill Library | NH | WordPress-NH | 0 | [Link](https://www.rumneylibrary.org/) |
| Rye Public Library | NH | WordPress-NH | 2 | [Link](https://www.ryelibrary.org/) |
| Salisbury Free Library | NH | WordPress-NH | 0 | [Link](https://www.salisburylibrary.org/) |
| Libbie A. Cass Memorial Library | NH | WordPress-NH | 0 | [Link](https://www.springfieldlibrary.org/) |
| Stark Public Library | NH | WordPress-NH | 52 | [Link](https://www.starklibrary.org) |
| Laura Johnson Memorial Library | NH | WordPress-NH | 1 | [Link](https://www.stratfordlibrary.org) |
| Sullivan Public Library | NH | WordPress-NH | 0 | [Link](https://www.sullivanil.us/) |
| Cook Memorial Library | NH | WordPress-NH | 10 | [Link](https://www.tamworthlibrary.org) |
| Mansfield Public Library | NH | WordPress-NH | 0 | [Link](https://www.templelibrary.org) |
| Gay-Kimball Library | NH | WordPress-NH | 0 | [Link]() |
| Unity Free Public Library | NH | WordPress-NH | 0 | [Link]() |
| Wakefield Public Library | NH | WordPress-NH | 5 | [Link](https://wakefieldlibrary.org/) |
| Walpole Town Library | NH | WordPress-NH | 120 | [Link](https://www.walpolelibrary.org) |
| Pillsbury Free Library | NH | WordPress-NH | 8 | [Link](https://warnerlibrary.org/) |
| Joseph Patch Library | NH | WordPress-NH | 1 | [Link](https://www.warrenlibrary.org) |
| Webster Free Public Library | NH | WordPress-NH | 13 | [Link](https://www.websterlibrary.org) |
| Westmoreland Public Library | NH | WordPress-NH | 0 | [Link](https://www.westmorelandpubliclibrary.com/) |
| Whitefield Public Library | NH | WordPress-NH | 29 | [Link](https://www.whitefieldlibrary.org) |
| Wilmot Public Library | NH | WordPress-NH | 5 | [Link](https://www.wilmotlibrary.org) |
| Wilton Public Gregg Free Library | NH | WordPress-NH | 1 | [Link](https://www.wiltonlibrary.org) |
| Conant Public Library | NH | WordPress-NH | 1 | [Link](https://www.winchesterlibrary.org) |
| Wolfeboro Public Library | NH | WordPress-NH | 1 | [Link](https://wolfeboropubliclibrary.org/) |
| Decatur County - Gilbert H. Gragg Library | GA | SouthwestGeorgia-GA | 141 | [Link](https://swgrl.org/calendar.php) |
| Miller County - James W. Merritt Jr. Memorial Library | GA | SouthwestGeorgia-GA | 29 | [Link](https://swgrl.org/calendar.php) |
| Seminole County Public Library | GA | SouthwestGeorgia-GA | 47 | [Link](https://swgrl.org/calendar.php) |
| Assabet-NH-MA (multi-system, 18 libraries across NH/MA — see note) | Multi | Assabet-NH-MA | 1107 | [Link](https://dovernh.assabetinteractive.com/calendar/) |

### Cycle-completion check (2026-08-09)

**Complete.** Cross-referencing every active library-family scraper in `scrapers/scraper-registry.js` (filtered through `isScraperActive()`; 104 of the 153 active registry entries are library-family — the remaining 49 are parks/venues/festivals/community-event scrapers excluded per the standing skip list) against the union of `## 2026-08-05` + `## 2026-08-07` + `## 2026-08-08` + `## 2026-08-09`: **all 104 now have at least one logged row this cycle.** Today's run was the cycle's first Group 3 pass, and it picked up the two scrapers explicitly flagged as outstanding in the 2026-08-08 section (LibCal-VA2, Intercept-Camden) along with the rest of Group 3's library-family scrapers.

See the `## Cycle complete — 2026-08-09` summary at the top of this file for the full-cycle totals.


## 2026-08-10

Group 1 rotation day. Built with the new scripts/build-library-site-audit.js (streams the run window out of scrapers/logs/scraper-stdout.log) rather than by hand.

622 per-site rows across 25 scrapers that emit a per-site breakdown; 277 of those sites reported 0 events. A few non-library scrapers (Fairfax-Parks, FairsFestivals-Eastern, Trumba-Spartanburg, Venue-Events-ScienceArts, EventON-Lexington) share the same per-site log shape and are included rather than dropped, since omitting a row is indistinguishable from the site not existing.

**Coverage gap:** MacaroniKid Group 1 was still running when this was taken (PA and NC done, 7 of 9 states outstanding). Single-system scrapers without a per-site log shape (Pratt-Library, FreeLibrary-Philadelphia, Prince-Georges-County, Westmoreland-Library, Dorchester-County, Wicomico-Public, Drupal-Pennsylvania, BiblioCommons-NJ/VA, Communico-DC/MA/VA/NC, WithApps-Libraries) are one library website each and take their aggregate FOUND from the summary table.

| Library Website | State | Scraper | Events Found |
|---|---|---|---|
| Anne Arundel County Library events | — | AACPL | 23 |
| Colonial Heights Public Library | VA | CivicEngage-Libraries | 0 |
| Lexington County Public Library | SC | EventON-Lexington | 1000 |
| Coverage: Fairfax County, Virginia | — | Fairfax-Parks | 20 |
| Alabama | AL | FairsFestivals-Eastern | 63 |
| Connecticut | CT | FairsFestivals-Eastern | 213 |
| Delaware | DE | FairsFestivals-Eastern | 30 |
| District of Columbia | DC | FairsFestivals-Eastern | 5 |
| Florida | FL | FairsFestivals-Eastern | 581 |
| Georgia | GA | FairsFestivals-Eastern | 196 |
| Illinois | IL | FairsFestivals-Eastern | 392 |
| Indiana | IN | FairsFestivals-Eastern | 197 |
| Kentucky | KY | FairsFestivals-Eastern | 89 |
| Maine | ME | FairsFestivals-Eastern | 111 |
| Maryland | MD | FairsFestivals-Eastern | 156 |
| Massachusetts | MA | FairsFestivals-Eastern | 199 |
| Michigan | MI | FairsFestivals-Eastern | 407 |
| Mississippi | MS | FairsFestivals-Eastern | 27 |
| New Hampshire | NH | FairsFestivals-Eastern | 64 |
| New Jersey | NJ | FairsFestivals-Eastern | 210 |
| New York | NY | FairsFestivals-Eastern | 430 |
| North Carolina | NC | FairsFestivals-Eastern | 428 |
| Ohio | OH | FairsFestivals-Eastern | 532 |
| Pennsylvania | PA | FairsFestivals-Eastern | 406 |
| Rhode Island | RI | FairsFestivals-Eastern | 60 |
| South Carolina | SC | FairsFestivals-Eastern | 102 |
| Tennessee | TN | FairsFestivals-Eastern | 189 |
| Vermont | VT | FairsFestivals-Eastern | 52 |
| Virginia | VA | FairsFestivals-Eastern | 267 |
| West Virginia | WV | FairsFestivals-Eastern | 23 |
| Wisconsin | WI | FairsFestivals-Eastern | 359 |
| Blue Ridge Regional Library | VA | FullCalendar-Libraries | 274 |
| Delaware Libraries | DE | LibCal-DE | 20 |
| Boone County Public Library | KY | LibCal-KY | 0 |
| Clay County Public Library | KY | LibCal-KY | 20 |
| Kenton County Public Library | KY | LibCal-KY | 0 |
| Warren County Public Library | KY | LibCal-KY | 0 |
| Alamance County Library | NC | LibCal-NC | 48 |
| Brunswick County Public Library | NC | LibCal-NC | 10 |
| Craven-Pamlico Regional Library | NC | LibCal-NC | 0 |
| Durham County Library | NC | LibCal-NC | 20 |
| Gaston County Public Library | NC | LibCal-NC | 20 |
| Henderson County Public Library | NC | LibCal-NC | 5 |
| Iredell County Public Library | NC | LibCal-NC | 48 |
| New Hanover County Public Library | NC | LibCal-NC | 20 |
| Union County Public Library | NC | LibCal-NC | 25 |
| Concord Public Library | — | LibCal-NH | 33 |
| Hollis Social Library | — | LibCal-NH | 48 |
| Hooksett Public Library | — | LibCal-NH | 48 |
| Keene Public Library | — | LibCal-NH | 48 |
| Lebanon Public Libraries | — | LibCal-NH | 48 |
| Manchester City Library | — | LibCal-NH | 48 |
| Merrimack Public Library | — | LibCal-NH | 48 |
| Nashua Public Library | — | LibCal-NH | 48 |
| Pelham Public Library | — | LibCal-NH | 48 |
| Baldwin Public Library | NY | LibCal-NY2 | 0 |
| East Meadow Public Library | NY | LibCal-NY2 | 20 |
| Freeport Memorial Library | NY | LibCal-NY2 | 20 |
| Levittown Public Library | NY | LibCal-NY2 | 162 |
| North Bellmore Public Library | NY | LibCal-NY2 | 20 |
| North Merrick Public Library | NY | LibCal-NY2 | 20 |
| Oceanside Public Library | NY | LibCal-NY2 | 20 |
| Plainview-Old Bethpage Public Library | NY | LibCal-NY2 | 154 |
| Rockville Centre Public Library | NY | LibCal-NY2 | 20 |
| Wantagh Public Library | NY | LibCal-NY2 | 20 |
| Barrington Public Library | RI | LibCal-RI | 20 |
| Cranston Public Library | RI | LibCal-RI | 20 |
| Cumberland Public Library | RI | LibCal-RI | 25 |
| East Providence Public Library | RI | LibCal-RI | 20 |
| Newport Public Library | RI | LibCal-RI | 20 |
| North Kingstown Free Library | RI | LibCal-RI | 0 |
| Pawtucket Public Library | RI | LibCal-RI | 10 |
| Warwick Public Library | RI | LibCal-RI | 20 |
| West Warwick Public Library | RI | LibCal-RI | 20 |
| Amherst County Public Library | VA | LibraryCalendar-Libraries | 19 |
| Appomattox Regional Library | VA | LibraryCalendar-Libraries | 13 |
| Atlantic County Library System | NJ | LibraryCalendar-Libraries | 23 |
| Bedford Public Library System | VA | LibraryCalendar-Libraries | 18 |
| Bloomingdale Public Library | IL | LibraryCalendar-Libraries | 21 |
| Caroline County Public Library | MD | LibraryCalendar-Libraries | 19 |
| Cumberland County Public Library | NC | LibraryCalendar-Libraries | 22 |
| Essex Public Library | VA | LibraryCalendar-Libraries | 14 |
| Forsyth County Public Library | NC | LibraryCalendar-Libraries | 23 |
| Frederick County Public Libraries | MD | LibraryCalendar-Libraries | 18 |
| Gloucester County Library System | NJ | LibraryCalendar-Libraries | 22 |
| Howard County Library System | MD | LibraryCalendar-Libraries | 22 |
| Lynchburg Public Library | VA | LibraryCalendar-Libraries | 13 |
| Petersburg Public Library | VA | LibraryCalendar-Libraries | 8 |
| Poquoson Public Library | VA | LibraryCalendar-Libraries | 18 |
| Portsmouth Public Library | VA | LibraryCalendar-Libraries | 18 |
| Powhatan County Public Library | VA | LibraryCalendar-Libraries | 13 |
| Talbot County Free Library | MD | LibraryCalendar-Libraries | 21 |
| Waynesboro Public Library | VA | LibraryCalendar-Libraries | 13 |
| York County Library | SC | LibraryCalendar-Libraries | 21 |
| York County Public Library | VA | LibraryCalendar-Libraries | 18 |
| Fairfield Public Library | — | LibraryMarket-CT | 113 |
| Ferguson Library | — | LibraryMarket-CT | 24 |
| Meriden Public Library | — | LibraryMarket-CT | 3 |
| New Britain Public Library | — | LibraryMarket-CT | 0 |
| West Hartford Public Library | — | LibraryMarket-CT | 34 |
| Beaufort County Library | — | LibraryMarket-SC | 32 |
| Sumter County Library | — | LibraryMarket-SC | 8 |
| Spartanburg County Public Libraries | SC | Trumba-Spartanburg | 586 |
| Scraping: Academy of Natural Sciences | PA | Venue-Events-ScienceArts | 10 |
| Scraping: Adler Planetarium | IL | Venue-Events-ScienceArts | 7 |
| Scraping: American Museum of Natural History | NY | Venue-Events-ScienceArts | 5 |
| Scraping: Art Institute of Chicago | IL | Venue-Events-ScienceArts | 0 |
| Scraping: Bishop Museum of Science & Nature | FL | Venue-Events-ScienceArts | 21 |
| Scraping: Connecticut Science Center | CT | Venue-Events-ScienceArts | 12 |
| Scraping: Conner Prairie Living History | IN | Venue-Events-ScienceArts | 8 |
| Scraping: Corning Museum of Glass | NY | Venue-Events-ScienceArts | 85 |
| Scraping: EcoTarium | MA | Venue-Events-ScienceArts | 0 |
| Scraping: Fernbank Museum of Natural History | GA | Venue-Events-ScienceArts | 0 |
| Scraping: Field Museum | IL | Venue-Events-ScienceArts | 1 |
| Scraping: Franklin Institute | PA | Venue-Events-ScienceArts | 1 |
| Scraping: Frost Science Museum | FL | Venue-Events-ScienceArts | 56 |
| Scraping: Great Lakes Science Center | OH | Venue-Events-ScienceArts | 7 |
| Scraping: Griffin Museum of Science and Industry | IL | Venue-Events-ScienceArts | 0 |
| Scraping: Henry Ford Museum | MI | Venue-Events-ScienceArts | 1 |
| Scraping: Imagination Station | OH | Venue-Events-ScienceArts | 0 |
| Scraping: Impression 5 Science Center | MI | Venue-Events-ScienceArts | 1 |
| Scraping: Indiana State Museum | IN | Venue-Events-ScienceArts | 14 |
| Scraping: Intrepid Sea Air & Space Museum | NY | Venue-Events-ScienceArts | 0 |
| Scraping: Kamin Science Center | PA | Venue-Events-ScienceArts | 0 |
| Scraping: Kennedy Space Center Visitor Complex | FL | Venue-Events-ScienceArts | 62 |
| Scraping: Maryland Science Center | MD | Venue-Events-ScienceArts | 8 |
| Scraping: McAuliffe-Shepard Discovery Center | NH | Venue-Events-ScienceArts | 1 |
| Scraping: Michigan Science Center | MI | Venue-Events-ScienceArts | 14 |
| Scraping: Milwaukee Art Museum | WI | Venue-Events-ScienceArts | 20 |
| Scraping: Museum of Science & Industry | FL | Venue-Events-ScienceArts | 1 |
| Scraping: Museum of Science Boston | MA | Venue-Events-ScienceArts | 1 |
| Scraping: National Building Museum | DC | Venue-Events-ScienceArts | 0 |
| Scraping: NC Museum of Natural Sciences | NC | Venue-Events-ScienceArts | 20 |
| Scraping: New York Hall of Science | NY | Venue-Events-ScienceArts | 1 |
| Scraping: Science Museum of Virginia | VA | Venue-Events-ScienceArts | 8 |
| Scraping: Smithsonian Air & Space Museum | DC | Venue-Events-ScienceArts | 10 |
| Scraping: Smithsonian Natural History Museum | DC | Venue-Events-ScienceArts | 40 |
| Scraping: Tellus Science Museum | GA | Venue-Events-ScienceArts | 13 |
| Scraping: Tennessee State Museum | TN | Venue-Events-ScienceArts | 1 |
| Scraping: Virginia Museum of Natural History | VA | Venue-Events-ScienceArts | 6 |
| Scraping: Yale Peabody Museum | CT | Venue-Events-ScienceArts | 1 |
| ABBE Regional Library System | SC | WordPress-Abbe-Regional | 20 |
| Abbeville Memorial Library | — | WordPress-AL | 7 |
| Akron Public Library | — | WordPress-AL | 0 |
| Andalusia Public Library | — | WordPress-AL | 0 |
| Athens-Limestone Public Library | — | WordPress-AL | 35 |
| Auburn Public Library | — | WordPress-AL | 1 |
| Birmingham Public Library | — | WordPress-AL | 1 |
| Blanche R. Solomon Memorial Library | — | WordPress-AL | 0 |
| Bridgeport - Lena Cagle Public Library | — | WordPress-AL | 0 |
| Burchell Campbell Memorial Library | — | WordPress-AL | 0 |
| Butler County Public Library | — | WordPress-AL | 125 |
| Chelsea Public Library | — | WordPress-AL | 0 |
| Choctaw County Public Library | — | WordPress-AL | 0 |
| City Of Bayou La Batre Public Library | — | WordPress-AL | 0 |
| Clay Public Library | — | WordPress-AL | 0 |
| Clayton Town And County Public Library | — | WordPress-AL | 0 |
| Clyde Nix Public Library | — | WordPress-AL | 0 |
| Collinsville Public Library | — | WordPress-AL | 0 |
| Cordova Public Library | — | WordPress-AL | 0 |
| Daleville Public Library | — | WordPress-AL | 1 |
| Daphne Public Library | — | WordPress-AL | 0 |
| Decatur Public Library | — | WordPress-AL | 107 |
| Doris Stanley Memorial Library | — | WordPress-AL | 1 |
| Dothan Houston County Library System | — | WordPress-AL | 73 |
| Evergreen Public Library | — | WordPress-AL | 0 |
| Fairhope Public Library | — | WordPress-AL | 150 |
| Florence-Lauderdale Public Library | — | WordPress-AL | 0 |
| Foley Public Library | — | WordPress-AL | 0 |
| Gardendale Public Library | — | WordPress-AL | 1 |
| Grant Public Library | — | WordPress-AL | 0 |
| Guntersville Public Library | — | WordPress-AL | 0 |
| H. Grady Bradshaw - Chambers County Library | — | WordPress-AL | 1 |
| Hale County Library | — | WordPress-AL | 0 |
| Hartford - Mcgregor-Mckinney Public Library | — | WordPress-AL | 0 |
| Homewood Public Library | — | WordPress-AL | 0 |
| Hoover Public Library | — | WordPress-AL | 6 |
| Houston-Love Memorial Library - Columbia | — | WordPress-AL | 0 |
| Hueytown Public Library | — | WordPress-AL | 0 |
| Huntsville-Madison County Public Library | — | WordPress-AL | 13 |
| Irondale Public Library | — | WordPress-AL | 0 |
| Jane B. Holmes Public Library | — | WordPress-AL | 0 |
| Jane Culbreth Library | — | WordPress-AL | 1 |
| Jefferson County Library Cooperative | — | WordPress-AL | 0 |
| Kennedy Public Library | — | WordPress-AL | 0 |
| Lafayette Pilot Public Library | — | WordPress-AL | 1 |
| Leighton Public Library | — | WordPress-AL | 21 |
| Louisville Public Library | — | WordPress-AL | 15 |
| Madison Public Library | — | WordPress-AL | 10 |
| Marion-Perry County Library | — | WordPress-AL | 3 |
| Millbrook Public Library | — | WordPress-AL | 0 |
| Mobile Public Library | — | WordPress-AL | 30 |
| Monroe County Public Library | — | WordPress-AL | 0 |
| Montgomery City-County Public Library | — | WordPress-AL | 32 |
| Newton Public Library | — | WordPress-AL | 0 |
| Northwest Regional Library | — | WordPress-AL | 0 |
| Opp Public Library | — | WordPress-AL | 0 |
| Orange Beach Public Library | — | WordPress-AL | 0 |
| Oxford Public Library | — | WordPress-AL | 0 |
| Piedmont Public Library | — | WordPress-AL | 0 |
| Ruby Pickens Tartt Public Library | — | WordPress-AL | 0 |
| Satsuma Public Library | — | WordPress-AL | 0 |
| Scottsboro Public Library | — | WordPress-AL | 0 |
| Selma-Dallas County Public Library | — | WordPress-AL | 1 |
| Sheffield Public Library | — | WordPress-AL | 0 |
| Stevenson Public Library | — | WordPress-AL | 0 |
| Trussville Public Library | — | WordPress-AL | 4 |
| Tuscaloosa Public Library | — | WordPress-AL | 150 |
| Vernon - Mary Wallace Cobb Memorial Library | — | WordPress-AL | 0 |
| Vestavia Hills Library | — | WordPress-AL | 150 |
| Walter J. Hanna Memorial Library | — | WordPress-AL | 1 |
| Warrior Public Library | — | WordPress-AL | 0 |
| Wilcox County Library | — | WordPress-AL | 0 |
| Wilsonville - Vernice Stoudenmire Library | — | WordPress-AL | 87 |
| Woodville Public Library | — | WordPress-AL | 0 |
| Andover Public Library | CT | WordPress-CT | 0 |
| Ansonia Public Library | CT | WordPress-CT | 0 |
| Beacon Falls Public Library | CT | WordPress-CT | 0 |
| Beardsley Memorial Library | CT | WordPress-CT | 1 |
| Bethel Public Library | CT | WordPress-CT | 0 |
| Bethlehem Public Library | CT | WordPress-CT | 0 |
| Bill Library | CT | WordPress-CT | 1 |
| Bridgeport Public Library | CT | WordPress-CT | 0 |
| Bristol Public Library | CT | WordPress-CT | 196 |
| Brookfield Library | CT | WordPress-CT | 88 |
| Canterbury Public Library | CT | WordPress-CT | 0 |
| Canton Public Library | CT | WordPress-CT | 0 |
| Central Village Public Library | CT | WordPress-CT | 7 |
| Cheshire Public Library | CT | WordPress-CT | 2 |
| Chester Public Library | CT | WordPress-CT | 0 |
| Clark Memorial Library | CT | WordPress-CT | 10 |
| Community Branch Library | CT | WordPress-CT | 1 |
| Cornwall Library Association | CT | WordPress-CT | 3 |
| Cyrenius H. Booth Library | CT | WordPress-CT | 0 |
| Danbury Public Library | CT | WordPress-CT | 0 |
| Darien Library | CT | WordPress-CT | 24 |
| Douglas Library Of Hebron | CT | WordPress-CT | 0 |
| Durham Public Library | CT | WordPress-CT | 38 |
| E.C. Scranton Memorial Library | CT | WordPress-CT | 9 |
| East Hampton Public Library | CT | WordPress-CT | 0 |
| East Hartford Public Library | CT | WordPress-CT | 0 |
| Easton Public Library | CT | WordPress-CT | 0 |
| Edith Wheeler Memorial Library | CT | WordPress-CT | 0 |
| Enfield Public Library | CT | WordPress-CT | 5 |
| Essex Library Association | CT | WordPress-CT | 0 |
| Fairfield Public Library | CT | WordPress-CT | 0 |
| Farmington Library | CT | WordPress-CT | 9 |
| Frederick H. Cossitt Library | CT | WordPress-CT | 1 |
| Goshen Public Library | CT | WordPress-CT | 0 |
| Greenwich Library | CT | WordPress-CT | 0 |
| Hall Memorial Library | CT | WordPress-CT | 0 |
| Hartford Public Library | CT | WordPress-CT | 0 |
| Hartland Public Library | CT | WordPress-CT | 0 |
| Harwinton Public Library | CT | WordPress-CT | 110 |
| Henry Carter Hull Library | CT | WordPress-CT | 0 |
| Ivoryton Library Association | CT | WordPress-CT | 0 |
| Janet Carlson Calvert Library | CT | WordPress-CT | 3 |
| Jonathan Trumbull Library | CT | WordPress-CT | 0 |
| Kent Library Association | CT | WordPress-CT | 62 |
| Kent Memorial Library | CT | WordPress-CT | 0 |
| Killingworth Library | CT | WordPress-CT | 0 |
| Levi E.Coe Library | CT | WordPress-CT | 0 |
| Louis Piantino Branch Library | CT | WordPress-CT | 0 |
| Manchester Public Library | CT | WordPress-CT | 9 |
| Middlebury Public Library | CT | WordPress-CT | 22 |
| Middletown Public Library | CT | WordPress-CT | 1 |
| Milford Public Library | CT | WordPress-CT | 0 |
| Minor Memorial Library | CT | WordPress-CT | 46 |
| Mystic Noank Library | CT | WordPress-CT | 1 |
| New Britain Public Library | CT | WordPress-CT | 57 |
| New Canaan Library | CT | WordPress-CT | 79 |
| New Fairfield Free Public Library | CT | WordPress-CT | 6 |
| New Haven Free Public Library | CT | WordPress-CT | 1 |
| New Milford Public Library | CT | WordPress-CT | 1 |
| Norfolk Library | CT | WordPress-CT | 12 |
| North Haven Memorial Library | CT | WordPress-CT | 0 |
| Norwalk Public Library | CT | WordPress-CT | 0 |
| Oakville Branch Library | CT | WordPress-CT | 0 |
| Old Lyme - Phoebe Griffin Noyes Library | CT | WordPress-CT | 0 |
| Otis Library | CT | WordPress-CT | 1 |
| Oxford Public Library | CT | WordPress-CT | 0 |
| Pequot Library Association | CT | WordPress-CT | 0 |
| Plainville Public Library | CT | WordPress-CT | 0 |
| Pomfret Public Library | CT | WordPress-CT | 0 |
| Preston Public Library | CT | WordPress-CT | 1 |
| Prospect Public Library | CT | WordPress-CT | 0 |
| Public Library Of New London | CT | WordPress-CT | 11 |
| Ridgefield Library | CT | WordPress-CT | 10 |
| Salem Free Public Library | CT | WordPress-CT | 0 |
| Saxton B. Little Free Library | CT | WordPress-CT | 1 |
| Scoville Memorial Library | CT | WordPress-CT | 0 |
| Shelton Public Library | CT | WordPress-CT | 36 |
| Sherman Library Assn. | CT | WordPress-CT | 1 |
| South Windsor Public Library | CT | WordPress-CT | 67 |
| Southbury Public Library | CT | WordPress-CT | 61 |
| Southington Public Library | CT | WordPress-CT | 0 |
| Stafford Library Association | CT | WordPress-CT | 1 |
| Stamford Public Library | CT | WordPress-CT | 0 |
| Stonington Free Library | CT | WordPress-CT | 0 |
| Stratford Library | CT | WordPress-CT | 0 |
| Thomaston Public Library | CT | WordPress-CT | 0 |
| Torrington Library | CT | WordPress-CT | 0 |
| Trumbull Library | CT | WordPress-CT | 0 |
| Union Free Public Library | CT | WordPress-CT | 3 |
| Vernon Public Library | CT | WordPress-CT | 0 |
| Wallingford Public Library | CT | WordPress-CT | 30 |
| Warren Public Library | CT | WordPress-CT | 1 |
| Waterbury Public Library | CT | WordPress-CT | 0 |
| Waterford Public Library | CT | WordPress-CT | 0 |
| West Hartford Public Library | CT | WordPress-CT | 82 |
| Westbrook Public Library | CT | WordPress-CT | 93 |
| Westport Library | CT | WordPress-CT | 15 |
| Wethersfield Public Library | CT | WordPress-CT | 0 |
| Willimantic Public Library | CT | WordPress-CT | 116 |
| Wilson Branch Library | CT | WordPress-CT | 0 |
| Wilton Library Association | CT | WordPress-CT | 1 |
| Windham Free Library | CT | WordPress-CT | 2 |
| Windsor Locks Public Library | CT | WordPress-CT | 0 |
| Wolcott Public Library | CT | WordPress-CT | 1 |
| Woodbury Public Library | CT | WordPress-CT | 23 |
| Alma-Bacon County Public Library | GA | WordPress-GA | 8 |
| Appleby Branch | GA | WordPress-GA | 1 |
| Athens Regional Library System | GA | WordPress-GA | 35 |
| Baker County | GA | WordPress-GA | 0 |
| Boston Carnegie Library | GA | WordPress-GA | 20 |
| Bowman Branch | GA | WordPress-GA | 30 |
| Brooks County Public Library System | GA | WordPress-GA | 0 |
| Brunswick Glynn County Regional Library | GA | WordPress-GA | 1 |
| Butler Public Library | GA | WordPress-GA | 0 |
| Byron Public Library | GA | WordPress-GA | 84 |
| Cedartown Library | GA | WordPress-GA | 7 |
| Centerville Branch Library | GA | WordPress-GA | 150 |
| Chattahoochee Valley Regional Library System | GA | WordPress-GA | 2 |
| Chattooga County Library System | GA | WordPress-GA | 0 |
| Cherokee Regional Library System | GA | WordPress-GA | 1 |
| Clarkesville-Habersham Co. Lib. | GA | WordPress-GA | 0 |
| Clarkston Branch | GA | WordPress-GA | 1 |
| Clermont Library | GA | WordPress-GA | 0 |
| Commerce Public Library | GA | WordPress-GA | 0 |
| Coolidge Public Library | GA | WordPress-GA | 1 |
| Cornelia-Habersham Co. Lib. | GA | WordPress-GA | 1 |
| Covington Branch | GA | WordPress-GA | 107 |
| Dalton-Whitfield County Public Library | GA | WordPress-GA | 28 |
| Douglas-Coffee County Public Library | GA | WordPress-GA | 1 |
| Duluth | GA | WordPress-GA | 0 |
| Effingham | GA | WordPress-GA | 1 |
| Elizabeth Harris Library | GA | WordPress-GA | 1 |
| Fayette County Public Library | GA | WordPress-GA | 0 |
| Gibbs Memorial Library | GA | WordPress-GA | 0 |
| Gordon Public Library | GA | WordPress-GA | 0 |
| Grantville Public Library | GA | WordPress-GA | 4 |
| Greene County Library | GA | WordPress-GA | 0 |
| Greenville Area Public Library | GA | WordPress-GA | 13 |
| Hancock County Library | GA | WordPress-GA | 37 |
| Harlie Fulford Memorial Library | GA | WordPress-GA | 1 |
| Harris County Public Library | GA | WordPress-GA | 0 |
| Heard County Public Library | GA | WordPress-GA | 0 |
| Hickory Flat Public Library | GA | WordPress-GA | 0 |
| Hightower Memorial Library | GA | WordPress-GA | 0 |
| Houston County Public Libraries System | GA | WordPress-GA | 0 |
| Ida Hilton Public Library | GA | WordPress-GA | 25 |
| Jefferson County Library System | GA | WordPress-GA | 15 |
| Lagrange Memorial Library | GA | WordPress-GA | 0 |
| Lake Sinclair Library | GA | WordPress-GA | 0 |
| Laurens County Library | GA | WordPress-GA | 0 |
| Lewis A. Ray Library | GA | WordPress-GA | 0 |
| Marion County Library | GA | WordPress-GA | 108 |
| Maysville Public Library | GA | WordPress-GA | 0 |
| Meigs Public Library | GA | WordPress-GA | 4 |
| Middle Georgia Regional Library System | GA | WordPress-GA | 0 |
| Miller Lakeland Library | GA | WordPress-GA | 5 |
| Monroe County Library | GA | WordPress-GA | 0 |
| Monroe-Walton County Library | GA | WordPress-GA | 0 |
| Morgan County Library | GA | WordPress-GA | 10 |
| Nelle Brown Memorial Public Library | GA | WordPress-GA | 0 |
| New Georgia Public Library | GA | WordPress-GA | 10 |
| Oglethorpe County Library | GA | WordPress-GA | 0 |
| Parks Memorial Library | GA | WordPress-GA | 44 |
| Pembroke Public Library | GA | WordPress-GA | 0 |
| Rabun Co. Public Library | GA | WordPress-GA | 0 |
| Riverdale Branch Library | GA | WordPress-GA | 1 |
| Rockmart Library | GA | WordPress-GA | 0 |
| Roddenbery Memorial Library System | GA | WordPress-GA | 0 |
| Rossville Public Library | GA | WordPress-GA | 0 |
| Scottdale-Tobie Grant Branch | GA | WordPress-GA | 0 |
| Senoia Area Public Library | GA | WordPress-GA | 4 |
| Thomson-Mcduffie County Library | GA | WordPress-GA | 0 |
| Tyrone Public Library | GA | WordPress-GA | 0 |
| Warren P. Sewell Memorial Library-Bremen | GA | WordPress-GA | 1 |
| Wayne County Library | GA | WordPress-GA | 44 |
| Webster County Library | GA | WordPress-GA | 0 |
| Wheeler County Library | GA | WordPress-GA | 6 |
| White County Public Library-Cleveland Branch | GA | WordPress-GA | 1 |
| Wilcox County Public Library | GA | WordPress-GA | 7 |
| Alleghany County Public Library | NC | WordPress-NC | 0 |
| Bath Community Library | NC | WordPress-NC | 0 |
| Beatties Ford Road Branch Library | NC | WordPress-NC | 1 |
| Belmont Branch Library | NC | WordPress-NC | 12 |
| Berea Branch Library | NC | WordPress-NC | 0 |
| Black Creek Branch Library | NC | WordPress-NC | 51 |
| Blanche Benjamin Branch Library | NC | WordPress-NC | 0 |
| Boonville Community Public Library | NC | WordPress-NC | 0 |
| Bordeaux Branch Library | NC | WordPress-NC | 0 |
| Brunswick County Library | NC | WordPress-NC | 0 |
| Bunn Branch Library | NC | WordPress-NC | 0 |
| Canton Branch Library | NC | WordPress-NC | 0 |
| Carver Branch Library | NC | WordPress-NC | 3 |
| Cary Branch Library | NC | WordPress-NC | 4 |
| Catawba County Library | NC | WordPress-NC | 2 |
| Claremont Branch Library | NC | WordPress-NC | 2 |
| Cleveland County Memorial Library | NC | WordPress-NC | 17 |
| Craven-Pamlico-Carteret Regional Library | NC | WordPress-NC | 16 |
| Dallas Branch Library | NC | WordPress-NC | 12 |
| Danbury Public Library | NC | WordPress-NC | 0 |
| Davidson County Public Library System | NC | WordPress-NC | 0 |
| Dobson Community Library | NC | WordPress-NC | 0 |
| East Branch Library | NC | WordPress-NC | 51 |
| Farmville Public Library | NC | WordPress-NC | 0 |
| Florence Gallier Library | NC | WordPress-NC | 0 |
| Florence S. Shanklin Branch Library | NC | WordPress-NC | 30 |
| Franklin County Library | NC | WordPress-NC | 3 |
| Graham Public Library | NC | WordPress-NC | 0 |
| Hampstead Branch Library | NC | WordPress-NC | 0 |
| Harmony Branch Library | NC | WordPress-NC | 1 |
| Harrisburg Library | NC | WordPress-NC | 17 |
| Havelock-Craven County Public | NC | WordPress-NC | 0 |
| Hazel W. Guilford Memorial Library | NC | WordPress-NC | 0 |
| Henderson County Public Library | NC | WordPress-NC | 0 |
| Hickory Public Library | NC | WordPress-NC | 0 |
| Hocutt Ellington Memorial Library | NC | WordPress-NC | 0 |
| Hudson Branch Library | NC | WordPress-NC | 1 |
| J.C. Holliday Library | NC | WordPress-NC | 0 |
| John W. Clark Public Library | NC | WordPress-NC | 17 |
| King Public Library | NC | WordPress-NC | 1 |
| La Grange Branch Library | NC | WordPress-NC | 0 |
| Lawrence Memorial Library | NC | WordPress-NC | 0 |
| Leland Branch Library | NC | WordPress-NC | 0 |
| Liberty Public Library | NC | WordPress-NC | 0 |
| Littleton Public Library (Wc Jones Memorial) | NC | WordPress-NC | 0 |
| Lowell Branch Library | NC | WordPress-NC | 12 |
| Macon County Public Library | NC | WordPress-NC | 0 |
| Madison Branch Library | NC | WordPress-NC | 10 |
| Madison County Public Library | NC | WordPress-NC | 0 |
| Margaret Little Blount Library | NC | WordPress-NC | 3 |
| Mary Duncan Public Library | NC | WordPress-NC | 0 |
| Matthews Branch Library | NC | WordPress-NC | 1 |
| Maysville Public Library | NC | WordPress-NC | 0 |
| Mcdowell County Law Library | NC | WordPress-NC | 3 |
| Mooresville Public Library | NC | WordPress-NC | 1 |
| Myrtle Grove Branch | NC | WordPress-NC | 3 |
| Norwood Branch Library | NC | WordPress-NC | 0 |
| Pembroke Public Library | NC | WordPress-NC | 0 |
| Pettigrew Regional Library | NC | WordPress-NC | 0 |
| Polk County Public Library | NC | WordPress-NC | 33 |
| Princeton Public Library | NC | WordPress-NC | 0 |
| Public Library Of Johnston County Smithfield | NC | WordPress-NC | 0 |
| Roanoke Rapids Public Library | NC | WordPress-NC | 5 |
| Rowan Public Library | NC | WordPress-NC | 0 |
| Selma Public Library | NC | WordPress-NC | 0 |
| Spring Lake Branch | NC | WordPress-NC | 4 |
| Stanley Branch Library | NC | WordPress-NC | 12 |
| Star Branch | NC | WordPress-NC | 0 |
| Tyrrell County Library | NC | WordPress-NC | 0 |
| Union County Public Library | NC | WordPress-NC | 0 |
| Union West Branch Library | NC | WordPress-NC | 0 |
| Warsaw-Kornegay Public Library | NC | WordPress-NC | 11 |
| Watauga County Public Library | NC | WordPress-NC | 0 |
| Wayne County Public Library, Fremont | NC | WordPress-NC | 7 |
| Adams Memorial Library | — | WordPress-TN | 23 |
| Alexandria Branch Library | — | WordPress-TN | 6 |
| Athens Public Library | — | WordPress-TN | 35 |
| Auburntown Public Library | — | WordPress-TN | 1 |
| Audrey Pack Memorial Library | — | WordPress-TN | 0 |
| Bartlett Library | — | WordPress-TN | 0 |
| Baxter Branch Library | — | WordPress-TN | 150 |
| Benton County Library | — | WordPress-TN | 0 |
| Blount County Public Library | — | WordPress-TN | 0 |
| Carroll County Library | — | WordPress-TN | 0 |
| Chattanooga Public Library | — | WordPress-TN | 150 |
| Clarksville-Montgomery County Public Library | — | WordPress-TN | 0 |
| Cleveland-Bradley County Public Library | — | WordPress-TN | 1 |
| Clinton Public Library | — | WordPress-TN | 0 |
| Collierville Burch Library | — | WordPress-TN | 0 |
| Cordova Branch Library | — | WordPress-TN | 0 |
| Crockett County Library | — | WordPress-TN | 1 |
| Crossville-Cumberland County Public Library | — | WordPress-TN | 0 |
| Franklin County Public Library | — | WordPress-TN | 0 |
| Franklin Public Library | — | WordPress-TN | 0 |
| Germantown Community Library | — | WordPress-TN | 150 |
| Gleason Memorial Library | — | WordPress-TN | 0 |
| Hamilton Parks Public Library | — | WordPress-TN | 1 |
| Harriman Public Library | — | WordPress-TN | 0 |
| Hendersonville Public Library | — | WordPress-TN | 0 |
| Hickman County Public Library | — | WordPress-TN | 150 |
| Humphreys County Public Library | — | WordPress-TN | 1 |
| Johnson City Public Library | — | WordPress-TN | 21 |
| Kingsport Public Library | — | WordPress-TN | 0 |
| Kingston Public Library | — | WordPress-TN | 10 |
| Knox County Public Library | — | WordPress-TN | 24 |
| Lauderdale County Library | — | WordPress-TN | 1 |
| Macon County Public Library | — | WordPress-TN | 1 |
| Madisonville Public Library | — | WordPress-TN | 0 |
| Mary E. Tippitt Memorial Library | — | WordPress-TN | 0 |
| Meigs-Decatur Public Library | — | WordPress-TN | 96 |
| Memphis Public Libraries | — | WordPress-TN | 31 |
| Middleton Community Library | — | WordPress-TN | 0 |
| Mildred G. Fields Memorial Library | — | WordPress-TN | 1 |
| Millard Oakley Public Library | — | WordPress-TN | 0 |
| Monterey Branch Library | — | WordPress-TN | 0 |
| Morristown-Hamblen Library | — | WordPress-TN | 0 |
| Mt. Juliet-Harvey Freeman Public Library | — | WordPress-TN | 0 |
| Nashville Public Library | — | WordPress-TN | 1 |
| Nashville Talking Library | — | WordPress-TN | 8 |
| Newbern City Library | — | WordPress-TN | 16 |
| Palmer Public Library | — | WordPress-TN | 0 |
| Parsons Public Library | — | WordPress-TN | 0 |
| Rogersville Public Library | — | WordPress-TN | 0 |
| Rutherford County Library System | — | WordPress-TN | 0 |
| Sam T. Wilson Public Library | — | WordPress-TN | 0 |
| Savannah-Hardin County Library | — | WordPress-TN | 1 |
| Sequatchie County Public Library | — | WordPress-TN | 0 |
| Sevier County Public Library System | — | WordPress-TN | 0 |
| Smyrna Public Library | — | WordPress-TN | 0 |
| Southeast Branch Library | — | WordPress-TN | 0 |
| Spring Hill Public Library | — | WordPress-TN | 0 |
| Stewart County Public Library | — | WordPress-TN | 0 |
| Sweetwater Public Library | — | WordPress-TN | 1 |
| The Brentwood Library | — | WordPress-TN | 0 |
| Tipton County Public Library | — | WordPress-TN | 0 |
| Tullahoma Public Library | — | WordPress-TN | 0 |
| Washburn Public Library | — | WordPress-TN | 10 |
| Westmoreland Public Library | — | WordPress-TN | 0 |
| White County Public Library | — | WordPress-TN | 37 |
| White Pine Public Library | — | WordPress-TN | 0 |
| Williamson County Public Library | — | WordPress-TN | 0 |
| Winfield Public Library | — | WordPress-TN | 0 |
| Alexandria Library | — | WordPress-VA | 0 |
| Chesapeake Public Library | — | WordPress-VA | 0 |
| Culpeper County Library | — | WordPress-VA | 22 |
| Henrico County Public Library | — | WordPress-VA | 0 |
| Jefferson-Madison Regional Library | — | WordPress-VA | 0 |
| Manassas Park City Library | — | WordPress-VA | 9 |
| Ainsworth Public | VT | WordPress-VT | 0 |
| Aldrich Public Library | VT | WordPress-VT | 0 |
| Barton Public | VT | WordPress-VT | 0 |
| Bennington Free | VT | WordPress-VT | 150 |
| Benson Public | VT | WordPress-VT | 0 |
| Bent Northrup Memorial | VT | WordPress-VT | 1 |
| Bethel Public | VT | WordPress-VT | 0 |
| Bradford Public | VT | WordPress-VT | 0 |
| Brandon Free Public | VT | WordPress-VT | 61 |
| Brooks Memorial Library | VT | WordPress-VT | 150 |
| Brownell Library | VT | WordPress-VT | 150 |
| Butterfield | VT | WordPress-VT | 0 |
| Cabot Public | VT | WordPress-VT | 0 |
| Charlotte | VT | WordPress-VT | 68 |
| Chelsea Public | VT | WordPress-VT | 0 |
| Cobleigh Public Library | VT | WordPress-VT | 0 |
| Cornwall Free Public | VT | WordPress-VT | 3 |
| Cutler Memorial | VT | WordPress-VT | 7 |
| Deborah Rawson Memorial Library | VT | WordPress-VT | 15 |
| Essex Free | VT | WordPress-VT | 0 |
| Fair Haven Free | VT | WordPress-VT | 1 |
| Fairfax Community | VT | WordPress-VT | 1 |
| Fletcher Free Library | VT | WordPress-VT | 6 |
| Franklin-Grand Isle Bookmobile | VT | WordPress-VT | 31 |
| G. M. Kelley Community | VT | WordPress-VT | 1 |
| Gilman Public Library | VT | WordPress-VT | 0 |
| Glover Public | VT | WordPress-VT | 0 |
| Greensboro Free | VT | WordPress-VT | 0 |
| Hancock Free Public | VT | WordPress-VT | 4 |
| Hartford | VT | WordPress-VT | 0 |
| Hartland Public Library | VT | WordPress-VT | 0 |
| Haskell Free Library | VT | WordPress-VT | 0 |
| Haston | VT | WordPress-VT | 3 |
| Hitchcock Museum | VT | WordPress-VT | 1 |
| Huntington Public | VT | WordPress-VT | 0 |
| Ilsley Public Library | VT | WordPress-VT | 19 |
| Jaquith Public | VT | WordPress-VT | 0 |
| Kellogg-Hubbard Library | VT | WordPress-VT | 50 |
| Lanpher Memorial | VT | WordPress-VT | 41 |
| Latham Memorial | VT | WordPress-VT | 1 |
| Martha Canfield Memorial | VT | WordPress-VT | 0 |
| Moore Free | VT | WordPress-VT | 0 |
| Morrill Mem. Harris | VT | WordPress-VT | 0 |
| Morristown Centennial Library | VT | WordPress-VT | 0 |
| Mount Holly | VT | WordPress-VT | 12 |
| Norman Williams Public Library | VT | WordPress-VT | 150 |
| North Hero Public | VT | WordPress-VT | 1 |
| Norwich Public | VT | WordPress-VT | 1 |
| Peacham | VT | WordPress-VT | 1 |
| Pettee Memorial | VT | WordPress-VT | 3 |
| Pierson Library | VT | WordPress-VT | 36 |
| Pope Memorial | VT | WordPress-VT | 0 |
| Proctor Free | VT | WordPress-VT | 0 |
| Putney Public | VT | WordPress-VT | 22 |
| Quechee | VT | WordPress-VT | 6 |
| Reading Public | VT | WordPress-VT | 1 |
| Readsboro Community | VT | WordPress-VT | 0 |
| Rochester Public | VT | WordPress-VT | 0 |
| Rockingham Free Public Library | VT | WordPress-VT | 7 |
| Roger Clark Memorial | VT | WordPress-VT | 3 |
| Roxbury Free | VT | WordPress-VT | 46 |
| Russell Memorial | VT | WordPress-VT | 1 |
| Salisbury Free Public | VT | WordPress-VT | 0 |
| Sheldon Public | VT | WordPress-VT | 0 |
| Shrewsbury | VT | WordPress-VT | 0 |
| Springfield Town Library | VT | WordPress-VT | 2 |
| St. Johnsbury Athenaeum | VT | WordPress-VT | 3 |
| Stamford Community | VT | WordPress-VT | 0 |
| Stowe Free | VT | WordPress-VT | 0 |
| Tenney Memorial | VT | WordPress-VT | 0 |
| Tunbridge Public | VT | WordPress-VT | 35 |
| Vernon Free | VT | WordPress-VT | 7 |
| Warren Public | VT | WordPress-VT | 1 |
| Wells Village | VT | WordPress-VT | 0 |
| West Hartford | VT | WordPress-VT | 82 |
| Westminster West Public | VT | WordPress-VT | 0 |
| Whiting | VT | WordPress-VT | 0 |
| Windham Town | VT | WordPress-VT | 2 |
| Windsor Public | VT | WordPress-VT | 0 |
| Woodbury Community | VT | WordPress-VT | 23 |

## 2026-08-11

No full 3-day-rotation group ran today for the non-MacaroniKid library families — today's activity was a manual WordPress-NC/CT/TN debugging session (see SCRAPER-FIX-LOG.jsonl, 6 entries dated 2026-08-11) that invoked scrapers individually via `local-scraper-runner.js` rather than `--group N`, so per-site `\ud83d\udccd {library name}` breakdown lines never reached `scraper-stdout.log` (that file was last touched 08:36 AM and these runs continued past that). Falling back to each scraper's aggregate FOUND from `scraper-run-2026-08-11.log`, using its last run of the day per Step 3b's per-family rules. These are multi-site scrapers (WordPress-NC/CT/TN, CivicEngage-Libraries) reported as one row each since no per-library breakdown was recoverable today — this is a data-availability gap, not a size-based aggregation.

| Library Website | State | Scraper | Events Found |
|---|---|---|---|
| WordPress-NC libraries (aggregate, no per-site breakdown available today) | NC | WordPress-NC | 345 |
| WordPress-CT libraries (aggregate, no per-site breakdown available today) | CT | WordPress-CT | 1400 |
| WordPress-TN libraries (aggregate, no per-site breakdown available today) | TN | WordPress-TN | 974 |
| Abbe Regional Library (Pressville) | GA | WordPress-Abbe-Regional | 17 |
| Dorchester County Library | MD | Dorchester-County | 12 |
| Pratt Library (Enoch Pratt Free Library system) | MD | Pratt-Library | 2479 |
| Somerset County Library | MD | Somerset-County | 401 |
| LibraryMarket-CT libraries (aggregate, no per-site breakdown available today) | CT | LibraryMarket-CT | 198 |
| Williamson County Public Library system (wcpltn — aggregate, no per-site breakdown available today) | TN | CivicEngage-Libraries-wcpltn | 354 |

## 2026-08-12

Group 3 rotation day, day 3 of the current cycle. The cycle is **not** being marked complete: day 2 (Group 2, expected 2026-08-11) never ran — see the 2026-08-11 entry above, which was a manual debugging session rather than a scheduled group run. A catch-up Group 2 run was started manually on 2026-08-12 to close that gap; its per-site results will appear in the next cycle entry.

**Incident:** the 3:00 AM Group 3 run failed 37 of 50 scrapers with an identical `Failed to launch the browser process: Code: 3236495362` Puppeteer/Chromium error, wiping out nearly every library-family scraper for the scheduled run (LibCal-\*, Communico-\*, BiblioCommons-MA, WordPress-PA/MA/KY/SC/WV/DE/RI/NH, LibraryMarket-PA/NC, Squarespace-Libraries, WithApps-Libraries, Drupal-Virginia, Assabet-NH-MA, and others). Verified transient — Chrome launched fine on manual retest both directly and via the shared `launchBrowser()` helper — so no code was changed. All 36 recovery-eligible scrapers were re-run and **all 36 succeeded, 0 failures**, so the events themselves are in the database. See `SCRAPER-FIX-LOG.jsonl` for both entries.

**Why this entry has almost no per-site rows — a capture gap, not a coverage gap.** The recovery re-ran each scraper as an individual `node local-scraper-runner.js --scraper X` invocation instead of through `run-scrapers.bat`, which is what redirects stdout into `scrapers/logs/scraper-stdout.log`. The per-library `📍 {library name}` / `Found {N} events` lines that this audit parses therefore went to a console that was never captured, leaving only each scraper's aggregate line in `scraper-run-2026-08-12.log`. The rows below are the aggregates that survived. **Do not read a missing library here as a library that returned zero** — the DB-backed `AGE-RANGE-AUDIT.md` entry for the same day shows 2439 rows across 492 individual sites and 66 scrapers, which is the trustworthy picture of what actually landed. If a future recovery needs per-site detail, route the re-run through the same stdout redirection the nightly job uses.

| Library Website | State | Scraper | Events Found |
|---|---|---|---|
| Somerset County Library (via Google Calendar ICS feeds) | MD | GoogleCalendar-MD | 171 |
| Nashville Public Library | TN | Nashville-Library-TN | 183 |
| Orange County Library | FL | Orange-County-Library-FL | 1 |
| LibCal-NJ libraries (aggregate — per-site stdout not captured, see note above) | NJ | LibCal-NJ | 1135 |
| Assabet-NH-MA libraries (aggregate — per-site stdout not captured) | NH/MA | Assabet-NH-MA | 1111 |
| BiblioCommons-MA libraries (aggregate — per-site stdout not captured) | MA | BiblioCommons-MA | 827 |
| WordPress-MA libraries (aggregate — per-site stdout not captured) | MA | WordPress-MA | 802 |
| WordPress-NH libraries (aggregate — per-site stdout not captured) | NH | WordPress-NH | 795 |
| WordPress-WV libraries (aggregate — per-site stdout not captured) | WV | WordPress-WV | 685 |
| WordPress-KY libraries (aggregate — per-site stdout not captured) | KY | WordPress-KY | 658 |
| WordPress-PA libraries (aggregate — per-site stdout not captured) | PA | WordPress-PA | 466 |
| Communico-FL libraries (aggregate — per-site stdout not captured) | FL | Communico-FL | 386 |
| WordPress-Events-Calendar libraries (aggregate — per-site stdout not captured) | Multi | WordPress-Events-Calendar | 299 |
| WordPress-SC libraries (aggregate — per-site stdout not captured) | SC | WordPress-SC | 288 |
| Communico-NY libraries (aggregate — per-site stdout not captured) | NY | Communico-NY | 234 |
| LibCal-VA2 libraries (aggregate — per-site stdout not captured) | VA | LibCal-VA2 | 183 |
| Communico-MD libraries (aggregate — per-site stdout not captured) | MD | Communico-MD | 169 |
| WordPress-DE libraries (aggregate — per-site stdout not captured) | DE | WordPress-DE | 128 |
| Sandhill Regional Library | NC | SandhillRegional-NC | 99 |
| WordPress-RI libraries (aggregate — per-site stdout not captured) | RI | WordPress-RI | 91 |
| LibCal-SC libraries (aggregate — per-site stdout not captured) | SC | LibCal-SC | 77 |
| LibraryMarket-PA libraries (aggregate — per-site stdout not captured) | PA | LibraryMarket-PA | 72 |
| LibCal-VA libraries (aggregate — per-site stdout not captured) | VA | LibCal-VA | 54 |
| WithApps-Libraries (Hampton Public Library) | VA | WithApps-Libraries | 38 |
| Squarespace-Libraries (aggregate — per-site stdout not captured) | Multi | Squarespace-Libraries | 24 |
| Drupal-Virginia libraries (aggregate — per-site stdout not captured) | VA | Drupal-Virginia | 21 |
| Wicomico Public Library | MD | Wicomico-Public | 20 |
| LibCal-ME libraries (aggregate — per-site stdout not captured) | ME | LibCal-ME | 12 |
| Dorchester County Library | MD | Dorchester-County | 11 |
| LibraryMarket-NC libraries (aggregate — per-site stdout not captured) | NC | LibraryMarket-NC | 10 |
| Communico-WV libraries (aggregate — per-site stdout not captured) | WV | Communico-WV | 9 |
| Allentown Public Library | PA | Allentown-Public | 7 |
| Communico-TN libraries (aggregate — per-site stdout not captured) | TN | Communico-TN | 7 |
| Communico-PA libraries (aggregate — per-site stdout not captured) | PA | Communico-PA | 3 |
| Communico-NH libraries (aggregate — per-site stdout not captured) | NH | Communico-NH | 2 |


## 2026-08-15

Group 3 rotation day (day 15 → Group 3, the second Group 3 run this cycle, after 2026-08-12's recovery). Today's run covered 32 library-family scrapers: LibCal-FL, LibCal-NJ, LibCal-SC, LibCal-VA, LibCal-ME, LibCal-VA2, Communico-FL, Communico-MD, Communico-NY, Communico-PA, Communico-NH, Communico-TN, Communico-WV, BiblioCommons-MA, WordPress-PA, WordPress-MA, WordPress-KY, WordPress-SC, WordPress-WV, WordPress-DE, WordPress-RI, WordPress-NH, LibraryMarket-PA, LibraryMarket-NC, Dorchester-County, Wicomico-Public, Allentown-Public, WithApps-Libraries, WordPress-Events-Calendar, Squarespace-Libraries, Drupal-Virginia, Nashville-Library-TN, Orange-County-Library-FL (GoogleCalendar-MD and SandhillRegional-NC also ran today but were already logged this cycle on 2026-08-12). Every one of these except **LibCal-FL** was already logged earlier in this cycle (all 31 on 2026-08-12, as aggregates, during the Puppeteer-crash recovery), so per the "don't duplicate a scraper already logged this cycle" rule they are skipped here.

**LibCal-FL is new to this cycle.** It's the one scraper missing from 2026-08-12's table: that day's incident note said 37 scrapers failed to launch Chromium and "all 36 recovery-eligible scrapers were re-run" — LibCal-FL was the 37th, not recovered that day. It ran normally on today's scheduled pass and its per-site `📍 {library}` / `Found {N} events` lines reached `scraper-stdout.log` intact (lines 986486–986546), giving a true per-site breakdown rather than an aggregate.

| Library Website | State | Scraper | Events Found | Link |
|---|---|---|---|---|
| Lakeland Public Library | FL | LibCal-FL | 20 | https://lakelandpl.libcal.com/calendar?cid=2787&t=d&d=0000-00-00&cal=2787&inc=0 |
| Marion County Public Library System | FL | LibCal-FL | 10 | https://mcpls.libcal.com/ |
| Palm Beach County Library System | FL | LibCal-FL | 1 | https://pbclibrary.libcal.com/calendar?cid=-1&t=d |
| St. Johns County Public Library | FL | LibCal-FL | — (fetch failed, no per-site output) | https://sjcpls.libcal.com/calendar?cid=-1&t=d |
| Seminole County Library | FL | LibCal-FL | — (fetch failed, no per-site output) | https://seminolecountylibrary.libcal.com/calendar?cid=-1&t=d |

All 5 of LibCal-FL's configured sites are represented ("📍 5 sites tracked" in the run's own summary; "Failed: 2" matches the two rows with no `Found` line). The per-site sum (20+10+1=31) runs slightly below the scraper's aggregate FOUND (33) reported in `scraper-summary.log`; the 2-event gap isn't recoverable from stdout and isn't worth chasing for this audit.

**Cycle-completion check: still not complete.** Comparing every scraper logged 2026-08-10 through today against the 106 active library-family scrapers (`isScraperActive()` over `scrapers/scraper-registry.js`, excluding parks/venue/festival/community families that share the same per-site log shape but aren't libraries), 61 have at least one row this cycle and **46 do not**. Almost all of the gap is Group 2, which has never had a full scheduled rotation run this cycle — 2026-08-11 was a manual WordPress-NC/CT/TN debugging session that only incidentally touched a few Group 2 scrapers, and no make-up Group 2 run has landed since. Missing: BiblioCommons-GA, BiblioCommons-NC, BiblioCommons-NJ, BiblioCommons-VA, Berks-County, Brooklyn-Library, Cecil-County, Communico-AL, Communico-DC, Communico-GA, Communico-KY, Communico-MA, Communico-NC, Communico-NJ, Communico-SC, Communico-VA, CustomDrupal-Libraries, Drupal-Pennsylvania, EventActions-Libraries, FreeLibrary-Philadelphia, Graniculator-Morris, Howard-County, Intercept-Camden, LibCal-CT, LibCal-GA, LibCal-MA, LibCal-NY1, LibCal-PA, LibCal-TN, LibCal-VT, LibCal-WV, LibraryMarket, LibraryMarket-GA, LibraryMarket-ME-NH-MA, Louisville-Library, Prince-Georges-County, Rockbridge-Regional, SouthwestGeorgia-GA, Tockify-Horry, Westmoreland-Library, WordPress-FL, WordPress-MD, WordPress-ME, WordPress-MS, WordPress-NJ, WordPress-NY. The cycle continues; no `Cycle complete` marker is added.


## 2026-08-16

Group 1 rotation day; 50 non-MacaroniKid scrapers completed. MacaroniKid Group 1 (9 states, ~139 sites) started 13:43 EST and was **still running** when this section was written, so its states are not represented here and will need to land in a later section of this cycle.

**Only scrapers new to the current cycle are listed**, per this file's don't-duplicate rule. 26 of today's scrapers produced per-site `Found N events` output, but 24 of those were already logged this cycle (most on 2026-08-12's recovery pass), leaving **Communico-MA and Communico-VA** as the only genuinely new per-site entries. A further **8 library scrapers ran today with no per-site log output at all** and are recorded with their aggregate FOUND from `scraper-summary.log`, labelled as aggregates rather than silently presented as one site.

**Prince-Georges-County shows 0 and that row is the last one it will ever produce.** Diagnosed today as a platform migration — pgcmls.info moved to Communico, and the bespoke scraper was still parsing the pre-migration DOM, extracting only nav chrome ("events", "Calendar"). The library is now covered by **Communico-MD**, verified live the same day at **185 events across 26 branch venues**, and the dead scraper was deleted. See `SCRAPER-FIX-LOG.jsonl`. Because Communico-MD was already logged this cycle (2026-08-15), those 185 events do not appear as rows here; they will from the next Group 3 rotation.

| Library Website | State | Scraper | Events Found | Link |
|---|---|---|---|---|
| Worcester Public Library | MA | Communico-MA | 86 | https://mywpl.libnet.info/events |
| Prince William Public Library | VA | Communico-VA | 107 | https://pwcgov.libnet.info/events |
| BiblioCommons-NJ (scraper aggregate — 43 configured sites, no per-site log output) | NJ | BiblioCommons-NJ | 419 | — |
| BiblioCommons-VA (scraper aggregate — 43 configured sites, no per-site log output) | VA | BiblioCommons-VA | 340 | — |
| Communico-DC (scraper aggregate — 96 configured sites, no per-site log output) | DC | Communico-DC | 9 | — |
| Communico-NC (scraper aggregate — 96 configured sites, no per-site log output) | NC | Communico-NC | 2 | — |
| Drupal-Pennsylvania (scraper aggregate — 2 configured sites, no per-site log output) | PA | Drupal-Pennsylvania | 1665 | — |
| FreeLibrary-Philadelphia (scraper aggregate — no per-site log output) | PA | FreeLibrary-Philadelphia | 1000 | — |
| Prince-Georges-County (scraper aggregate — no per-site log output) | MD | Prince-Georges-County | 0 | https://pgcmls.info/events |
| Westmoreland-Library (scraper aggregate — no per-site log output) | PA | Westmoreland-Library | 18 | — |

**Cycle-completion check: not complete.** Of 106 active library-family scrapers, **70 have at least one entry this cycle and 36 do not**. The gap remains almost entirely Group 2, which still has not had a full scheduled rotation this cycle — the 2026-08-13 `macaroni-group2` log is two single-state manual runs (`--state ME`, `--state NH`), not a group pass. Missing: Berks-County, BiblioCommons-GA, BiblioCommons-NC, Brooklyn-Library, Cecil-County, Communico-AL, Communico-GA, Communico-KY, Communico-NJ, Communico-SC, CustomDrupal-Libraries, EventActions-Libraries, Graniculator-Morris, Howard-County, Intercept-Camden, LibCal-CT, LibCal-GA, LibCal-MA, LibCal-NY1, LibCal-PA, LibCal-TN, LibCal-VT, LibCal-WV, LibraryMarket, LibraryMarket-GA, LibraryMarket-ME-NH-MA, Louisville-Library, Rockbridge-Regional, SouthwestGeorgia-GA, Tockify-Horry, WordPress-FL, WordPress-MD, WordPress-ME, WordPress-MS, WordPress-NJ, WordPress-NY.

## 2026-08-18

Group 3 rotation day (run started 07:00:02Z). 25 library-family scrapers produced per-site breakdown (724 rows, via `build-library-site-audit.js --since=2026-08-18T07:00:02Z`). 11 more library scrapers ran today but emitted no per-site `📍`/`📚` lines the builder recognizes — each gets one fallback row below using its aggregate FOUND count from `scraper-summary.log`, per the "no per-library breakdown available for this state" rule (their single-digit-to-low-triple-digit counts are consistent with prior runs of the same scrapers, not a new regression).

| Library Website | State | Scraper | Events Found |
|---|---|---|---|
| Hernando County Public Library | FL | Communico-FL | 105 |
| Anne Arundel County Public Library | MD | Communico-MD | 24 |
| Massapequa Public Library | NY | Communico-NY | 197 |
| Poughkeepsie Public Library District | NY | Communico-NY | 24 |
| Handley Regional Library | VA | Drupal-Virginia | 24 |
| Somerset County Library | — | GoogleCalendar-MD | 170 |
| Camden County Library System | NJ | Intercept-Camden | 10 |
| Lakeland Public Library | FL | LibCal-FL | 20 |
| Marion County Public Library System | FL | LibCal-FL | 10 |
| Palm Beach County Library System | FL | LibCal-FL | 1 |
| Bangor Public Library | ME | LibCal-ME | 12 |
| BCCLS - Bergen County Cooperative Library System | NJ | LibCal-NJ | 3005 |
| Hunterdon County Library | NJ | LibCal-NJ | 48 |
| Jersey City Free Public Library | NJ | LibCal-NJ | 20 |
| Mercer County Library System | NJ | LibCal-NJ | 20 |
| Monmouth County Library System | NJ | LibCal-NJ | 20 |
| Montclair Public Library | NJ | LibCal-NJ | 20 |
| Newark Public Library | NJ | LibCal-NJ | 20 |
| Sussex County Library | NJ | LibCal-NJ | 10 |
| Union County Libraries | NJ | LibCal-NJ | 20 |
| Berkeley County Library System | SC | LibCal-SC | 20 |
| Charleston County Public Library | SC | LibCal-SC | 20 |
| Dorchester County Library | SC | LibCal-SC | 10 |
| Lexington County Public Library | SC | LibCal-SC | 10 |
| South Carolina State Library | SC | LibCal-SC | 20 |
| Arlington County Public Library | VA | LibCal-VA | 20 |
| Fairfax County Public Library | VA | LibCal-VA | 20 |
| Massanutten Regional Library | VA | LibCal-VA | 20 |
| Arlington Public Library | — | LibCal-VA2 | 14 |
| Fairfax County Public Library | — | LibCal-VA2 | 8 |
| Library of Virginia | — | LibCal-VA2 | 20 |
| Norfolk Public Library | — | LibCal-VA2 | 48 |
| Prince William Public Library System | — | LibCal-VA2 | 0 |
| Richmond Public Library | — | LibCal-VA2 | 20 |
| Roanoke Public Libraries | — | LibCal-VA2 | 48 |
| Suffolk Public Library | — | LibCal-VA2 | 20 |
| Williamsburg Regional Library | — | LibCal-VA2 | 5 |
| Buncombe County Libraries | — | LibraryMarket-NC | 6 |
| Hickory Public Library | — | LibraryMarket-NC | 4 |
| Bethlehem Area Public Library | — | LibraryMarket-PA | 24 |
| Lancaster Public Library | — | LibraryMarket-PA | 23 |
| York County Libraries | — | LibraryMarket-PA | 24 |
| Queen Anne's County Library | MD | Squarespace-Libraries | 74 |
| Hampton Public Library | VA | WithApps-Libraries | 43 |
| Appoquinimink Public Library | DE | WordPress-DE | 0 |
| Bear Library | DE | WordPress-DE | 0 |
| Brandywine Hundred Library | DE | WordPress-DE | 0 |
| Bridgeville Public Library | DE | WordPress-DE | 0 |
| Claymont Library | DE | WordPress-DE | 0 |
| Dover Public Library | DE | WordPress-DE | 0 |
| Elsmere Library | DE | WordPress-DE | 0 |
| Frankford Public Library | DE | WordPress-DE | 0 |
| Garfield Park Library | DE | WordPress-DE | 0 |
| Georgetown Public Library | DE | WordPress-DE | 0 |
| Hockessin Library | DE | WordPress-DE | 0 |
| Kent County Library | DE | WordPress-DE | 0 |
| Kirkwood Library | DE | WordPress-DE | 0 |
| Laurel Public Library | DE | WordPress-DE | 29 |
| Lewes Public Library | DE | WordPress-DE | 0 |
| Newark Free Library | DE | WordPress-DE | 0 |
| Rehoboth Beach Public Library | DE | WordPress-DE | 95 |
| Wilmington Public Library | DE | WordPress-DE | 0 |
| Woodlawn Library | DE | WordPress-DE | 0 |
| Alleghany Highlands Regional Library | VA | WordPress-Events-Calendar | 2 |
| Blackwater Regional Library | VA | WordPress-Events-Calendar | 50 |
| Bristol Public Library | VA | WordPress-Events-Calendar | 0 |
| Carnegie Library of Pittsburgh | PA | WordPress-Events-Calendar | 10 |
| Charlotte County Library | VA | WordPress-Events-Calendar | 50 |
| Galax-Carroll Regional Library | VA | WordPress-Events-Calendar | 50 |
| Halifax County-South Boston Library | VA | WordPress-Events-Calendar | 3 |
| Heritage Public Library | VA | WordPress-Events-Calendar | 0 |
| Osterhout Free Library | PA | WordPress-Events-Calendar | 20 |
| Pittsylvania County Public Library | VA | WordPress-Events-Calendar | 32 |
| Rappahannock County Library | VA | WordPress-Events-Calendar | 50 |
| Washington County Public Library | VA | WordPress-Events-Calendar | 9 |
| Wythe-Grayson Regional Library | VA | WordPress-Events-Calendar | 50 |
| Adair County Public Library | — | WordPress-KY | 0 |
| Allen County Public Library | — | WordPress-KY | 1 |
| Auburn Branch | — | WordPress-KY | 0 |
| Boone County Public Library | — | WordPress-KY | 9 |
| Bullitt County Public Library | — | WordPress-KY | 0 |
| Calloway County Public Library | — | WordPress-KY | 0 |
| Campbell County Public Library | — | WordPress-KY | 10 |
| Casey County Public Library | — | WordPress-KY | 11 |
| Christian County Public Library | — | WordPress-KY | 1 |
| Clark County Public Library | — | WordPress-KY | 0 |
| Crittenden County Public Library | — | WordPress-KY | 2 |
| Cynthiana-Harrison County Public Library | — | WordPress-KY | 0 |
| Daviess County Public Library | — | WordPress-KY | 12 |
| Estill County Public Library | — | WordPress-KY | 0 |
| Florence Branch | — | WordPress-KY | 71 |
| Floyd County Public Library | — | WordPress-KY | 1 |
| Fulton Public Library | — | WordPress-KY | 0 |
| Gallatin County Public Library | — | WordPress-KY | 2 |
| Goodnight Memorial Library | — | WordPress-KY | 0 |
| Grant County Public Library | — | WordPress-KY | 0 |
| Graves County Public Library | — | WordPress-KY | 56 |
| Greenup County Public Library | — | WordPress-KY | 0 |
| Hardin County Public Library | — | WordPress-KY | 0 |
| Harlan County Public Library | — | WordPress-KY | 0 |
| Henderson County Public Library | — | WordPress-KY | 80 |
| Hickman County Memorial Library | — | WordPress-KY | 0 |
| Irvington Branch | — | WordPress-KY | 0 |
| Jessamine County Public Library | — | WordPress-KY | 0 |
| Kenton County Public Library | — | WordPress-KY | 30 |
| Laurel County Public Library | — | WordPress-KY | 16 |
| Lents Branch | — | WordPress-KY | 0 |
| Lexington Public Library | — | WordPress-KY | 43 |
| Louisville Free Public Library | — | WordPress-KY | 26 |
| Madison County Public Library | — | WordPress-KY | 0 |
| Mahan-Oldham County Library | — | WordPress-KY | 0 |
| Marion County Public Library | — | WordPress-KY | 0 |
| Mary Wood Weldon Memorial Public Library | — | WordPress-KY | 23 |
| Mason County Public Library | — | WordPress-KY | 12 |
| McCracken County Public Library | — | WordPress-KY | 84 |
| Montgomery County Public Library | — | WordPress-KY | 2 |
| Nicholas County Public Library | — | WordPress-KY | 0 |
| Ohio County Public Library | — | WordPress-KY | 0 |
| Oldham County Public Library | — | WordPress-KY | 15 |
| Perry County Public Library | — | WordPress-KY | 9 |
| Pike County Public Library | — | WordPress-KY | 0 |
| Rebecca Caudill Public Library | — | WordPress-KY | 1 |
| Rowan County Public Library | — | WordPress-KY | 103 |
| Scott County Public Library | — | WordPress-KY | 1 |
| South Branch | — | WordPress-KY | 10 |
| Trimble County Public Library | — | WordPress-KY | 0 |
| Warren County Public Library | — | WordPress-KY | 10 |
| Washington County Public Library | — | WordPress-KY | 1 |
| Wayne County Public Library | — | WordPress-KY | 1 |
| Whitley County Public Library | — | WordPress-KY | 0 |
| Woodford County Library | — | WordPress-KY | 0 |
| Acton Memorial Library | MA | WordPress-MA | 0 |
| Agawam Public Library | MA | WordPress-MA | 5 |
| Aldenville Branch Library | MA | WordPress-MA | 2 |
| Amesbury Public Library | MA | WordPress-MA | 0 |
| Andrews Branch Library | MA | WordPress-MA | 0 |
| Aquinnah Public Library | MA | WordPress-MA | 2 |
| Ashby Free Public Library | MA | WordPress-MA | 0 |
| Athol Public Library | MA | WordPress-MA | 0 |
| Attleboro Public Library | MA | WordPress-MA | 1 |
| Auburn Free Public Library | MA | WordPress-MA | 0 |
| Auburndale Branch Library | MA | WordPress-MA | 11 |
| Ayer Public Library | MA | WordPress-MA | 1 |
| Beals Memorial Library | MA | WordPress-MA | 0 |
| Bedford Free Public Library | MA | WordPress-MA | 0 |
| Bellingham Public Library | MA | WordPress-MA | 0 |
| Belmont Public Library | MA | WordPress-MA | 8 |
| Berkley Public Library | MA | WordPress-MA | 0 |
| Berkshire Athenaeum | MA | WordPress-MA | 5 |
| Bigelow Free Public Library | MA | WordPress-MA | 0 |
| Billerica Public Library | MA | WordPress-MA | 0 |
| Blackstone Free Public Library | MA | WordPress-MA | 0 |
| Blanding Public Library | MA | WordPress-MA | 0 |
| Boxford Town Library | MA | WordPress-MA | 0 |
| Boylston Public Library | MA | WordPress-MA | 0 |
| Boynton Public Library | MA | WordPress-MA | 0 |
| Brewster Ladies Library Assoc. | MA | WordPress-MA | 3 |
| Brighton Branch Library | MA | WordPress-MA | 0 |
| Brightwood Branch Library | MA | WordPress-MA | 1 |
| Brimfield Public Library | MA | WordPress-MA | 2 |
| Brookline Public Library | MA | WordPress-MA | 0 |
| Bushnell-Sage Library | MA | WordPress-MA | 0 |
| Cambridge Public Library | MA | WordPress-MA | 13 |
| Carver Public Library | MA | WordPress-MA | 0 |
| Cary Memorial Library | MA | WordPress-MA | 0 |
| Casa Da Saudade | MA | WordPress-MA | 0 |
| Centerville Public Library | MA | WordPress-MA | 58 |
| Chelmsford Public Library | MA | WordPress-MA | 0 |
| Chelsea Public Library | MA | WordPress-MA | 0 |
| Chester C. Corbin Public Library | MA | WordPress-MA | 0 |
| Chesterfield Public Library | MA | WordPress-MA | 1 |
| Chilmark Free Public Library | MA | WordPress-MA | 2 |
| Clarksburg Town Library | MA | WordPress-MA | 15 |
| Conant Free Public Library | MA | WordPress-MA | 0 |
| Concord Free Public Library | MA | WordPress-MA | 1 |
| Cotuit Library | MA | WordPress-MA | 1 |
| Dalton Free Public Library | MA | WordPress-MA | 27 |
| David Joyce Milne Public Library | MA | WordPress-MA | 29 |
| Dighton Public Library | MA | WordPress-MA | 0 |
| Dover Town Library | MA | WordPress-MA | 0 |
| Dudley Branch Library | MA | WordPress-MA | 27 |
| East Bridgewater Public Library | MA | WordPress-MA | 0 |
| East End Branch Library | MA | WordPress-MA | 1 |
| East Milton Branch Library | MA | WordPress-MA | 0 |
| Eastham Public Library | MA | WordPress-MA | 2 |
| Edgartown Free Public Library | MA | WordPress-MA | 0 |
| Edith M. Fox Library | MA | WordPress-MA | 4 |
| Edwards Public Library | MA | WordPress-MA | 9 |
| Eldredge Public Library | MA | WordPress-MA | 1 |
| Elizabeth Taber Memorial Library | MA | WordPress-MA | 3 |
| Emily Williston Memorial Library | MA | WordPress-MA | 32 |
| Fitchburg Public Library | MA | WordPress-MA | 1 |
| Five Corners Library | MA | WordPress-MA | 0 |
| Flint Public Library | MA | WordPress-MA | 0 |
| Forbush Memorial Library | MA | WordPress-MA | 0 |
| Framingham Public Library | MA | WordPress-MA | 77 |
| Frances Perkins Branch Library At Greendale | MA | WordPress-MA | 1 |
| Franklin Public Library | MA | WordPress-MA | 0 |
| G. A. R. Memorial Library | MA | WordPress-MA | 0 |
| Gleason Public Library | MA | WordPress-MA | 0 |
| Gloucester Lyceum Sawyer Free Lib | MA | WordPress-MA | 0 |
| Goshen Free Public Library | MA | WordPress-MA | 0 |
| Grace Hall Memorial Library | MA | WordPress-MA | 0 |
| Grafton Public Library | MA | WordPress-MA | 0 |
| Granby Free Public Library | MA | WordPress-MA | 1 |
| Granville Public Library | MA | WordPress-MA | 3 |
| Hamilton Memorial Library | MA | WordPress-MA | 0 |
| Hanson Public Library | MA | WordPress-MA | 0 |
| Harvard Public Library | MA | WordPress-MA | 9 |
| Harwich Port Library Assoc. | MA | WordPress-MA | 1 |
| Haston Free Public Library | MA | WordPress-MA | 0 |
| Haverhill Public Library | MA | WordPress-MA | 0 |
| Hazen Memorial Library | MA | WordPress-MA | 1 |
| Heath Free Public Library | MA | WordPress-MA | 0 |
| Hingham Public Library | MA | WordPress-MA | 1 |
| Holbrook Public Library | MA | WordPress-MA | 0 |
| Holland Public Library | MA | WordPress-MA | 0 |
| Holliston Public Library | MA | WordPress-MA | 0 |
| Holyoke Public Library | MA | WordPress-MA | 82 |
| Hopkinton Public Library | MA | WordPress-MA | 0 |
| Hubbardston Public Library | MA | WordPress-MA | 7 |
| Hudson Public Library | MA | WordPress-MA | 1 |
| Huntington Public Library | MA | WordPress-MA | 0 |
| Hyannis Public Library Assoc. | MA | WordPress-MA | 133 |
| Hyde Park Branch Library | MA | WordPress-MA | 27 |
| Ipswich Public Library | MA | WordPress-MA | 0 |
| Islington Branch Library | MA | WordPress-MA | 0 |
| J. V. Fletcher Library | MA | WordPress-MA | 1 |
| Jonathan Bourne Public Library | MA | WordPress-MA | 0 |
| Jones Library, Inc. | MA | WordPress-MA | 9 |
| Joseph H. Plumb Memorial Library | MA | WordPress-MA | 0 |
| Joshua Hyde Public Library | MA | WordPress-MA | 72 |
| Kingston Public Library | MA | WordPress-MA | 10 |
| Lakeville Free Public Library | MA | WordPress-MA | 0 |
| Lawrence Public Library | MA | WordPress-MA | 4 |
| Leicester Public Library | MA | WordPress-MA | 0 |
| Lenox Library Association | MA | WordPress-MA | 0 |
| Leominster Public Library | MA | WordPress-MA | 0 |
| Leverett Library | MA | WordPress-MA | 0 |
| Levi Heywood Memorial Library | MA | WordPress-MA | 7 |
| Lilly Library | MA | WordPress-MA | 71 |
| Lucius Beebe Memorial Library | MA | WordPress-MA | 3 |
| Lunenburg Public Library | MA | WordPress-MA | 0 |
| Lynnfield Public Library | MA | WordPress-MA | 0 |
| Mashpee Public Library | MA | WordPress-MA | 13 |
| Mattapoisett Public Library | MA | WordPress-MA | 0 |
| Medfield Memorial Library | MA | WordPress-MA | 0 |
| Medford Public Library | MA | WordPress-MA | 0 |
| Memorial Hall Library | MA | WordPress-MA | 0 |
| Merriam-Gilbert Public Library | MA | WordPress-MA | 0 |
| Merrimac Public Library | MA | WordPress-MA | 0 |
| Middlefield Public Library | MA | WordPress-MA | 0 |
| Millbury Public Library | MA | WordPress-MA | 0 |
| Millicent Library | MA | WordPress-MA | 0 |
| Millis Public Library | MA | WordPress-MA | 1 |
| Millville Free Public Library | MA | WordPress-MA | 6 |
| Monterey Public Library | MA | WordPress-MA | 0 |
| Morrill Memorial Library | MA | WordPress-MA | 1 |
| Moses Greeley Parker Memorial Lib. | MA | WordPress-MA | 0 |
| Nahant Public Library | MA | WordPress-MA | 34 |
| Nantucket Atheneum | MA | WordPress-MA | 0 |
| Needham Free Public Library | MA | WordPress-MA | 0 |
| Newton Free Library | MA | WordPress-MA | 0 |
| North Adams Public Library | MA | WordPress-MA | 1 |
| Northborough Free Library | MA | WordPress-MA | 0 |
| Norton Public Library | MA | WordPress-MA | 45 |
| Oak Bluffs Public Library | MA | WordPress-MA | 0 |
| Oxford Free Public Library | MA | WordPress-MA | 0 |
| Palmer Public Library | MA | WordPress-MA | 0 |
| Paul Pratt Memorial Library | MA | WordPress-MA | 0 |
| Peabody Institute Library | MA | WordPress-MA | 1 |
| Peru Library | MA | WordPress-MA | 28 |
| Petersham Memorial Library | MA | WordPress-MA | 0 |
| Phinehas S. Newton Library | MA | WordPress-MA | 0 |
| Plainville Public Library | MA | WordPress-MA | 0 |
| Plympton Public Library | MA | WordPress-MA | 30 |
| Pollard Memorial Library | MA | WordPress-MA | 0 |
| Provincetown Public Library | MA | WordPress-MA | 39 |
| Reading Public Library | MA | WordPress-MA | 1 |
| Reuben Hoar Library | MA | WordPress-MA | 0 |
| Revere Public Library | MA | WordPress-MA | 1 |
| Richard Salter Storrs Library | MA | WordPress-MA | 0 |
| Richards Memorial Library | MA | WordPress-MA | 1 |
| Rockport Public Library | MA | WordPress-MA | 1 |
| Rowley Public Library | MA | WordPress-MA | 0 |
| Russell Public Library | MA | WordPress-MA | 1 |
| Rutland Free Public Library | MA | WordPress-MA | 0 |
| Salem Public Library | MA | WordPress-MA | 0 |
| Salisbury Public Library | MA | WordPress-MA | 0 |
| Sandisfield Public Library | MA | WordPress-MA | 13 |
| Scituate Town Library | MA | WordPress-MA | 21 |
| Seekonk Public Library | MA | WordPress-MA | 0 |
| Shaw Memorial Library | MA | WordPress-MA | 1 |
| Sherborn Library | MA | WordPress-MA | 0 |
| Shrewsbury Free Public Library | MA | WordPress-MA | 0 |
| Simon Fairfield Public Library | MA | WordPress-MA | 4 |
| Somerset Public Library | MA | WordPress-MA | 0 |
| South Dennis Free Public Library | MA | WordPress-MA | 0 |
| Stevens Memorial Library | MA | WordPress-MA | 0 |
| Stockbridge Library Association | MA | WordPress-MA | 12 |
| Stoneham Public Library | MA | WordPress-MA | 4 |
| Stoughton Public Library | MA | WordPress-MA | 1 |
| Swampscott Public Library | MA | WordPress-MA | 1 |
| Swansea Free Public Library | MA | WordPress-MA | 0 |
| T.O.H.P. Burnham Free Library | MA | WordPress-MA | 8 |
| Taft Public Library | MA | WordPress-MA | 15 |
| Taunton Public Library | MA | WordPress-MA | 0 |
| Taylor Memorial Library | MA | WordPress-MA | 0 |
| Tewksbury Public Library | MA | WordPress-MA | 1 |
| Topsfield Town Library | MA | WordPress-MA | 0 |
| Townsend Public Library | MA | WordPress-MA | 0 |
| Tyler Memorial Library | MA | WordPress-MA | 0 |
| Uxbridge Free Public Library | MA | WordPress-MA | 0 |
| Ventress Memorial Library | MA | WordPress-MA | 0 |
| Waban Branch Library | MA | WordPress-MA | 4 |
| Walpole Public Library | MA | WordPress-MA | 48 |
| Warren Public Library | MA | WordPress-MA | 0 |
| Wayland Free Public Library | MA | WordPress-MA | 0 |
| Wellfleet Public Library | MA | WordPress-MA | 31 |
| West Dennis Free Public Library | MA | WordPress-MA | 0 |
| West Falmouth Library, Inc. | MA | WordPress-MA | 12 |
| Westborough Public Library | MA | WordPress-MA | 8 |
| Westfield Athenaeum | MA | WordPress-MA | 26 |
| Westhampton Memorial Library | MA | WordPress-MA | 0 |
| Weston Public Library | MA | WordPress-MA | 2 |
| Westport Free Public Library | MA | WordPress-MA | 15 |
| Whitinsville Social Library | MA | WordPress-MA | 0 |
| Wilbraham Public Library | MA | WordPress-MA | 0 |
| Wilmington Memorial Library | MA | WordPress-MA | 8 |
| Winchester Public Library | MA | WordPress-MA | 0 |
| Windsor Free Public Library | MA | WordPress-MA | 0 |
| Woods Memorial Library | MA | WordPress-MA | 1 |
| Young Mens Library Association | MA | WordPress-MA | 0 |
| Amherst Town Library | NH | WordPress-NH | 1 |
| Andover Public Library | NH | WordPress-NH | 0 |
| Barrington Public Library | NH | WordPress-NH | 2 |
| Bartlett Public Library | NH | WordPress-NH | 67 |
| Bath Public Library | NH | WordPress-NH | 21 |
| Bedford Public Library | NH | WordPress-NH | 2 |
| Belmont Public Library | NH | WordPress-NH | 10 |
| Bethlehem Public Library | NH | WordPress-NH | 0 |
| Blaisdell Memorial Library | NH | WordPress-NH | 1 |
| Bremer Pond Memorial Library | NH | WordPress-NH | 2 |
| Brown Memorial Library | NH | WordPress-NH | 0 |
| Byron G. Merrill Library | NH | WordPress-NH | 0 |
| Canaan Town Library | NH | WordPress-NH | 12 |
| Chamberlin Free Public Library | NH | WordPress-NH | 270 |
| Chester Public Library | NH | WordPress-NH | 0 |
| Chesterfield Public Library | NH | WordPress-NH | 1 |
| Chocorua Public Library | NH | WordPress-NH | 2 |
| Conant Public Library | NH | WordPress-NH | 1 |
| Concord Public Library | NH | WordPress-NH | 0 |
| Cook Memorial Library | NH | WordPress-NH | 10 |
| Dalton Public Library | NH | WordPress-NH | 35 |
| Derry Public Library | NH | WordPress-NH | 0 |
| Dover Public Library | NH | WordPress-NH | 0 |
| Dublin Public Library | NH | WordPress-NH | 1 |
| Dunbarton Public Library | NH | WordPress-NH | 0 |
| East Kingston Public Library | NH | WordPress-NH | 0 |
| East Rochester Public Library | NH | WordPress-NH | 0 |
| Effingham Free Public Library | NH | WordPress-NH | 0 |
| Elkins Library | NH | WordPress-NH | 0 |
| Exeter Public Library | NH | WordPress-NH | 0 |
| Fiske Free Library | NH | WordPress-NH | 0 |
| Franklin Public Library | NH | WordPress-NH | 3 |
| Fremont Public Library | NH | WordPress-NH | 0 |
| G. E.P. Dodge Library | NH | WordPress-NH | 40 |
| Gale Library | NH | WordPress-NH | 0 |
| George Gamble Library | NH | WordPress-NH | 1 |
| George Holmes Bixby Memorial Library | NH | WordPress-NH | 0 |
| Gilford Public Library | NH | WordPress-NH | 1 |
| Goffstown Public Library | NH | WordPress-NH | 0 |
| Goodwin Library | NH | WordPress-NH | 9 |
| Gorham Public Library | NH | WordPress-NH | 1 |
| Griffin Free Public Library | NH | WordPress-NH | 33 |
| Hampstead Public Library | NH | WordPress-NH | 0 |
| Hampton Falls Free Library | NH | WordPress-NH | 45 |
| Hampton Lane Memorial Library | NH | WordPress-NH | 0 |
| Hancock Town Library | NH | WordPress-NH | 1 |
| Harvey-Mitchell Memorial Library | NH | WordPress-NH | 1 |
| Haverhill Library Association | NH | WordPress-NH | 0 |
| Hebron Public Library | NH | WordPress-NH | 0 |
| Hill Public Library | NH | WordPress-NH | 11 |
| Holderness Library | NH | WordPress-NH | 0 |
| Hollis Social Library | NH | WordPress-NH | 0 |
| Hooksett Public Library | NH | WordPress-NH | 1 |
| Hudson Rodgers Memorial Library | NH | WordPress-NH | 1 |
| James E. Nichols Memorial Library | NH | WordPress-NH | 4 |
| Joseph Patch Library | NH | WordPress-NH | 1 |
| Josiah Carpenter Library | NH | WordPress-NH | 0 |
| Laconia Public Library | NH | WordPress-NH | 0 |
| Laura Johnson Memorial Library | NH | WordPress-NH | 1 |
| Lebanon Public Libraries | NH | WordPress-NH | 3 |
| Libbie A. Cass Memorial Library | NH | WordPress-NH | 0 |
| Littleton Public Library | NH | WordPress-NH | 0 |
| Londonderry Leach Library | NH | WordPress-NH | 0 |
| Madbury Public Library | NH | WordPress-NH | 1 |
| Madison Library | NH | WordPress-NH | 9 |
| Manchester City Library | NH | WordPress-NH | 3 |
| Mansfield Public Library | NH | WordPress-NH | 0 |
| Mary E. Bartlett Library | NH | WordPress-NH | 0 |
| Mason Public Library | NH | WordPress-NH | 1 |
| Meredith Public Library | NH | WordPress-NH | 2 |
| Merrimack Public Library | NH | WordPress-NH | 0 |
| Milan Public Library | NH | WordPress-NH | 0 |
| Milford Wadleigh Memorial Library | NH | WordPress-NH | 1 |
| Monroe Public Library | NH | WordPress-NH | 0 |
| Moultonborough Public Library | NH | WordPress-NH | 1 |
| Nashua Public Library | NH | WordPress-NH | 0 |
| New Durham Public Library | NH | WordPress-NH | 15 |
| New Ipswich Library | NH | WordPress-NH | 0 |
| Newbury Public Library | NH | WordPress-NH | 1 |
| Newfields Public Library | NH | WordPress-NH | 10 |
| Newmarket Public Library | NH | WordPress-NH | 0 |
| Nichols Memorial Library | NH | WordPress-NH | 11 |
| Olive G. Pettis Library | NH | WordPress-NH | 0 |
| Olivia Rodham Memorial Library | NH | WordPress-NH | 26 |
| Pembroke Town Library | NH | WordPress-NH | 156 |
| Philbrick-James Library | NH | WordPress-NH | 1 |
| Philip Read Memorial Library | NH | WordPress-NH | 0 |
| Pike Library | NH | WordPress-NH | 0 |
| Pillsbury Free Library | NH | WordPress-NH | 9 |
| Rollinsford Public Library | NH | WordPress-NH | 23 |
| Rye Public Library | NH | WordPress-NH | 0 |
| Salem Kelley Library | NH | WordPress-NH | 0 |
| Salisbury Free Library | NH | WordPress-NH | 0 |
| Stark Public Library | NH | WordPress-NH | 43 |
| Sullivan Public Library | NH | WordPress-NH | 0 |
| Tracy Memorial Library | NH | WordPress-NH | 12 |
| Wakefield Public Library | NH | WordPress-NH | 5 |
| Walpole Town Library | NH | WordPress-NH | 48 |
| Webster Free Public Library | NH | WordPress-NH | 15 |
| Westmoreland Public Library | NH | WordPress-NH | 0 |
| Whitefield Public Library | NH | WordPress-NH | 8 |
| Wilmot Public Library | NH | WordPress-NH | 5 |
| Wilton Public Gregg Free Library | NH | WordPress-NH | 1 |
| Windham Nesmith Library | NH | WordPress-NH | 1 |
| Wolfeboro Public Library | NH | WordPress-NH | 1 |
| Adams Memorial Library | — | WordPress-PA | 29 |
| Albright Memorial Library | — | WordPress-PA | 0 |
| Altoona Area Public Library | — | WordPress-PA | 70 |
| Andrew Carnegie Free Library | — | WordPress-PA | 10 |
| Aston Public Library | — | WordPress-PA | 0 |
| Avalon Public Library | — | WordPress-PA | 0 |
| Avella Area Library Center | — | WordPress-PA | 0 |
| Avonmore Public Library | — | WordPress-PA | 0 |
| Back Mountain Memorial Library | — | WordPress-PA | 7 |
| Bangor Public Library | — | WordPress-PA | 0 |
| Barbara Moscato Brown Memorial Library | — | WordPress-PA | 0 |
| Beaver County Bookmobile Schedule | — | WordPress-PA | 4 |
| Belle Vernon Public Library | — | WordPress-PA | 0 |
| Bellwood Antis Public Library | — | WordPress-PA | 11 |
| Berks County Public Libraries | — | WordPress-PA | 0 |
| Bernville Area Community Library | — | WordPress-PA | 0 |
| Bethel Park Public Library | — | WordPress-PA | 0 |
| Bethel-Tulpehocken Public Library | — | WordPress-PA | 0 |
| Bethlehem Area Public Library | — | WordPress-PA | 0 |
| Borough Of Folcroft Public Library | — | WordPress-PA | 0 |
| Bosler Free Library | — | WordPress-PA | 0 |
| Boyertown Community Library | — | WordPress-PA | 0 |
| Bradford Area Public Library | — | WordPress-PA | 0 |
| Bridgeville Public Library | — | WordPress-PA | 0 |
| Bucks County Free Library - Fallsington Library | — | WordPress-PA | 0 |
| Bucks County Free Library - Pipersville Free Library | — | WordPress-PA | 0 |
| Bucks County Free Library - Village Library Of Wrightstown | — | WordPress-PA | 0 |
| Butler Area Public Library | — | WordPress-PA | 1 |
| Carbondale Public Library | — | WordPress-PA | 0 |
| Carnegie Free Library Of Swissvale | — | WordPress-PA | 0 |
| Carnegie Library Of Mckeesport | — | WordPress-PA | 0 |
| Carnegie Library Of Mckeesport - White Oak | — | WordPress-PA | 0 |
| Carnegie Library of Pittsburgh | — | WordPress-PA | 10 |
| Carnegie Library, Midland | — | WordPress-PA | 0 |
| Chester Springs Library | — | WordPress-PA | 0 |
| Clairton Public Library | — | WordPress-PA | 0 |
| Claysburg Area Public Library Inc | — | WordPress-PA | 0 |
| Coatesville Area Public Library | — | WordPress-PA | 0 |
| Community College Of Beaver County | — | WordPress-PA | 0 |
| Community Library Of Castle Shannon | — | WordPress-PA | 0 |
| Cooperstown Public Library | — | WordPress-PA | 0 |
| Coraopolis Memorial Library | — | WordPress-PA | 0 |
| Corry Public Library | — | WordPress-PA | 5 |
| Coudersport Public Library | — | WordPress-PA | 4 |
| Dalton Community Library | — | WordPress-PA | 24 |
| Darby Library | — | WordPress-PA | 4 |
| Degenstein Community Library | — | WordPress-PA | 4 |
| Delmont Public Library | — | WordPress-PA | 12 |
| Downingtown Library Company | — | WordPress-PA | 0 |
| East Berlin Community Library | — | WordPress-PA | 1 |
| Ellwood City Area Pub Library | — | WordPress-PA | 0 |
| Emmaus Public Library | — | WordPress-PA | 0 |
| Erie County Public Library | — | WordPress-PA | 0 |
| Evans City Public Library | — | WordPress-PA | 0 |
| Everett Free Library | — | WordPress-PA | 0 |
| Fleetwood Area Public Library | — | WordPress-PA | 0 |
| Foxburg Free Library Association | — | WordPress-PA | 0 |
| Francis J. Catania Law Library | — | WordPress-PA | 0 |
| Free Library of Philadelphia | — | WordPress-PA | 0 |
| Genesee Area Library | — | WordPress-PA | 0 |
| Glenolden Library | — | WordPress-PA | 0 |
| Green Free Library | — | WordPress-PA | 0 |
| Hamlin Memorial Library | — | WordPress-PA | 0 |
| Hawley Library | — | WordPress-PA | 0 |
| Hazleton Area Public Library | — | WordPress-PA | 0 |
| Hellertown Area Library | — | WordPress-PA | 0 |
| Hershey Public Library | — | WordPress-PA | 0 |
| Hollidaysburg Area Public Library | — | WordPress-PA | 0 |
| Honey Brook Community Library | — | WordPress-PA | 0 |
| Horsham Township Library | — | WordPress-PA | 0 |
| Hoyt Library | — | WordPress-PA | 0 |
| Hughesville Area Public Library | — | WordPress-PA | 28 |
| Huntingdon County Library | — | WordPress-PA | 3 |
| Hyndman-Londonderry Public Library | — | WordPress-PA | 0 |
| Jefferson Hills Public Library | — | WordPress-PA | 1 |
| Jefferson Resource Center And Computer Lab | — | WordPress-PA | 0 |
| Jenkintown Library | — | WordPress-PA | 2 |
| Johnsonburg Public Library | — | WordPress-PA | 0 |
| Joseph T. Simpson Public Library | — | WordPress-PA | 0 |
| Lansdale Public Library | — | WordPress-PA | 10 |
| Lansdowne Public Library | — | WordPress-PA | 1 |
| Lebanon Community Library | — | WordPress-PA | 0 |
| Ligonier Valley Library | — | WordPress-PA | 12 |
| Lilly Washington Pub Library | — | WordPress-PA | 0 |
| Lititz Public Library | — | WordPress-PA | 0 |
| Louisa Gonser Community Library Inc | — | WordPress-PA | 2 |
| Malvern Public Library | — | WordPress-PA | 0 |
| Manheim Community Library | — | WordPress-PA | 0 |
| Marian Sutherland Kirby Library | — | WordPress-PA | 27 |
| Marienville Area Library | — | WordPress-PA | 0 |
| Mars Area Public Library | — | WordPress-PA | 0 |
| Martinsburg Community Library | — | WordPress-PA | 1 |
| Mary S Biesecker Public Library | — | WordPress-PA | 0 |
| Meadville Public Library | — | WordPress-PA | 0 |
| Memorial Library Of Nazareth Vicinity | — | WordPress-PA | 5 |
| Mengle Memorial Library | — | WordPress-PA | 0 |
| Mercer Area Library | — | WordPress-PA | 0 |
| Meyersdale Public Library | — | WordPress-PA | 0 |
| Middletown Public Library | — | WordPress-PA | 0 |
| Mifflin County Library | — | WordPress-PA | 0 |
| Minersville Public Library | — | WordPress-PA | 0 |
| Monessen Public Library District Center | — | WordPress-PA | 0 |
| Monroeton Public Library | — | WordPress-PA | 4 |
| Monroeville Public Library | — | WordPress-PA | 0 |
| Montgomery Area Public Library | — | WordPress-PA | 0 |
| Moores Memorial Library | — | WordPress-PA | 0 |
| Mount Pleasant Free Public Library Association | — | WordPress-PA | 0 |
| Murrysville Community Library | — | WordPress-PA | 0 |
| Narberth Community Library | — | WordPress-PA | 10 |
| New Cumberland Public Library | — | WordPress-PA | 0 |
| New Florence Community Library | — | WordPress-PA | 11 |
| North Versailles Public Library | — | WordPress-PA | 0 |
| North Wales Library | — | WordPress-PA | 0 |
| Northern Wayne Community Library | — | WordPress-PA | 0 |
| Norwood Public Library | — | WordPress-PA | 0 |
| Oakmont Carnegie Library | — | WordPress-PA | 5 |
| Oil City Library | — | WordPress-PA | 0 |
| Orwigsburg Area Fr Pub Library | — | WordPress-PA | 0 |
| Parkesburg Free Library | — | WordPress-PA | 1 |
| Paul Smith Library Of Southern York County | — | WordPress-PA | 0 |
| Pequea Valley Public Library | — | WordPress-PA | 3 |
| Pequea Valley Public Library - Gap Branch | — | WordPress-PA | 0 |
| Phoenixville Public Library | — | WordPress-PA | 1 |
| Portage Public Library | — | WordPress-PA | 2 |
| Pottsville Free Public Library | — | WordPress-PA | 12 |
| Pratt Memorial Library | — | WordPress-PA | 1 |
| Priestley Forsyth Memorial Library | — | WordPress-PA | 0 |
| Prospect Community Library | — | WordPress-PA | 0 |
| Prospect Park Free Library | — | WordPress-PA | 0 |
| Punxsutawney Memorial Library | — | WordPress-PA | 0 |
| Quarryville Library Center | — | WordPress-PA | 0 |
| Ralston Link | — | WordPress-PA | 0 |
| Reynoldsville Public Library | — | WordPress-PA | 0 |
| Richland Community Library | — | WordPress-PA | 0 |
| Ridgway Public Library | — | WordPress-PA | 0 |
| Ridley Park Public Library | — | WordPress-PA | 0 |
| Ringtown Area Library | — | WordPress-PA | 0 |
| Roaring Spring Comm Library | — | WordPress-PA | 0 |
| Robesonia Community Library | — | WordPress-PA | 0 |
| Rochester Public Library | — | WordPress-PA | 0 |
| Sarah S Bovard Memorial Library | — | WordPress-PA | 0 |
| Saxonburg Area Library | — | WordPress-PA | 0 |
| Saxton Community Library | — | WordPress-PA | 0 |
| Scottdale Public Library | — | WordPress-PA | 0 |
| Sewickley Public Library | — | WordPress-PA | 4 |
| Sheffield Township Library | — | WordPress-PA | 0 |
| Shippensburg Public Library | — | WordPress-PA | 0 |
| Sinking Spring Public Library | — | WordPress-PA | 0 |
| Slatington Library Inc | — | WordPress-PA | 0 |
| Smithfield Library | — | WordPress-PA | 0 |
| South Fayette Township Library | — | WordPress-PA | 0 |
| South Park Township Library | — | WordPress-PA | 0 |
| Spalding Memorial Library | — | WordPress-PA | 0 |
| Spring City Free Public Library | — | WordPress-PA | 0 |
| Springdale Free Public Library | — | WordPress-PA | 0 |
| Springfield Township Library | — | WordPress-PA | 1 |
| Strasburg-Heisler Library | — | WordPress-PA | 0 |
| Summerville Public Library | — | WordPress-PA | 0 |
| Sykesville Public Library | — | WordPress-PA | 0 |
| Taylor Community Library | — | WordPress-PA | 6 |
| Towanda Public Library | — | WordPress-PA | 5 |
| Trafford Community Public Library | — | WordPress-PA | 3 |
| Tunkhannock Public Library | — | WordPress-PA | 0 |
| Tyrone-Snyder Township Public Library | — | WordPress-PA | 0 |
| Union Library Company Of Hatborough | — | WordPress-PA | 0 |
| Warren Library Association | — | WordPress-PA | 0 |
| Waterford Public Library | — | WordPress-PA | 0 |
| West Chester Public Library | — | WordPress-PA | 0 |
| West Newton Public Library | — | WordPress-PA | 3 |
| West Pittston Library | — | WordPress-PA | 0 |
| Westfield Public Library | — | WordPress-PA | 0 |
| Wilcox Public Library | — | WordPress-PA | 0 |
| Wilkinsburg Public Library | — | WordPress-PA | 0 |
| Windber Public Library Association | — | WordPress-PA | 0 |
| Wyalusing Public Library | — | WordPress-PA | 11 |
| Yeadon Public Library | — | WordPress-PA | 0 |
| Zelienople Public Library | — | WordPress-PA | 33 |
| Ashaway Free Library | RI | WordPress-RI | 0 |
| Brownell Library, Home Of Little Compton | RI | WordPress-RI | 59 |
| Central Falls Free Public Library | RI | WordPress-RI | 0 |
| Coventry Public Library | RI | WordPress-RI | 2 |
| East Greenwich Free Library | RI | WordPress-RI | 1 |
| Essex Public Library | RI | WordPress-RI | 1 |
| Exeter Public Library | RI | WordPress-RI | 0 |
| Fairmount Branch | RI | WordPress-RI | 19 |
| Fox Point Library | RI | WordPress-RI | 1 |
| George Hail Free Library | RI | WordPress-RI | 0 |
| Greene Public Library | RI | WordPress-RI | 0 |
| Greenville Public Library | RI | WordPress-RI | 13 |
| Harmony Library | RI | WordPress-RI | 0 |
| Island Free Library | RI | WordPress-RI | 0 |
| Knight Memorial Library | RI | WordPress-RI | 1 |
| Langworthy Public Library | RI | WordPress-RI | 14 |
| Louttit Memorial Library | RI | WordPress-RI | 0 |
| Marian J. Mohr Memorial Library | RI | WordPress-RI | 0 |
| Middletown Public Library | RI | WordPress-RI | 0 |
| Mount Pleasant Library | RI | WordPress-RI | 1 |
| North Smithfield Public Library | RI | WordPress-RI | 0 |
| Olneyville Library | RI | WordPress-RI | 1 |
| Pascoag Free Public Library | RI | WordPress-RI | 10 |
| Portsmouth Free Public Library | RI | WordPress-RI | 0 |
| Providence Public Library | RI | WordPress-RI | 1 |
| Rochambeau Library | RI | WordPress-RI | 1 |
| Rogers Free Library | RI | WordPress-RI | 0 |
| Rumford Branch | RI | WordPress-RI | 0 |
| Smith Hill Library | RI | WordPress-RI | 1 |
| South Providence Library | RI | WordPress-RI | 1 |
| Wanskuck Library | RI | WordPress-RI | 1 |
| Washington Park Library | RI | WordPress-RI | 1 |
| Westerly Public Library | RI | WordPress-RI | 4 |
| Woonsocket Harris Public Library | RI | WordPress-RI | 19 |
| Abbeville County Library System | SC | WordPress-SC | 0 |
| Aiken County Library - Midland Valley Branch Library | SC | WordPress-SC | 1 |
| Anderson County Library | SC | WordPress-SC | 109 |
| Anderson County Library - Piedmont Branch Library | SC | WordPress-SC | 0 |
| Berkeley County Library - Sangaree Library | SC | WordPress-SC | 0 |
| Chester County Library | SC | WordPress-SC | 0 |
| Chesterfield County Library System | SC | WordPress-SC | 0 |
| Clinton Public Library | SC | WordPress-SC | 0 |
| Dillon County Library System | SC | WordPress-SC | 1 |
| Edgefield County Public Library - Johnston Branch (Mobley Library) | SC | WordPress-SC | 0 |
| Florence County Library System | SC | WordPress-SC | 71 |
| Great Falls Library | SC | WordPress-SC | 56 |
| Greenville County Library - Anderson Road (West) Branch | SC | WordPress-SC | 12 |
| Hal Kohn Memorial Library | SC | WordPress-SC | 0 |
| Hampton County Library - Estill Branch Library | SC | WordPress-SC | 0 |
| Horry County Memorial Library - Loris Library | SC | WordPress-SC | 0 |
| Kershaw County Library - Camden Branch Library | SC | WordPress-SC | 1 |
| Kershaw County Library - Elgin Branch Library | SC | WordPress-SC | 0 |
| Lake View Library | SC | WordPress-SC | 1 |
| Lamar District Library | SC | WordPress-SC | 0 |
| Lexington County Library - Chapin | SC | WordPress-SC | 3 |
| Lexington County Library - Gilbert-Summit | SC | WordPress-SC | 0 |
| Lexington County Library - Irmo | SC | WordPress-SC | 0 |
| Lexington County Library - Swansea | SC | WordPress-SC | 0 |
| Lexington County Public Library System - Main | SC | WordPress-SC | 0 |
| Marion County Library System | SC | WordPress-SC | 3 |
| Mccormick County Library System | SC | WordPress-SC | 3 |
| Oconee County Public Library - Salem Branch Library | SC | WordPress-SC | 0 |
| Oconee County Public Library - Seneca Branch Library | SC | WordPress-SC | 0 |
| Oconee County Public Library - Westminster Branch Library | SC | WordPress-SC | 0 |
| Orangeburg County Library - Springfield Branch Library | SC | WordPress-SC | 1 |
| Orangeburg County Library Commission | SC | WordPress-SC | 9 |
| Pickens County Library - Central-Clemson Branch Library | SC | WordPress-SC | 0 |
| Pickens County Library - Sarlin Branch Library | SC | WordPress-SC | 13 |
| Saluda County Library System | SC | WordPress-SC | 25 |
| Spartanburg County Public Library - H. Carlisle Bean Law Library | SC | WordPress-SC | 0 |
| Union County Library System | SC | WordPress-SC | 3 |
| York Public Library | SC | WordPress-SC | 0 |
| Barrett-Wharton Public Library | WV | WordPress-WV | 31 |
| Berkeley County Public Library | WV | WordPress-WV | 0 |
| Boone-Madison Public Library | WV | WordPress-WV | 9 |
| Bridgeport Public Library | WV | WordPress-WV | 21 |
| Cameron Public Library | WV | WordPress-WV | 0 |
| Center Point Public Library | WV | WordPress-WV | 5 |
| Clay County Public Library | WV | WordPress-WV | 2 |
| Dunbar Branch Library | WV | WordPress-WV | 1 |
| East Hardy Branch Public Library | WV | WordPress-WV | 0 |
| Gilbert Public Library | WV | WordPress-WV | 0 |
| Glasgow Branch Library | WV | WordPress-WV | 30 |
| Hamlin-Lincoln County Public Library | WV | WordPress-WV | 0 |
| Harrison County Public Library | WV | WordPress-WV | 15 |
| Hillsboro Public Library | WV | WordPress-WV | 1 |
| Jackson County Public Library | WV | WordPress-WV | 1 |
| Kanawha County Public Library | WV | WordPress-WV | 25 |
| Lynn Murray Memorial Library | WV | WordPress-WV | 0 |
| Marion County Public Library | WV | WordPress-WV | 0 |
| Mercer County Public Library | WV | WordPress-WV | 1 |
| Monroe County Public Library | WV | WordPress-WV | 3 |
| Montgomery Public Library | WV | WordPress-WV | 0 |
| Ohio County Public Library | WV | WordPress-WV | 0 |
| Paden City Public Library | WV | WordPress-WV | 3 |
| Paw Paw Public Library | WV | WordPress-WV | 1 |
| Pendleton County Public Library | WV | WordPress-WV | 3 |
| Piedmont Public Library | WV | WordPress-WV | 0 |
| Pleasants County Public Library | WV | WordPress-WV | 0 |
| Putnam County Public Library | WV | WordPress-WV | 0 |
| Richwood Public Library | WV | WordPress-WV | 8 |
| Ronceverte Public Library | WV | WordPress-WV | 0 |
| Sand Hill Public Library | WV | WordPress-WV | 358 |
| South Charleston Public Library | WV | WordPress-WV | 7 |
| Summers County Public Library | WV | WordPress-WV | 49 |
| Swaney Memorial Library | WV | WordPress-WV | 0 |
| Waverly Library | WV | WordPress-WV | 2 |
| Whitesville Public Library | WV | WordPress-WV | 0 |
| Williamstown Library | WV | WordPress-WV | 29 |
| (aggregate — no per-site breakdown available) | PA | Communico-PA | 1 |
| (aggregate — no per-site breakdown available) | NH | Communico-NH | 1 |
| (aggregate — no per-site breakdown available) | TN | Communico-TN | 4 |
| (aggregate — no per-site breakdown available) | WV | Communico-WV | 19 |
| (aggregate — no per-site breakdown available) | TN | Nashville-Library-TN | 174 |
| (aggregate — no per-site breakdown available) | MA | BiblioCommons-MA | 829 |
| (aggregate — no per-site breakdown available) | MD | Dorchester-County | 7 |
| (aggregate — no per-site breakdown available) | MD | Wicomico-Public | 20 |
| (aggregate — no per-site breakdown available) | PA | Allentown-Public | 6 |
| (aggregate — no per-site breakdown available) | FL | Orange-County-Library-FL | 1636 |
| (aggregate — no per-site breakdown available) | Multi | Assabet-NH-MA | 1110 |

## 2026-08-19

| Library Website | State | Scraper | Events Found |
|---|---|---|---|
| Anne Arundel County Library events | — | AACPL | 23 |
| Colonial Heights Public Library | VA | CivicEngage-Libraries | 0 |
| Williamson County Public Library | TN | CivicEngage-Libraries | 0 |
| Lexington County Public Library | SC | EventON-Lexington | 1000 |
| Coverage: Fairfax County, Virginia | — | Fairfax-Parks | 20 |
| Alabama | AL | FairsFestivals-Eastern | 59 |
| Connecticut | CT | FairsFestivals-Eastern | 198 |
| Delaware | DE | FairsFestivals-Eastern | 30 |
| District of Columbia | DC | FairsFestivals-Eastern | 5 |
| Florida | FL | FairsFestivals-Eastern | 566 |
| Georgia | GA | FairsFestivals-Eastern | 190 |
| Illinois | IL | FairsFestivals-Eastern | 373 |
| Indiana | IN | FairsFestivals-Eastern | 185 |
| Kentucky | KY | FairsFestivals-Eastern | 85 |
| Maine | ME | FairsFestivals-Eastern | 105 |
| Maryland | MD | FairsFestivals-Eastern | 153 |
| Massachusetts | MA | FairsFestivals-Eastern | 186 |
| Michigan | MI | FairsFestivals-Eastern | 400 |
| Mississippi | MS | FairsFestivals-Eastern | 26 |
| New Hampshire | NH | FairsFestivals-Eastern | 73 |
| New Jersey | NJ | FairsFestivals-Eastern | 193 |
| New York | NY | FairsFestivals-Eastern | 414 |
| North Carolina | NC | FairsFestivals-Eastern | 435 |
| Ohio | OH | FairsFestivals-Eastern | 501 |
| Pennsylvania | PA | FairsFestivals-Eastern | 403 |
| Rhode Island | RI | FairsFestivals-Eastern | 56 |
| South Carolina | SC | FairsFestivals-Eastern | 104 |
| Tennessee | TN | FairsFestivals-Eastern | 182 |
| Vermont | VT | FairsFestivals-Eastern | 49 |
| Virginia | VA | FairsFestivals-Eastern | 256 |
| West Virginia | WV | FairsFestivals-Eastern | 22 |
| Wisconsin | WI | FairsFestivals-Eastern | 334 |
| Blue Ridge Regional Library | VA | FullCalendar-Libraries | 269 |
| Appoquinimink Public Library | DE | LibCal-DE | 104 |
| Bear Library | DE | LibCal-DE | 182 |
| Brandywine Hundred Library | DE | LibCal-DE | 40 |
| Bridgeville Public Library | DE | LibCal-DE | 68 |
| Claymont Library | DE | LibCal-DE | 45 |
| Delaware Libraries | DE | LibCal-DE | 20 |
| Boone County Public Library | KY | LibCal-KY | 0 |
| Clay County Public Library | KY | LibCal-KY | 20 |
| Kenton County Public Library | KY | LibCal-KY | 0 |
| Warren County Public Library | KY | LibCal-KY | 0 |
| Alamance County Library | NC | LibCal-NC | 48 |
| Brunswick County Public Library | NC | LibCal-NC | 10 |
| Craven-Pamlico Regional Library | NC | LibCal-NC | 0 |
| Durham County Library | NC | LibCal-NC | 20 |
| Gaston County Public Library | NC | LibCal-NC | 20 |
| Henderson County Public Library | NC | LibCal-NC | 5 |
| Iredell County Public Library | NC | LibCal-NC | 48 |
| New Hanover County Public Library | NC | LibCal-NC | 20 |
| Union County Public Library | NC | LibCal-NC | 25 |
| Concord Public Library | — | LibCal-NH | 48 |
| Hollis Social Library | — | LibCal-NH | 48 |
| Hooksett Public Library | — | LibCal-NH | 48 |
| Keene Public Library | — | LibCal-NH | 48 |
| Lebanon Public Libraries | — | LibCal-NH | 48 |
| Manchester City Library | — | LibCal-NH | 48 |
| Merrimack Public Library | — | LibCal-NH | 48 |
| Nashua Public Library | — | LibCal-NH | 48 |
| Pelham Public Library | — | LibCal-NH | 48 |
| Baldwin Public Library | NY | LibCal-NY2 | 0 |
| East Meadow Public Library | NY | LibCal-NY2 | 20 |
| Freeport Memorial Library | NY | LibCal-NY2 | 20 |
| Levittown Public Library | NY | LibCal-NY2 | 166 |
| North Bellmore Public Library | NY | LibCal-NY2 | 20 |
| North Merrick Public Library | NY | LibCal-NY2 | 20 |
| Oceanside Public Library | NY | LibCal-NY2 | 20 |
| Plainview-Old Bethpage Public Library | NY | LibCal-NY2 | 156 |
| Rockville Centre Public Library | NY | LibCal-NY2 | 20 |
| Wantagh Public Library | NY | LibCal-NY2 | 20 |
| Barrington Public Library | RI | LibCal-RI | 20 |
| Cranston Public Library | RI | LibCal-RI | 20 |
| Cumberland Public Library | RI | LibCal-RI | 25 |
| East Providence Public Library | RI | LibCal-RI | 20 |
| Newport Public Library | RI | LibCal-RI | 20 |
| North Kingstown Free Library | RI | LibCal-RI | 0 |
| Pawtucket Public Library | RI | LibCal-RI | 10 |
| Warwick Public Library | RI | LibCal-RI | 20 |
| West Warwick Public Library | RI | LibCal-RI | 20 |
| Amherst County Public Library | VA | LibraryCalendar-Libraries | 21 |
| Appomattox Regional Library | VA | LibraryCalendar-Libraries | 16 |
| Atlantic County Library System | NJ | LibraryCalendar-Libraries | 24 |
| Bedford Public Library System | VA | LibraryCalendar-Libraries | 17 |
| Bloomingdale Public Library | IL | LibraryCalendar-Libraries | 22 |
| Caroline County Public Library | MD | LibraryCalendar-Libraries | 17 |
| Cumberland County Public Library | NC | LibraryCalendar-Libraries | 23 |
| Essex Public Library | VA | LibraryCalendar-Libraries | 15 |
| Forsyth County Public Library | NC | LibraryCalendar-Libraries | 19 |
| Frederick County Public Libraries | MD | LibraryCalendar-Libraries | 21 |
| Gloucester County Library System | NJ | LibraryCalendar-Libraries | 22 |
| Howard County Library System | MD | LibraryCalendar-Libraries | 19 |
| Lynchburg Public Library | VA | LibraryCalendar-Libraries | 15 |
| Petersburg Public Library | VA | LibraryCalendar-Libraries | 8 |
| Poquoson Public Library | VA | LibraryCalendar-Libraries | 18 |
| Portsmouth Public Library | VA | LibraryCalendar-Libraries | 23 |
| Powhatan County Public Library | VA | LibraryCalendar-Libraries | 15 |
| Talbot County Free Library | MD | LibraryCalendar-Libraries | 21 |
| Waynesboro Public Library | VA | LibraryCalendar-Libraries | 14 |
| York County Library | SC | LibraryCalendar-Libraries | 22 |
| York County Public Library | VA | LibraryCalendar-Libraries | 19 |
| Fairfield Public Library | — | LibraryMarket-CT | 113 |
| Ferguson Library | — | LibraryMarket-CT | 24 |
| Meriden Public Library | — | LibraryMarket-CT | 4 |
| New Britain Public Library | — | LibraryMarket-CT | 24 |
| West Hartford Public Library | — | LibraryMarket-CT | 34 |
| Beaufort County Library | — | LibraryMarket-SC | 32 |
| Sumter County Library | — | LibraryMarket-SC | 5 |
| Spartanburg County Public Libraries | SC | Trumba-Spartanburg | 588 |
| Academy of Natural Sciences | PA | Venue-Events-ScienceArts | 10 |
| Adler Planetarium | IL | Venue-Events-ScienceArts | 9 |
| American Museum of Natural History | NY | Venue-Events-ScienceArts | 8 |
| Art Institute of Chicago | IL | Venue-Events-ScienceArts | 0 |
| Bishop Museum of Science & Nature | FL | Venue-Events-ScienceArts | 21 |
| Connecticut Science Center | CT | Venue-Events-ScienceArts | 10 |
| Conner Prairie Living History | IN | Venue-Events-ScienceArts | 7 |
| Corning Museum of Glass | NY | Venue-Events-ScienceArts | 85 |
| EcoTarium | MA | Venue-Events-ScienceArts | 0 |
| Fernbank Museum of Natural History | GA | Venue-Events-ScienceArts | 0 |
| Field Museum | IL | Venue-Events-ScienceArts | 1 |
| Franklin Institute | PA | Venue-Events-ScienceArts | 0 |
| Frost Science Museum | FL | Venue-Events-ScienceArts | 44 |
| Great Lakes Science Center | OH | Venue-Events-ScienceArts | 6 |
| Griffin Museum of Science and Industry | IL | Venue-Events-ScienceArts | 0 |
| Henry Ford Museum | MI | Venue-Events-ScienceArts | 1 |
| Imagination Station | OH | Venue-Events-ScienceArts | 0 |
| Impression 5 Science Center | MI | Venue-Events-ScienceArts | 1 |
| Indiana State Museum | IN | Venue-Events-ScienceArts | 14 |
| Intrepid Sea Air & Space Museum | NY | Venue-Events-ScienceArts | 0 |
| Kamin Science Center | PA | Venue-Events-ScienceArts | 0 |
| Kennedy Space Center Visitor Complex | FL | Venue-Events-ScienceArts | 62 |
| Maryland Science Center | MD | Venue-Events-ScienceArts | 8 |
| McAuliffe-Shepard Discovery Center | NH | Venue-Events-ScienceArts | 1 |
| Michigan Science Center | MI | Venue-Events-ScienceArts | 11 |
| Milwaukee Art Museum | WI | Venue-Events-ScienceArts | 20 |
| Museum of Science & Industry | FL | Venue-Events-ScienceArts | 1 |
| Museum of Science Boston | MA | Venue-Events-ScienceArts | 1 |
| National Building Museum | DC | Venue-Events-ScienceArts | 0 |
| NC Museum of Natural Sciences | NC | Venue-Events-ScienceArts | 20 |
| New York Hall of Science | NY | Venue-Events-ScienceArts | 1 |
| Science Museum of Virginia | VA | Venue-Events-ScienceArts | 6 |
| Smithsonian Air & Space Museum | DC | Venue-Events-ScienceArts | 10 |
| Smithsonian Natural History Museum | DC | Venue-Events-ScienceArts | 28 |
| Tellus Science Museum | GA | Venue-Events-ScienceArts | 13 |
| Tennessee State Museum | TN | Venue-Events-ScienceArts | 1 |
| Virginia Museum of Natural History | VA | Venue-Events-ScienceArts | 6 |
| Yale Peabody Museum | CT | Venue-Events-ScienceArts | 1 |
| ABBE Regional Library System | SC | WordPress-Abbe-Regional | 21 |
| Abbeville Memorial Library | — | WordPress-AL | 7 |
| Akron Public Library | — | WordPress-AL | 0 |
| Andalusia Public Library | — | WordPress-AL | 0 |
| Athens-Limestone Public Library | — | WordPress-AL | 0 |
| Auburn Public Library | — | WordPress-AL | 1 |
| Birmingham Public Library | — | WordPress-AL | 1 |
| Blanche R. Solomon Memorial Library | — | WordPress-AL | 0 |
| Bridgeport - Lena Cagle Public Library | — | WordPress-AL | 3 |
| Burchell Campbell Memorial Library | — | WordPress-AL | 0 |
| Butler County Public Library | — | WordPress-AL | 12 |
| Chelsea Public Library | — | WordPress-AL | 0 |
| Choctaw County Public Library | — | WordPress-AL | 0 |
| City Of Bayou La Batre Public Library | — | WordPress-AL | 0 |
| Clay Public Library | — | WordPress-AL | 0 |
| Collinsville Public Library | — | WordPress-AL | 0 |
| Daleville Public Library | — | WordPress-AL | 1 |
| Daphne Public Library | — | WordPress-AL | 0 |
| Decatur Public Library | — | WordPress-AL | 34 |
| Doris Stanley Memorial Library | — | WordPress-AL | 1 |
| Dothan Houston County Library System | — | WordPress-AL | 75 |
| Evergreen Public Library | — | WordPress-AL | 0 |
| Fairhope Public Library | — | WordPress-AL | 150 |
| Florence-Lauderdale Public Library | — | WordPress-AL | 0 |
| Foley Public Library | — | WordPress-AL | 0 |
| Gardendale Public Library | — | WordPress-AL | 1 |
| Grant Public Library | — | WordPress-AL | 0 |
| Guntersville Public Library | — | WordPress-AL | 0 |
| H. Grady Bradshaw - Chambers County Library | — | WordPress-AL | 1 |
| Hale County Library | — | WordPress-AL | 0 |
| Hartford - Mcgregor-Mckinney Public Library | — | WordPress-AL | 0 |
| Homewood Public Library | — | WordPress-AL | 0 |
| Hoover Public Library | — | WordPress-AL | 2 |
| Houston-Love Memorial Library - Columbia | — | WordPress-AL | 0 |
| Hueytown Public Library | — | WordPress-AL | 0 |
| Huntsville-Madison County Public Library | — | WordPress-AL | 13 |
| Irondale Public Library | — | WordPress-AL | 0 |
| Jane B. Holmes Public Library | — | WordPress-AL | 0 |
| Jane Culbreth Library | — | WordPress-AL | 1 |
| Jefferson County Library Cooperative | — | WordPress-AL | 0 |
| Kennedy Public Library | — | WordPress-AL | 0 |
| Lafayette Pilot Public Library | — | WordPress-AL | 0 |
| Leighton Public Library | — | WordPress-AL | 22 |
| Madison Public Library | — | WordPress-AL | 11 |
| Marion-Perry County Library | — | WordPress-AL | 3 |
| Millbrook Public Library | — | WordPress-AL | 0 |
| Mobile Public Library | — | WordPress-AL | 31 |
| Montgomery City-County Public Library | — | WordPress-AL | 23 |
| Newton Public Library | — | WordPress-AL | 0 |
| Northwest Regional Library | — | WordPress-AL | 0 |
| Opp Public Library | — | WordPress-AL | 0 |
| Orange Beach Public Library | — | WordPress-AL | 0 |
| Piedmont Public Library | — | WordPress-AL | 0 |
| Ruby Pickens Tartt Public Library | — | WordPress-AL | 1 |
| Satsuma Public Library | — | WordPress-AL | 0 |
| Scottsboro Public Library | — | WordPress-AL | 0 |
| Selma-Dallas County Public Library | — | WordPress-AL | 1 |
| Sheffield Public Library | — | WordPress-AL | 0 |
| Stevenson Public Library | — | WordPress-AL | 0 |
| Trussville Public Library | — | WordPress-AL | 4 |
| Tuscaloosa Public Library | — | WordPress-AL | 150 |
| Vernon - Mary Wallace Cobb Memorial Library | — | WordPress-AL | 0 |
| Vestavia Hills Library | — | WordPress-AL | 150 |
| Walter J. Hanna Memorial Library | — | WordPress-AL | 0 |
| Warrior Public Library | — | WordPress-AL | 0 |
| Wilcox County Library | — | WordPress-AL | 1 |
| Wilsonville - Vernice Stoudenmire Library | — | WordPress-AL | 87 |
| Andover Public Library | CT | WordPress-CT | 0 |
| Ansonia Public Library | CT | WordPress-CT | 0 |
| Beacon Falls Public Library | CT | WordPress-CT | 0 |
| Beardsley Memorial Library | CT | WordPress-CT | 1 |
| Bethel Public Library | CT | WordPress-CT | 0 |
| Bethlehem Public Library | CT | WordPress-CT | 0 |
| Bill Library | CT | WordPress-CT | 1 |
| Bridgeport Public Library | CT | WordPress-CT | 13 |
| Bristol Public Library | CT | WordPress-CT | 210 |
| Brookfield Library | CT | WordPress-CT | 93 |
| Canterbury Public Library | CT | WordPress-CT | 0 |
| Cheshire Public Library | CT | WordPress-CT | 2 |
| Chester Public Library | CT | WordPress-CT | 0 |
| Clark Memorial Library | CT | WordPress-CT | 10 |
| Community Branch Library | CT | WordPress-CT | 1 |
| Cornwall Library Association | CT | WordPress-CT | 6 |
| Cyrenius H. Booth Library | CT | WordPress-CT | 0 |
| Danbury Public Library | CT | WordPress-CT | 0 |
| Darien Library | CT | WordPress-CT | 20 |
| Douglas Library Of Hebron | CT | WordPress-CT | 0 |
| Durham Public Library | CT | WordPress-CT | 43 |
| E.C. Scranton Memorial Library | CT | WordPress-CT | 8 |
| East Hampton Public Library | CT | WordPress-CT | 32 |
| East Hartford Public Library | CT | WordPress-CT | 0 |
| Easton Public Library | CT | WordPress-CT | 0 |
| Edith Wheeler Memorial Library | CT | WordPress-CT | 0 |
| Enfield Public Library | CT | WordPress-CT | 5 |
| Essex Library Association | CT | WordPress-CT | 0 |
| Fairfield Public Library | CT | WordPress-CT | 82 |
| Farmington Library | CT | WordPress-CT | 9 |
| Frederick H. Cossitt Library | CT | WordPress-CT | 1 |
| Goshen Public Library | CT | WordPress-CT | 0 |
| Greenwich Library | CT | WordPress-CT | 0 |
| Hartford Public Library | CT | WordPress-CT | 0 |
| Hartland Public Library | CT | WordPress-CT | 0 |
| Harwinton Public Library | CT | WordPress-CT | 108 |
| Henry Carter Hull Library | CT | WordPress-CT | 0 |
| Ivoryton Library Association | CT | WordPress-CT | 0 |
| Janet Carlson Calvert Library | CT | WordPress-CT | 3 |
| Jonathan Trumbull Library | CT | WordPress-CT | 0 |
| Kent Library Association | CT | WordPress-CT | 65 |
| Kent Memorial Library | CT | WordPress-CT | 0 |
| Killingworth Library | CT | WordPress-CT | 0 |
| Louis Piantino Branch Library | CT | WordPress-CT | 0 |
| Manchester Public Library | CT | WordPress-CT | 9 |
| Middlebury Public Library | CT | WordPress-CT | 23 |
| Middletown Public Library | CT | WordPress-CT | 1 |
| Milford Public Library | CT | WordPress-CT | 0 |
| Minor Memorial Library | CT | WordPress-CT | 48 |
| Mystic Noank Library | CT | WordPress-CT | 1 |
| New Britain Public Library | CT | WordPress-CT | 58 |
| New Canaan Library | CT | WordPress-CT | 79 |
| New Fairfield Free Public Library | CT | WordPress-CT | 7 |
| New Haven Free Public Library | CT | WordPress-CT | 1 |
| New Milford Public Library | CT | WordPress-CT | 1 |
| Norfolk Library | CT | WordPress-CT | 12 |
| North Haven Memorial Library | CT | WordPress-CT | 0 |
| Norwalk Public Library | CT | WordPress-CT | 0 |
| Oakville Branch Library | CT | WordPress-CT | 0 |
| Old Lyme - Phoebe Griffin Noyes Library | CT | WordPress-CT | 0 |
| Otis Library | CT | WordPress-CT | 36 |
| Pequot Library Association | CT | WordPress-CT | 0 |
| Plainville Public Library | CT | WordPress-CT | 0 |
| Pomfret Public Library | CT | WordPress-CT | 0 |
| Preston Public Library | CT | WordPress-CT | 1 |
| Public Library Of New London | CT | WordPress-CT | 12 |
| Ridgefield Library | CT | WordPress-CT | 10 |
| Salem Free Public Library | CT | WordPress-CT | 0 |
| Saxton B. Little Free Library | CT | WordPress-CT | 1 |
| Scoville Memorial Library | CT | WordPress-CT | 0 |
| Shelton Public Library | CT | WordPress-CT | 36 |
| Sherman Library Assn. | CT | WordPress-CT | 1 |
| South Windsor Public Library | CT | WordPress-CT | 68 |
| Southbury Public Library | CT | WordPress-CT | 62 |
| Southington Public Library | CT | WordPress-CT | 0 |
| Stafford Library Association | CT | WordPress-CT | 1 |
| Stonington Free Library | CT | WordPress-CT | 0 |
| Stratford Library | CT | WordPress-CT | 1 |
| Thomaston Public Library | CT | WordPress-CT | 0 |
| Torrington Library | CT | WordPress-CT | 0 |
| Trumbull Library | CT | WordPress-CT | 0 |
| Union Free Public Library | CT | WordPress-CT | 105 |
| Vernon Public Library | CT | WordPress-CT | 0 |
| Wallingford Public Library | CT | WordPress-CT | 29 |
| Warren Public Library | CT | WordPress-CT | 1 |
| Waterbury Public Library | CT | WordPress-CT | 0 |
| Waterford Public Library | CT | WordPress-CT | 0 |
| West Hartford Public Library | CT | WordPress-CT | 77 |
| Westbrook Public Library | CT | WordPress-CT | 112 |
| Westport Library | CT | WordPress-CT | 15 |
| Wethersfield Public Library | CT | WordPress-CT | 0 |
| Willimantic Public Library | CT | WordPress-CT | 5 |
| Wilson Branch Library | CT | WordPress-CT | 0 |
| Wilton Library Association | CT | WordPress-CT | 1 |
| Windham Free Library | CT | WordPress-CT | 11 |
| Windsor Locks Public Library | CT | WordPress-CT | 0 |
| Wolcott Public Library | CT | WordPress-CT | 1 |
| Woodbury Public Library | CT | WordPress-CT | 0 |
| Alma-Bacon County Public Library | GA | WordPress-GA | 6 |
| Appleby Branch | GA | WordPress-GA | 1 |
| Athens Regional Library System | GA | WordPress-GA | 32 |
| Baker County | GA | WordPress-GA | 0 |
| Boston Carnegie Library | GA | WordPress-GA | 20 |
| Bowman Branch | GA | WordPress-GA | 29 |
| Brooks County Public Library System | GA | WordPress-GA | 0 |
| Brunswick Glynn County Regional Library | GA | WordPress-GA | 1 |
| Butler Public Library | GA | WordPress-GA | 0 |
| Byron Public Library | GA | WordPress-GA | 73 |
| Cedartown Library | GA | WordPress-GA | 10 |
| Centerville Branch Library | GA | WordPress-GA | 0 |
| Chattahoochee Valley Regional Library System | GA | WordPress-GA | 41 |
| Chattooga County Library System | GA | WordPress-GA | 0 |
| Cherokee Regional Library System | GA | WordPress-GA | 1 |
| Clarkesville-Habersham Co. Lib. | GA | WordPress-GA | 0 |
| Clarkston Branch | GA | WordPress-GA | 1 |
| Clermont Library | GA | WordPress-GA | 0 |
| Commerce Public Library | GA | WordPress-GA | 0 |
| Coolidge Public Library | GA | WordPress-GA | 1 |
| Cornelia-Habersham Co. Lib. | GA | WordPress-GA | 1 |
| Covington Branch | GA | WordPress-GA | 2 |
| Dalton-Whitfield County Public Library | GA | WordPress-GA | 27 |
| Douglas-Coffee County Public Library | GA | WordPress-GA | 0 |
| Duluth | GA | WordPress-GA | 0 |
| Effingham | GA | WordPress-GA | 1 |
| Elizabeth Harris Library | GA | WordPress-GA | 1 |
| Gibbs Memorial Library | GA | WordPress-GA | 0 |
| Gordon Public Library | GA | WordPress-GA | 0 |
| Grantville Public Library | GA | WordPress-GA | 3 |
| Greene County Library | GA | WordPress-GA | 0 |
| Greenville Area Public Library | GA | WordPress-GA | 12 |
| Hancock County Library | GA | WordPress-GA | 72 |
| Harlie Fulford Memorial Library | GA | WordPress-GA | 1 |
| Heard County Public Library | GA | WordPress-GA | 0 |
| Hickory Flat Public Library | GA | WordPress-GA | 0 |
| Hightower Memorial Library | GA | WordPress-GA | 0 |
| Houston County Public Libraries System | GA | WordPress-GA | 0 |
| Ida Hilton Public Library | GA | WordPress-GA | 0 |
| Jefferson County Library System | GA | WordPress-GA | 1 |
| Lagrange Memorial Library | GA | WordPress-GA | 5 |
| Lake Sinclair Library | GA | WordPress-GA | 0 |
| Laurens County Library | GA | WordPress-GA | 0 |
| Lewis A. Ray Library | GA | WordPress-GA | 0 |
| Marion County Library | GA | WordPress-GA | 4 |
| Meigs Public Library | GA | WordPress-GA | 4 |
| Middle Georgia Regional Library System | GA | WordPress-GA | 0 |
| Miller Lakeland Library | GA | WordPress-GA | 1 |
| Monroe County Library | GA | WordPress-GA | 0 |
| Monroe-Walton County Library | GA | WordPress-GA | 0 |
| Morgan County Library | GA | WordPress-GA | 11 |
| Nelle Brown Memorial Public Library | GA | WordPress-GA | 0 |
| New Georgia Public Library | GA | WordPress-GA | 10 |
| Oglethorpe County Library | GA | WordPress-GA | 0 |
| Parks Memorial Library | GA | WordPress-GA | 17 |
| Riverdale Branch Library | GA | WordPress-GA | 1 |
| Rockmart Library | GA | WordPress-GA | 0 |
| Rossville Public Library | GA | WordPress-GA | 0 |
| Scottdale-Tobie Grant Branch | GA | WordPress-GA | 0 |
| Senoia Area Public Library | GA | WordPress-GA | 3 |
| Thomson-Mcduffie County Library | GA | WordPress-GA | 0 |
| Warren P. Sewell Memorial Library-Bremen | GA | WordPress-GA | 14 |
| Wayne County Library | GA | WordPress-GA | 1 |
| Wheeler County Library | GA | WordPress-GA | 3 |
| White County Public Library-Cleveland Branch | GA | WordPress-GA | 1 |
| Wilcox County Public Library | GA | WordPress-GA | 34 |
| Alleghany County Public Library | NC | WordPress-NC | 0 |
| Bath Community Library | NC | WordPress-NC | 0 |
| Beatties Ford Road Branch Library | NC | WordPress-NC | 1 |
| Belmont Branch Library | NC | WordPress-NC | 16 |
| Black Creek Branch Library | NC | WordPress-NC | 50 |
| Blanche Benjamin Branch Library | NC | WordPress-NC | 0 |
| Boonville Community Public Library | NC | WordPress-NC | 0 |
| Brunswick County Library | NC | WordPress-NC | 0 |
| Bunn Branch Library | NC | WordPress-NC | 0 |
| Carver Branch Library | NC | WordPress-NC | 0 |
| Cary Branch Library | NC | WordPress-NC | 4 |
| Catawba County Library | NC | WordPress-NC | 2 |
| Claremont Branch Library | NC | WordPress-NC | 2 |
| Cleveland County Memorial Library | NC | WordPress-NC | 0 |
| Craven-Pamlico-Carteret Regional Library | NC | WordPress-NC | 4 |
| Dallas Branch Library | NC | WordPress-NC | 16 |
| Danbury Public Library | NC | WordPress-NC | 0 |
| Davidson County Public Library System | NC | WordPress-NC | 0 |
| Dobson Community Library | NC | WordPress-NC | 0 |
| East Branch Library | NC | WordPress-NC | 50 |
| Farmville Public Library | NC | WordPress-NC | 0 |
| Florence S. Shanklin Branch Library | NC | WordPress-NC | 28 |
| Franklin County Library | NC | WordPress-NC | 5 |
| Graham Public Library | NC | WordPress-NC | 0 |
| Harmony Branch Library | NC | WordPress-NC | 1 |
| Havelock-Craven County Public | NC | WordPress-NC | 0 |
| Hazel W. Guilford Memorial Library | NC | WordPress-NC | 0 |
| Hickory Public Library | NC | WordPress-NC | 0 |
| Hudson Branch Library | NC | WordPress-NC | 1 |
| J.C. Holliday Library | NC | WordPress-NC | 0 |
| John W. Clark Public Library | NC | WordPress-NC | 0 |
| King Public Library | NC | WordPress-NC | 1 |
| La Grange Branch Library | NC | WordPress-NC | 5 |
| Lawrence Memorial Library | NC | WordPress-NC | 0 |
| Leland Branch Library | NC | WordPress-NC | 0 |
| Littleton Public Library (Wc Jones Memorial) | NC | WordPress-NC | 0 |
| Lowell Branch Library | NC | WordPress-NC | 16 |
| Macon County Public Library | NC | WordPress-NC | 0 |
| Madison Branch Library | NC | WordPress-NC | 11 |
| Madison County Public Library | NC | WordPress-NC | 0 |
| Margaret Little Blount Library | NC | WordPress-NC | 0 |
| Mary Duncan Public Library | NC | WordPress-NC | 0 |
| Matthews Branch Library | NC | WordPress-NC | 1 |
| Mcdowell County Law Library | NC | WordPress-NC | 3 |
| Mooresville Public Library | NC | WordPress-NC | 1 |
| Myrtle Grove Branch | NC | WordPress-NC | 8 |
| Norwood Branch Library | NC | WordPress-NC | 1 |
| Pettigrew Regional Library | NC | WordPress-NC | 0 |
| Polk County Public Library | NC | WordPress-NC | 41 |
| Princeton Public Library | NC | WordPress-NC | 0 |
| Public Library Of Johnston County Smithfield | NC | WordPress-NC | 0 |
| Roanoke Rapids Public Library | NC | WordPress-NC | 4 |
| Rowan Public Library | NC | WordPress-NC | 0 |
| Selma Public Library | NC | WordPress-NC | 0 |
| Spring Lake Branch | NC | WordPress-NC | 5 |
| Stanley Branch Library | NC | WordPress-NC | 16 |
| Star Branch | NC | WordPress-NC | 0 |
| Tyrrell County Library | NC | WordPress-NC | 0 |
| Union County Public Library | NC | WordPress-NC | 0 |
| Union West Branch Library | NC | WordPress-NC | 0 |
| Warsaw-Kornegay Public Library | NC | WordPress-NC | 2 |
| Watauga County Public Library | NC | WordPress-NC | 0 |
| Wayne County Public Library, Fremont | NC | WordPress-NC | 9 |
| Adams Memorial Library | — | WordPress-TN | 1 |
| Alexandria Branch Library | — | WordPress-TN | 0 |
| Athens Public Library | — | WordPress-TN | 1 |
| Auburntown Public Library | — | WordPress-TN | 1 |
| Audrey Pack Memorial Library | — | WordPress-TN | 0 |
| Bartlett Library | — | WordPress-TN | 0 |
| Baxter Branch Library | — | WordPress-TN | 150 |
| Benton County Library | — | WordPress-TN | 1 |
| Blount County Public Library | — | WordPress-TN | 0 |
| Carroll County Library | — | WordPress-TN | 0 |
| Chattanooga Public Library | — | WordPress-TN | 150 |
| Clarksville-Montgomery County Public Library | — | WordPress-TN | 0 |
| Cleveland-Bradley County Public Library | — | WordPress-TN | 1 |
| Clinton Public Library | — | WordPress-TN | 0 |
| Collierville Burch Library | — | WordPress-TN | 0 |
| Crockett County Library | — | WordPress-TN | 1 |
| Crossville-Cumberland County Public Library | — | WordPress-TN | 0 |
| Franklin County Public Library | — | WordPress-TN | 0 |
| Franklin Public Library | — | WordPress-TN | 0 |
| Germantown Community Library | — | WordPress-TN | 150 |
| Gleason Memorial Library | — | WordPress-TN | 0 |
| Hamilton Parks Public Library | — | WordPress-TN | 1 |
| Harriman Public Library | — | WordPress-TN | 0 |
| Hendersonville Public Library | — | WordPress-TN | 0 |
| Hickman County Public Library | — | WordPress-TN | 0 |
| Humphreys County Public Library | — | WordPress-TN | 0 |
| Johnson City Public Library | — | WordPress-TN | 21 |
| Kingsport Public Library | — | WordPress-TN | 0 |
| Kingston Public Library | — | WordPress-TN | 10 |
| Knox County Public Library | — | WordPress-TN | 18 |
| Lauderdale County Library | — | WordPress-TN | 48 |
| Madisonville Public Library | — | WordPress-TN | 0 |
| Mary E. Tippitt Memorial Library | — | WordPress-TN | 0 |
| Meigs-Decatur Public Library | — | WordPress-TN | 1 |
| Memphis Public Libraries | — | WordPress-TN | 31 |
| Middleton Community Library | — | WordPress-TN | 0 |
| Mildred G. Fields Memorial Library | — | WordPress-TN | 1 |
| Millard Oakley Public Library | — | WordPress-TN | 0 |
| Monterey Branch Library | — | WordPress-TN | 0 |
| Morristown-Hamblen Library | — | WordPress-TN | 0 |
| Mt. Juliet-Harvey Freeman Public Library | — | WordPress-TN | 0 |
| Nashville Public Library | — | WordPress-TN | 1 |
| Nashville Talking Library | — | WordPress-TN | 7 |
| Newbern City Library | — | WordPress-TN | 0 |
| Parsons Public Library | — | WordPress-TN | 0 |
| Rogersville Public Library | — | WordPress-TN | 0 |
| Rutherford County Library System | — | WordPress-TN | 0 |
| Sam T. Wilson Public Library | — | WordPress-TN | 0 |
| Savannah-Hardin County Library | — | WordPress-TN | 1 |
| Sequatchie County Public Library | — | WordPress-TN | 0 |
| Sevier County Public Library System | — | WordPress-TN | 0 |
| Smyrna Public Library | — | WordPress-TN | 0 |
| Southeast Branch Library | — | WordPress-TN | 0 |
| Spring Hill Public Library | — | WordPress-TN | 0 |
| Sweetwater Public Library | — | WordPress-TN | 1 |
| The Brentwood Library | — | WordPress-TN | 0 |
| Tipton County Public Library | — | WordPress-TN | 0 |
| Tullahoma Public Library | — | WordPress-TN | 0 |
| Washburn Public Library | — | WordPress-TN | 1 |
| Westmoreland Public Library | — | WordPress-TN | 0 |
| White County Public Library | — | WordPress-TN | 72 |
| White Pine Public Library | — | WordPress-TN | 1 |
| Winfield Public Library | — | WordPress-TN | 0 |
| Alexandria Library | — | WordPress-VA | 0 |
| Chesapeake Public Library | — | WordPress-VA | 0 |
| Culpeper County Library | — | WordPress-VA | 21 |
| Henrico County Public Library | — | WordPress-VA | 0 |
| Jefferson-Madison Regional Library | — | WordPress-VA | 0 |
| Manassas Park City Library | — | WordPress-VA | 10 |
| Ainsworth Public | VT | WordPress-VT | 150 |
| Aldrich Public Library | VT | WordPress-VT | 0 |
| Barton Public | VT | WordPress-VT | 0 |
| Bennington Free | VT | WordPress-VT | 1 |
| Benson Public | VT | WordPress-VT | 0 |
| Bent Northrup Memorial | VT | WordPress-VT | 1 |
| Bethel Public | VT | WordPress-VT | 0 |
| Bradford Public | VT | WordPress-VT | 0 |
| Brandon Free Public | VT | WordPress-VT | 62 |
| Brooks Memorial Library | VT | WordPress-VT | 150 |
| Brownell Library | VT | WordPress-VT | 150 |
| Butterfield | VT | WordPress-VT | 0 |
| Cabot Public | VT | WordPress-VT | 0 |
| Charlotte | VT | WordPress-VT | 70 |
| Chelsea Public | VT | WordPress-VT | 0 |
| Cobleigh Public Library | VT | WordPress-VT | 0 |
| Cornwall Free Public | VT | WordPress-VT | 6 |
| Cutler Memorial | VT | WordPress-VT | 0 |
| Deborah Rawson Memorial Library | VT | WordPress-VT | 11 |
| Essex Free | VT | WordPress-VT | 0 |
| Fair Haven Free | VT | WordPress-VT | 0 |
| Fairfax Community | VT | WordPress-VT | 1 |
| Fletcher Free Library | VT | WordPress-VT | 6 |
| Franklin-Grand Isle Bookmobile | VT | WordPress-VT | 18 |
| G. M. Kelley Community | VT | WordPress-VT | 0 |
| Gilman Public Library | VT | WordPress-VT | 0 |
| Glover Public | VT | WordPress-VT | 0 |
| Greensboro Free | VT | WordPress-VT | 0 |
| Hancock Free Public | VT | WordPress-VT | 1 |
| Hartford | VT | WordPress-VT | 0 |
| Hartland Public Library | VT | WordPress-VT | 0 |
| Haskell Free Library | VT | WordPress-VT | 0 |
| Haston | VT | WordPress-VT | 3 |
| Hitchcock Museum | VT | WordPress-VT | 1 |
| Huntington Public | VT | WordPress-VT | 0 |
| Ilsley Public Library | VT | WordPress-VT | 18 |
| Jaquith Public | VT | WordPress-VT | 0 |
| Kellogg-Hubbard Library | VT | WordPress-VT | 150 |
| Lanpher Memorial | VT | WordPress-VT | 1 |
| Latham Memorial | VT | WordPress-VT | 1 |
| Martha Canfield Memorial | VT | WordPress-VT | 0 |
| Moore Free | VT | WordPress-VT | 0 |
| Morrill Mem. Harris | VT | WordPress-VT | 0 |
| Morristown Centennial Library | VT | WordPress-VT | 0 |
| Mount Holly | VT | WordPress-VT | 0 |
| Norman Williams Public Library | VT | WordPress-VT | 150 |
| North Hero Public | VT | WordPress-VT | 1 |
| Norwich Public | VT | WordPress-VT | 1 |
| Peacham | VT | WordPress-VT | 1 |
| Pettee Memorial | VT | WordPress-VT | 1 |
| Pierson Library | VT | WordPress-VT | 18 |
| Pope Memorial | VT | WordPress-VT | 0 |
| Proctor Free | VT | WordPress-VT | 0 |
| Putney Public | VT | WordPress-VT | 38 |
| Quechee | VT | WordPress-VT | 6 |
| Reading Public | VT | WordPress-VT | 1 |
| Readsboro Community | VT | WordPress-VT | 0 |
| Rochester Public | VT | WordPress-VT | 0 |
| Rockingham Free Public Library | VT | WordPress-VT | 12 |
| Roger Clark Memorial | VT | WordPress-VT | 0 |
| Roxbury Free | VT | WordPress-VT | 0 |
| Russell Memorial | VT | WordPress-VT | 1 |
| Salisbury Free Public | VT | WordPress-VT | 0 |
| Sheldon Public | VT | WordPress-VT | 0 |
| Shrewsbury | VT | WordPress-VT | 0 |
| Springfield Town Library | VT | WordPress-VT | 2 |
| St. Johnsbury Athenaeum | VT | WordPress-VT | 3 |
| Stamford Community | VT | WordPress-VT | 0 |
| Stowe Free | VT | WordPress-VT | 0 |
| Tenney Memorial | VT | WordPress-VT | 1 |
| Tunbridge Public | VT | WordPress-VT | 34 |
| Vernon Free | VT | WordPress-VT | 7 |
| Warren Public | VT | WordPress-VT | 1 |
| West Hartford | VT | WordPress-VT | 77 |
| Westminster West Public | VT | WordPress-VT | 0 |
| Whiting | VT | WordPress-VT | 0 |
| Windham Town | VT | WordPress-VT | 2 |
| Windsor Public | VT | WordPress-VT | 0 |
| Woodbury Community | VT | WordPress-VT | 1 |
## 2026-08-20

**Window: 2026-08-19T18:18:54Z → 2026-08-20T15:08Z.** The only scrapers that completed in it were the nine MacaroniKid Group 1 states (PA, NC, MA, TN, AL, KY, RI, DC, WV), which are not a library family, so this run contributes no rotation-driven library rows. Everything else in the 2026-08-19 Group 1 run had already finished before that run's audit was built and is recorded under `## 2026-08-19`.

**Root cause found for a long-standing hole in this file — BiblioCommons-\*, Communico-\* and Drupal-Pennsylvania have never produced per-site rows.** `scripts/build-library-site-audit.js` pairs the `📍 {library}` header with the *next* `Found {N} events` line. In both shared family files that line existed **only on the Puppeteer fallback path**, while the API path — the one that actually runs, logging `✓ Using API data (N events)` — emitted nothing; `scraper-drupal-libraries-PA.js` had no such line anywhere. The 📍 header was therefore parsed, went unpaired, and every one of those libraries was dropped silently. This is why the 2026-08-19 audit shows 25 scrapers while the run table shows BiblioCommons-KY/NJ/VA, Communico-DC/VA/CT/NC/MA and Drupal-Pennsylvania all running successfully that same morning.

Fixed 2026-08-20 in all three files. Verified live rather than by reasoning: a re-run of `Communico-MA` now logs `Found 5 events` and the builder emits the row below, where it previously emitted none.

| Library Website | State | Scraper | Events Found |
|---|---|---|---|
| Worcester Public Library | MA | Communico-MA | 5 |

The other affected libraries cannot backfill from the existing `scraper-stdout.log` — the missing line was never written — so they will appear on their next rotation (Group 1, ~2026-08-22). Tracked in `reports/fix-notes.json` `_pending`.

**Cycle-completion check: not complete.** Across the current cycle (`## 2026-08-16`, `## 2026-08-18`, `## 2026-08-19`, plus today) 67 of 109 active library-family scrapers have at least one row and 42 do not. A large part of that 42 is the bug above rather than a rotation gap: BiblioCommons-GA/KY/NC, Communico-AL/CT/GA/KY/NJ/SC, LibraryMarket-GA/ME-NH-MA and the single-system scrapers that have no per-site config array at all. No `Cycle complete` marker is added.

## 2026-08-21

**Window: 2026-08-21T07:00:01Z → present.** This run is the **Group 2 catch-up** — `group-catchup.js` fired for the first time observed, choosing Group 2 (starved 7.7 days) over the calendar's Group 3. The MacaroniKid Group 2 tail was still executing when this audit was built, so its 7 states are not represented here and will land in the next section.

**888 per-site rows across 32 scrapers — the largest single-day per-site yield this file has recorded.** BiblioCommons-\*, Communico-\* and LibraryMarket-\* all contribute per-site rows here, confirming live the `Found {N} events` fix logged on 2026-08-20: that entry had been proven only on a single hand-run `Communico-MA`, and this is the first full rotation to exercise it across the whole family.

**360 of the 888 sites returned zero events, and 355 of those 360 are WordPress-\*** (NY 168, NJ 68, ME 60, MS 34, FL 25). That is the known WordPress platform-heterogeneity problem tracked by gate 1, not a new regression. The remaining five are LibCal-CT (2), LibCal-GA (1), CustomDrupal-Libraries (1) and Communico-NJ (1, Camden County Library System).

**Six single-system scrapers ran today but emit no per-site `📍`/`Found N` pair**, because they cover one library system and have no config array to loop over. Per this file's own convention they are recorded below as one aggregate row each, taken from the `scraper-summary.log` FOUND column, and are marked `(scraper aggregate)` so they are never mistaken for verified per-site counts.

| Library Website | State | Scraper | Events Found |
|---|---|---|---|
| Berks County Public Libraries (scraper aggregate) | PA | Berks-County | 55 |
| Brooklyn Public Library (scraper aggregate) | NY | Brooklyn-Library | 20 |
| Cecil County Public Library (scraper aggregate) | MD | Cecil-County | 24 |
| Howard County Library System (scraper aggregate) | MD | Howard-County | 42 |
| Louisville Free Public Library (scraper aggregate) | KY | Louisville-Library | 146 |
| Somerset County Library System (scraper aggregate) | MD | Somerset-County | 265 |
| Fulton County Library System | GA | BiblioCommons-GA | 498 |
| Charlotte Mecklenburg Library | NC | BiblioCommons-NC | 498 |
| Homewood Public Library | AL | Communico-AL | 30 |
| Hoover Public Library | AL | Communico-AL | 1 |
| Trussville Public Library | AL | Communico-AL | 2 |
| Chattahoochee Valley Libraries | GA | Communico-GA | 9 |
| Clayton County Library System | GA | Communico-GA | 9 |
| DeKalb County Public Library | GA | Communico-GA | 7 |
| Forsyth County Public Library | GA | Communico-GA | 3 |
| Gwinnett County Public Library | GA | Communico-GA | 6 |
| Henry County Library System | GA | Communico-GA | 4 |
| Anderson Public Library | KY | Communico-KY | 1 |
| Lexington Public Library | KY | Communico-KY | 5 |
| Muhlenberg County Public Libraries | KY | Communico-KY | 2 |
| Pike County Public Library | KY | Communico-KY | 2 |
| Camden County Library System | NJ | Communico-NJ | 0 |
| Cape May County Library | NJ | Communico-NJ | 9 |
| Hoboken Public Library | NJ | Communico-NJ | 5 |
| Middlesex County Library | NJ | Communico-NJ | 7 |
| Ocean County Library | NJ | Communico-NJ | 26 |
| Somerset County Library System | NJ | Communico-NJ | 18 |
| Warren County Library | NJ | Communico-NJ | 3 |
| Pickens County Library | SC | Communico-SC | 3 |
| Anderson County Library System | SC | CustomDrupal-Libraries | 0 |
| Cobb County Public Library System | GA | CustomDrupal-Libraries | 10 |
| Florence County Library System | SC | CustomDrupal-Libraries | 51 |
| Greenville County Library System | SC | CustomDrupal-Libraries | 10 |
| Kanawha County Public Library | WV | CustomDrupal-Libraries | 176 |
| Richland Library | SC | CustomDrupal-Libraries | 30 |
| Rowan County Public Library | NC | CustomDrupal-Libraries | 24 |
| Wake County Public Libraries | NC | CustomDrupal-Libraries | 144 |
| Jefferson-Madison Regional Library | VA | EventActions-Libraries | 500 |
| [1/27] Alabama | AL | Festivals-Eastern-US | 20 |
| [10/27] Massachusetts | MA | Festivals-Eastern-US | 20 |
| [11/27] Maryland | MD | Festivals-Eastern-US | 26 |
| [12/27] Maine | ME | Festivals-Eastern-US | 21 |
| [13/27] Michigan | MI | Festivals-Eastern-US | 25 |
| [14/27] Mississippi | MS | Festivals-Eastern-US | 24 |
| [15/27] North Carolina | NC | Festivals-Eastern-US | 25 |
| [16/27] New Hampshire | NH | Festivals-Eastern-US | 25 |
| [17/27] New Jersey | NJ | Festivals-Eastern-US | 26 |
| [18/27] New York | NY | Festivals-Eastern-US | 25 |
| [19/27] Ohio | OH | Festivals-Eastern-US | 25 |
| [2/27] Connecticut | CT | Festivals-Eastern-US | 20 |
| [20/27] Pennsylvania | PA | Festivals-Eastern-US | 25 |
| [21/27] Rhode Island | RI | Festivals-Eastern-US | 20 |
| [22/27] South Carolina | SC | Festivals-Eastern-US | 20 |
| [23/27] Tennessee | TN | Festivals-Eastern-US | 20 |
| [24/27] Virginia | VA | Festivals-Eastern-US | 20 |
| [25/27] Vermont | VT | Festivals-Eastern-US | 18 |
| [26/27] Wisconsin | WI | Festivals-Eastern-US | 20 |
| [27/27] West Virginia | WV | Festivals-Eastern-US | 18 |
| [3/27] District of Columbia | DC | Festivals-Eastern-US | 20 |
| [4/27] Delaware | DE | Festivals-Eastern-US | 20 |
| [5/27] Florida | FL | Festivals-Eastern-US | 20 |
| [6/27] Georgia | GA | Festivals-Eastern-US | 20 |
| [7/27] Illinois | IL | Festivals-Eastern-US | 20 |
| [8/27] Indiana | IN | Festivals-Eastern-US | 20 |
| [9/27] Kentucky | KY | Festivals-Eastern-US | 20 |
| Morris County Library | NJ | Graniculator-Morris | 12 |
| Bridgeport Public Library | CT | LibCal-CT | 10 |
| East Hartford Public Library | CT | LibCal-CT | 20 |
| Greenwich Library | CT | LibCal-CT | 48 |
| Hamden Public Library | CT | LibCal-CT | 48 |
| Hartford Public Library | CT | LibCal-CT | 0 |
| New Haven Free Public Library | CT | LibCal-CT | 20 |
| Silas Bronson Library | CT | LibCal-CT | 0 |
| Stratford Library | CT | LibCal-CT | 20 |
| Athens-Clarke County Library | GA | LibCal-GA | 5 |
| Auburn Public Library | GA | LibCal-GA | 20 |
| Banks County Public Library | GA | LibCal-GA | 0 |
| Hall County Library System | GA | LibCal-GA | 10 |
| Brookline Public Library | MA | LibCal-MA | 20 |
| Cambridge Public Library | MA | LibCal-MA | 10 |
| Newton Free Library | MA | LibCal-MA | 20 |
| Albany Public Library | NY | LibCal-NY1 | 24 |
| Buffalo & Erie County Public Library | NY | LibCal-NY1 | 20 |
| Garden City Public Library | NY | LibCal-NY1 | 10 |
| Great Neck Library | NY | LibCal-NY1 | 20 |
| Hicksville Public Library | NY | LibCal-NY1 | 20 |
| Long Beach Public Library | NY | LibCal-NY1 | 45 |
| Monroe County Library System | NY | LibCal-NY1 | 20 |
| Northern Onondaga Public Libraries | NY | LibCal-NY1 | 10 |
| Onondaga County Public Libraries | NY | LibCal-NY1 | 20 |
| Suffolk Cooperative Library System | NY | LibCal-NY1 | 11 |
| Westchester Library System | NY | LibCal-NY1 | 20 |
| Bucks County Free Library | PA | LibCal-PA | 25 |
| Chester County Library System | PA | LibCal-PA | 20 |
| Dauphin County Library System | PA | LibCal-PA | 10 |
| Delaware County Library System | PA | LibCal-PA | 20 |
| Easton Area Public Library | PA | LibCal-PA | 48 |
| Erie County Public Library | PA | LibCal-PA | 10 |
| Montgomery County-Norristown Public Library | PA | LibCal-PA | 20 |
| Clarksville-Montgomery County Public Library | TN | LibCal-TN | 48 |
| Memphis Public Libraries | TN | LibCal-TN | 41 |
| Fletcher Free Library | VT | LibCal-VT | 20 |
| Morgantown Public Library | WV | LibCal-WV | 10 |
| Allegany County Library System | — | LibraryMarket | 120 |
| Carroll County Public Library | — | LibraryMarket | 2230 |
| Dallas Public Library | — | LibraryMarket | 120 |
| Lee County Library System | — | LibraryMarket | 120 |
| Pikes Peak Library District | — | LibraryMarket | 120 |
| Rochester Public Library | — | LibraryMarket | 116 |
| Sarasota County Libraries | — | LibraryMarket | 120 |
| Virginia Beach Public Library | — | LibraryMarket | 120 |
| Washington County Free Library | — | LibraryMarket | 120 |
| Augusta-Richmond County Library | — | LibraryMarket-GA | 22 |
| Auburn Public Library | — | LibraryMarket-ME-NH-MA | 24 |
| Portland Public Library | — | LibraryMarket-ME-NH-MA | 22 |
| Rochester Public Library | — | LibraryMarket-ME-NH-MA | 27 |
| Springfield City Library | — | LibraryMarket-ME-NH-MA | 30 |
| West Hartford Library | — | LibraryMarket-ME-NH-MA | 34 |
| Coverage: Montgomery County, Maryland | — | Montgomery-Parks | 30 |
| Bath County branch: https://www.rrlib.net/bath-county-ics-calendar/ | — | Rockbridge-Regional | 16 |
| Bookmobile branch: https://www.rrlib.net/bookmobile-ics-calendar/ | — | Rockbridge-Regional | 31 |
| Buena Vista branch: https://www.rrlib.net/buena-vista-ics-calendar/ | — | Rockbridge-Regional | 9 |
| Glasgow branch: https://www.rrlib.net/glasgow-ics-calendar/ | — | Rockbridge-Regional | 12 |
| Goshen branch: https://www.rrlib.net/goshen-ics-calendar/ | — | Rockbridge-Regional | 5 |
| Lexington branch: https://www.rrlib.net/lexington-ics-calendar/ | — | Rockbridge-Regional | 48 |
| Decatur County - Gilbert H. Gragg Library | GA | SouthwestGeorgia-GA | 141 |
| Miller County - James W. Merritt, Jr. Memorial Library | GA | SouthwestGeorgia-GA | 29 |
| Seminole County Public Library | GA | SouthwestGeorgia-GA | 47 |
| Horry County Memorial Library | SC | Tockify-Horry | 402 |
| Alachua Branch Library | — | WordPress-FL | 0 |
| Archer Branch Library | — | WordPress-FL | 1 |
| Auburndale Public Library | — | WordPress-FL | 2 |
| Bartow Public Library | — | WordPress-FL | 0 |
| Blake Library | — | WordPress-FL | 15 |
| Brandon Branch | — | WordPress-FL | 51 |
| Broward County Library | — | WordPress-FL | 20 |
| Celebration Library | — | WordPress-FL | 0 |
| Coleman Library | — | WordPress-FL | 1 |
| Cooper Memorial Library | — | WordPress-FL | 0 |
| Desoto County Library | — | WordPress-FL | 1 |
| E.C. Rowell Public Library | — | WordPress-FL | 0 |
| East Lake Community Library | — | WordPress-FL | 0 |
| Edgewater Public Library | — | WordPress-FL | 0 |
| Eustis Memorial Library | — | WordPress-FL | 1 |
| Freeport Branch Library | — | WordPress-FL | 0 |
| Fruitland Park Library | — | WordPress-FL | 0 |
| Greenville Public Library | — | WordPress-FL | 125 |
| Havana Public Library | — | WordPress-FL | 1 |
| Homestead Branch Library | — | WordPress-FL | 0 |
| Hudson Regional Library | — | WordPress-FL | 1 |
| Jacaranda Public Library | — | WordPress-FL | 0 |
| Jefferson County R. J. Bailar Public Library | — | WordPress-FL | 0 |
| Lake County Library System | — | WordPress-FL | 0 |
| Lake Placid Memorial Library | — | WordPress-FL | 1 |
| Lakeland Public Library | — | WordPress-FL | 0 |
| Land Olakes Branch Library | — | WordPress-FL | 138 |
| Lantana Public Library | — | WordPress-FL | 1 |
| Largo Public Library | — | WordPress-FL | 0 |
| Levy County Public Library System | — | WordPress-FL | 0 |
| Madison County Library | — | WordPress-FL | 12 |
| Mandel Public Library Of West Palm Beach | — | WordPress-FL | 8 |
| Margate Catharine Young Branch | — | WordPress-FL | 12 |
| Miami-Dade Public Library System | — | WordPress-FL | 70 |
| Newberry Branch Library | — | WordPress-FL | 0 |
| Oldsmar Public Library | — | WordPress-FL | 1 |
| Orange City Dickinson Memorial Library | — | WordPress-FL | 9 |
| Orange County Library System | — | WordPress-FL | 18 |
| Palm Beach County Library System | — | WordPress-FL | 23 |
| Palm Springs Public Library | — | WordPress-FL | 1 |
| Parker Public Library | — | WordPress-FL | 0 |
| Parkland Library | — | WordPress-FL | 1 |
| Pierson Public Library | — | WordPress-FL | 13 |
| Polk City Library | — | WordPress-FL | 1 |
| Reddick Public Library | — | WordPress-FL | 0 |
| Safety Harbor Public Library | — | WordPress-FL | 143 |
| Springfield Branch | — | WordPress-FL | 1 |
| Sunrise Dan Pearl Branch | — | WordPress-FL | 0 |
| Tampa-Hillsborough County Public Library | — | WordPress-FL | 0 |
| Taylor County Public Library | — | WordPress-FL | 0 |
| Umatilla Public Library | — | WordPress-FL | 0 |
| Vernon Branch Library | — | WordPress-FL | 0 |
| West Branch Library | — | WordPress-FL | 186 |
| Wildwood Public Library | — | WordPress-FL | 0 |
| Winter Park Public Library | — | WordPress-FL | 117 |
| Zephyrhills Library | — | WordPress-FL | 1 |
| Cecil County Public Library | — | WordPress-MD | 32 |
| Dorchester County Public Library | — | WordPress-MD | 1 |
| Kent County Public Library | — | WordPress-MD | 21 |
| Ruth Enlow Library of Garrett County | — | WordPress-MD | 2 |
| Talbot County Free Library | — | WordPress-MD | 46 |
| Wicomico Public Libraries | — | WordPress-MD | 25 |
| Worcester County Library | — | WordPress-MD | 36 |
| Abel J.Morneault Memorial Library | ME | WordPress-ME | 0 |
| Acton Public Library | ME | WordPress-ME | 0 |
| Albion Public Library | ME | WordPress-ME | 0 |
| Andover Public Library | ME | WordPress-ME | 0 |
| Auburn Public Library | ME | WordPress-ME | 20 |
| Augusta - Lithgow Public Library | ME | WordPress-ME | 1 |
| Bangor Public Library | ME | WordPress-ME | 1 |
| Belfast Free Library | ME | WordPress-ME | 150 |
| Belgrade Public Library | ME | WordPress-ME | 0 |
| Bethel Library Assn | ME | WordPress-ME | 0 |
| Biddeford-McArthur Library | ME | WordPress-ME | 81 |
| Blue Hill Library | ME | WordPress-ME | 0 |
| Boothbay Harbor Memorial Library | ME | WordPress-ME | 0 |
| Bowdoinham Public Library | ME | WordPress-ME | 6 |
| Bremen Public Library | ME | WordPress-ME | 0 |
| Bridgton Public Library | ME | WordPress-ME | 1 |
| Brooksville Free Public Library | ME | WordPress-ME | 27 |
| Brown Memorial Library - Clinton | ME | WordPress-ME | 0 |
| Brownville Public Library | ME | WordPress-ME | 0 |
| Brunswick Curtis Memorial Library | ME | WordPress-ME | 4 |
| Camden Public Library | ME | WordPress-ME | 150 |
| Chase Emerson Memorial Library | ME | WordPress-ME | 0 |
| Cumberland - Chebeague Island Library | ME | WordPress-ME | 2 |
| Farmington Public Library | ME | WordPress-ME | 9 |
| Fort Fairfield Public Library | ME | WordPress-ME | 0 |
| Freeland Holmes Library | ME | WordPress-ME | 0 |
| Freeport Community Library | ME | WordPress-ME | 0 |
| Frenchmans Bay Library | ME | WordPress-ME | 0 |
| Frost Memorial Library | ME | WordPress-ME | 9 |
| Gardiner Public Library | ME | WordPress-ME | 0 |
| Gorham Baxter Memorial Library | ME | WordPress-ME | 150 |
| Hartland Public Library | ME | WordPress-ME | 0 |
| Henry D. Moore Library | ME | WordPress-ME | 0 |
| Hollis Center Public Library | ME | WordPress-ME | 0 |
| Ivan O. Davis-Liberty Library | ME | WordPress-ME | 1 |
| John B. Curtis Free Public Library | ME | WordPress-ME | 0 |
| Julia Adams Morse Memorial Library | ME | WordPress-ME | 0 |
| Katahdin Public Library | ME | WordPress-ME | 0 |
| Kennebunk Free Library | ME | WordPress-ME | 0 |
| Lawrence Public Library | ME | WordPress-ME | 0 |
| Lebanon Town Library | ME | WordPress-ME | 0 |
| Lewiston Public Library | ME | WordPress-ME | 0 |
| Limerick Public Library | ME | WordPress-ME | 0 |
| Louise Clements Library | ME | WordPress-ME | 0 |
| Lyman Community Library | ME | WordPress-ME | 1 |
| Machias - Porter Memorial Library | ME | WordPress-ME | 13 |
| Madawaska Public Library | ME | WordPress-ME | 0 |
| Madison Public Library | ME | WordPress-ME | 9 |
| Mark And Emily Turner Memorial Library | ME | WordPress-ME | 10 |
| Mercer - Shaw Library | ME | WordPress-ME | 0 |
| Merrill Memorial Library | ME | WordPress-ME | 45 |
| Milbridge Public Library | ME | WordPress-ME | 0 |
| Monroe Community Library | ME | WordPress-ME | 0 |
| New Gloucester Public Library | ME | WordPress-ME | 0 |
| New Vineyard Public Library | ME | WordPress-ME | 0 |
| North Haven Public Library | ME | WordPress-ME | 0 |
| Oakland Public Library | ME | WordPress-ME | 62 |
| Ogunquit Memorial Library | ME | WordPress-ME | 0 |
| Orrs Island Library | ME | WordPress-ME | 49 |
| Owls Head Village Library | ME | WordPress-ME | 0 |
| Parsons Memorial Library | ME | WordPress-ME | 2 |
| Parsonsfield Public Library | ME | WordPress-ME | 0 |
| Patten Free Library | ME | WordPress-ME | 29 |
| Pembroke Library | ME | WordPress-ME | 0 |
| Pittsfield Public Library | ME | WordPress-ME | 17 |
| Portland Public Library | ME | WordPress-ME | 6 |
| Prince Memorial Library | ME | WordPress-ME | 21 |
| Rangeley Public Library | ME | WordPress-ME | 77 |
| Rockland Public Library | ME | WordPress-ME | 0 |
| Rockport Public Library | ME | WordPress-ME | 150 |
| Sargentville Library Assn | ME | WordPress-ME | 2 |
| Scarborough Public Library | ME | WordPress-ME | 2 |
| Shaw Public Library - Greenville | ME | WordPress-ME | 2 |
| Sherman Public Library | ME | WordPress-ME | 1 |
| Simpson Memorial Library | ME | WordPress-ME | 0 |
| South Berwick Public Library | ME | WordPress-ME | 0 |
| South China Public Library | ME | WordPress-ME | 16 |
| South Portland Public Library | ME | WordPress-ME | 12 |
| Southport Memorial Library | ME | WordPress-ME | 0 |
| Springvale Public Library | ME | WordPress-ME | 0 |
| Standish - Richville Library | ME | WordPress-ME | 1 |
| Steep Falls Library | ME | WordPress-ME | 0 |
| Stockton Springs Community Library | ME | WordPress-ME | 0 |
| Stonington Public Library | ME | WordPress-ME | 0 |
| Swans Island Public Library | ME | WordPress-ME | 0 |
| Thomas Free Library | ME | WordPress-ME | 0 |
| Thomaston Public Library | ME | WordPress-ME | 0 |
| Topsham Public Library | ME | WordPress-ME | 0 |
| Vose Library | ME | WordPress-ME | 104 |
| Waldoboro Public Library | ME | WordPress-ME | 0 |
| Warren Free Public Library | ME | WordPress-ME | 1 |
| Washburn Memorial Library | ME | WordPress-ME | 0 |
| Waterford Library Association | ME | WordPress-ME | 0 |
| Waterville Public Library | ME | WordPress-ME | 29 |
| Wells Public Library | ME | WordPress-ME | 0 |
| West Paris Public Library | ME | WordPress-ME | 0 |
| Westbrook Public Library | ME | WordPress-ME | 0 |
| Wilton Free Public Library | ME | WordPress-ME | 1 |
| Windham Public Library | ME | WordPress-ME | 0 |
| Winterport Memorial Library | ME | WordPress-ME | 1 |
| York Public Library | ME | WordPress-ME | 0 |
| A. E. Wood Library | — | WordPress-MS | 0 |
| Ada S. Fant Memorial Library | — | WordPress-MS | 0 |
| Belmont Public Library | — | WordPress-MS | 6 |
| Bolivar County Library System | — | WordPress-MS | 0 |
| Central Mississippi Regional Library System | — | WordPress-MS | 0 |
| Clarke County-Quitman Public Library | — | WordPress-MS | 0 |
| Columbia-Marion County Library | — | WordPress-MS | 0 |
| Columbus-Lowndes Public Library | — | WordPress-MS | 0 |
| Crawford Public Library | — | WordPress-MS | 1 |
| Crosby Public Library | — | WordPress-MS | 0 |
| Decatur Public Library | — | WordPress-MS | 0 |
| Dekalb Public Library | — | WordPress-MS | 4 |
| Dixie Regional Library System | — | WordPress-MS | 0 |
| Enterprise Public Library | — | WordPress-MS | 0 |
| Evelyn Taylor Majure Library | — | WordPress-MS | 0 |
| Field Memorial Library | — | WordPress-MS | 0 |
| First Regional Library | — | WordPress-MS | 0 |
| Florence Public Library | — | WordPress-MS | 31 |
| Forest Public Library | — | WordPress-MS | 6 |
| Franklin County Public Library | — | WordPress-MS | 0 |
| Hamilton Public Library | — | WordPress-MS | 0 |
| Harrison County Library System | — | WordPress-MS | 0 |
| Houston Carnegie Library | — | WordPress-MS | 0 |
| Itawamba County-Pratt Memorial Library | — | WordPress-MS | 0 |
| J. Elliott Mcmullan Library | — | WordPress-MS | 0 |
| Jackson-George Regional Library System | — | WordPress-MS | 6 |
| Jackson-Hinds Library System | — | WordPress-MS | 19 |
| Kemper-Newton Regional Library | — | WordPress-MS | 104 |
| Lafayette County-Oxford Public Library | — | WordPress-MS | 0 |
| Laurel-Jones County Library | — | WordPress-MS | 150 |
| Lawrence County Public Library | — | WordPress-MS | 1 |
| Lee-Itawamba Library System | — | WordPress-MS | 25 |
| Leland Public Library | — | WordPress-MS | 0 |
| Lexington Public Library | — | WordPress-MS | 0 |
| Lincoln-Lawrence-Franklin Regional Library | — | WordPress-MS | 17 |
| Long Beach Public Library | — | WordPress-MS | 1 |
| Magnolia Public Library | — | WordPress-MS | 0 |
| Morton Public Library | — | WordPress-MS | 0 |
| Northeast Regional Library | — | WordPress-MS | 0 |
| Oakland Public Library | — | WordPress-MS | 34 |
| Pearl River County Library System | — | WordPress-MS | 137 |
| Pine Forest Regional Library | — | WordPress-MS | 0 |
| Rebecca Baine Rigby Library | — | WordPress-MS | 8 |
| Richland Public Library | — | WordPress-MS | 13 |
| Ripley Public Library | — | WordPress-MS | 0 |
| Sherman Library | — | WordPress-MS | 1 |
| Starkville-Oktibbeha County Public Library | — | WordPress-MS | 0 |
| Tombigbee Regional Library System | — | WordPress-MS | 0 |
| Warren County-Vicksburg Public Library | — | WordPress-MS | 0 |
| William And Dolores Mauldin Library | — | WordPress-MS | 0 |
| William Estes Powell Memorial Library | — | WordPress-MS | 0 |
| Winston County Library | — | WordPress-MS | 12 |
| Woodville Public Library | — | WordPress-MS | 0 |
| Anthony Pio Costa Memorial Library | NJ | WordPress-NJ | 8 |
| Asbury Park Free Public Library | NJ | WordPress-NJ | 0 |
| Atlantic City Free Public Library | NJ | WordPress-NJ | 0 |
| Audubon Free Public Library | NJ | WordPress-NJ | 11 |
| Bayonne Free Public Library | NJ | WordPress-NJ | 1 |
| Beach Haven Free Public Library | NJ | WordPress-NJ | 54 |
| Belmar Public Library | NJ | WordPress-NJ | 150 |
| Bergenfield Free Public Library | NJ | WordPress-NJ | 0 |
| Bernardsville Public Library | NJ | WordPress-NJ | 1 |
| Bloomingdale Free Public Library | NJ | WordPress-NJ | 0 |
| Boonton Holmes Public Library | NJ | WordPress-NJ | 0 |
| Bradley Beach Public Library | NJ | WordPress-NJ | 0 |
| Bridgeton Free Public Library | NJ | WordPress-NJ | 0 |
| Butler Public Library | NJ | WordPress-NJ | 0 |
| Camden Free Public Library | NJ | WordPress-NJ | 0 |
| Carteret Free Public Library | NJ | WordPress-NJ | 0 |
| Cedar Grove Free Public Library | NJ | WordPress-NJ | 0 |
| Chathams Joint Free Public Library | NJ | WordPress-NJ | 132 |
| Chester Library | NJ | WordPress-NJ | 0 |
| Clark Public Library | NJ | WordPress-NJ | 0 |
| Cliffside Park Free Public Library | NJ | WordPress-NJ | 129 |
| Cranford Public Library | NJ | WordPress-NJ | 32 |
| Cresskill Public Library | NJ | WordPress-NJ | 0 |
| Crosswicks Library Company | NJ | WordPress-NJ | 1 |
| Delanco Public Library | NJ | WordPress-NJ | 0 |
| Demarest Public Library Association | NJ | WordPress-NJ | 0 |
| Denville Free Public Library | NJ | WordPress-NJ | 53 |
| Dixon Homestead Library | NJ | WordPress-NJ | 1 |
| Dover Free Public Library | NJ | WordPress-NJ | 4 |
| Dowdell Library Of South Amboy | NJ | WordPress-NJ | 0 |
| Dunellen Free Public Library | NJ | WordPress-NJ | 5 |
| Dwight D. Eisenhower Library | NJ | WordPress-NJ | 0 |
| Edgewater Free Public Library | NJ | WordPress-NJ | 0 |
| Elmwood Park Free Public Library | NJ | WordPress-NJ | 0 |
| Emerson Public Library | NJ | WordPress-NJ | 2 |
| Englewood Free Public Library | NJ | WordPress-NJ | 0 |
| Fair Haven Public Library | NJ | WordPress-NJ | 0 |
| Fanwood Memorial Library | NJ | WordPress-NJ | 8 |
| Flemington Free Public Library | NJ | WordPress-NJ | 1 |
| Fort Lee Free Public Library | NJ | WordPress-NJ | 67 |
| Franklin Lakes Free Public Library | NJ | WordPress-NJ | 36 |
| Franklin Twp Public Library-Gloucester | NJ | WordPress-NJ | 61 |
| Franklin Twp Public Library-Somerset | NJ | WordPress-NJ | 3 |
| Glen Ridge Free Public Library | NJ | WordPress-NJ | 0 |
| Glen Rock Public Library | NJ | WordPress-NJ | 1 |
| Gloucester City Library | NJ | WordPress-NJ | 100 |
| Hackettstown Free Public Library | NJ | WordPress-NJ | 150 |
| Haddonfield Public Library | NJ | WordPress-NJ | 0 |
| Hamilton Township Free Public Library | NJ | WordPress-NJ | 0 |
| Hasbrouck Heights Free Public Library | NJ | WordPress-NJ | 1 |
| Haworth Municipal Library | NJ | WordPress-NJ | 0 |
| Hillside Free Public Library | NJ | WordPress-NJ | 89 |
| Hoboken Public Library | NJ | WordPress-NJ | 37 |
| Irvington Public Library | NJ | WordPress-NJ | 1 |
| Jamesburg Public Library | NJ | WordPress-NJ | 5 |
| Kearny Public Library | NJ | WordPress-NJ | 79 |
| Kenilworth Public Library | NJ | WordPress-NJ | 9 |
| Keyport Free Public Library | NJ | WordPress-NJ | 0 |
| Kinnelon Public Library | NJ | WordPress-NJ | 1 |
| Lambertville Free Public Library | NJ | WordPress-NJ | 0 |
| Leonia Public Library | NJ | WordPress-NJ | 1 |
| Lincoln Park Public Library | NJ | WordPress-NJ | 0 |
| Linwood Public Library | NJ | WordPress-NJ | 0 |
| Little Falls Public Library | NJ | WordPress-NJ | 67 |
| Little Silver Public Library | NJ | WordPress-NJ | 0 |
| Lyndhurst Free Public Library | NJ | WordPress-NJ | 12 |
| Madison Public Library | NJ | WordPress-NJ | 12 |
| Maplewood Memorial Library | NJ | WordPress-NJ | 1 |
| Margate City Public Library | NJ | WordPress-NJ | 12 |
| Maurice M. Pine Free Public Library | NJ | WordPress-NJ | 0 |
| Maywood Public Library | NJ | WordPress-NJ | 0 |
| Metuchen Public Library | NJ | WordPress-NJ | 92 |
| Middletown Township Public Library | NJ | WordPress-NJ | 0 |
| Midland Park Memorial Library | NJ | WordPress-NJ | 11 |
| Millburn Free Public Library | NJ | WordPress-NJ | 2 |
| Milltown Public Library | NJ | WordPress-NJ | 0 |
| Millville Public Library | NJ | WordPress-NJ | 0 |
| Monmouth Beach Public Library | NJ | WordPress-NJ | 0 |
| Monroe Twp Public Library-Gloucester | NJ | WordPress-NJ | 150 |
| Monroe Twp Public Library-Middlesex | NJ | WordPress-NJ | 1 |
| Montclair Public Library | NJ | WordPress-NJ | 117 |
| Montville Township Public Library | NJ | WordPress-NJ | 12 |
| Moorestown Library | NJ | WordPress-NJ | 36 |
| Morris Plains Library | NJ | WordPress-NJ | 4 |
| Morristown-Morris Twp Joint Public Library | NJ | WordPress-NJ | 0 |
| Mount Arlington Public Library | NJ | WordPress-NJ | 0 |
| Mount Laurel Library | NJ | WordPress-NJ | 204 |
| Mountain Lakes Free Public Library | NJ | WordPress-NJ | 4 |
| Mountainside Free Public Library | NJ | WordPress-NJ | 17 |
| New Milford Public Library | NJ | WordPress-NJ | 5 |
| New Providence Memorial Library | NJ | WordPress-NJ | 0 |
| North Arlington Public Library | NJ | WordPress-NJ | 0 |
| North Brunswick Free Public Library | NJ | WordPress-NJ | 10 |
| North Haledon Free Public Library | NJ | WordPress-NJ | 3 |
| Norwood Public Library | NJ | WordPress-NJ | 1 |
| Oakland Public Library | NJ | WordPress-NJ | 34 |
| Ocean City Free Public Library | NJ | WordPress-NJ | 4 |
| Old Bridge Public Library | NJ | WordPress-NJ | 0 |
| Old Tappan Free Public Library | NJ | WordPress-NJ | 0 |
| Palisades Park Free Public Library | NJ | WordPress-NJ | 1 |
| Paramus Public Library | NJ | WordPress-NJ | 1 |
| Park Ridge Free Public Library | NJ | WordPress-NJ | 5 |
| Parsippany-Troy Hills Public Library | NJ | WordPress-NJ | 0 |
| Passaic Public Library | NJ | WordPress-NJ | 0 |
| Pennington Free Public Library | NJ | WordPress-NJ | 22 |
| Pennsauken Free Public Library | NJ | WordPress-NJ | 1 |
| Pennsville Public Library | NJ | WordPress-NJ | 0 |
| Piscataway Public Library | NJ | WordPress-NJ | 132 |
| Plainfield Free Public Library | NJ | WordPress-NJ | 123 |
| Plainsboro Free Public Library | NJ | WordPress-NJ | 0 |
| Pompton Lakes Borough Free Public Library | NJ | WordPress-NJ | 6 |
| Princeton Public Library | NJ | WordPress-NJ | 0 |
| Rahway Public Library | NJ | WordPress-NJ | 12 |
| Ramsey Free Public Library | NJ | WordPress-NJ | 41 |
| Red Bank Public Library | NJ | WordPress-NJ | 28 |
| Ridgefield Free Public Library | NJ | WordPress-NJ | 0 |
| Ridgewood Public Library | NJ | WordPress-NJ | 0 |
| Ringwood Public Library | NJ | WordPress-NJ | 150 |
| River Vale Public Library | NJ | WordPress-NJ | 0 |
| Riverdale Public Library | NJ | WordPress-NJ | 1 |
| Riverside Public Library | NJ | WordPress-NJ | 0 |
| Roseland Free Public Library | NJ | WordPress-NJ | 0 |
| Roselle Free Public Library | NJ | WordPress-NJ | 54 |
| Roselle Park Veterans Memorial Library | NJ | WordPress-NJ | 1 |
| Runnemede Public Library | NJ | WordPress-NJ | 8 |
| Ruth L. Rockwood Memorial Library | NJ | WordPress-NJ | 0 |
| Rutherford Free Public Library | NJ | WordPress-NJ | 1 |
| Saddle Brook Free Public Library | NJ | WordPress-NJ | 16 |
| Salem Free Public Library | NJ | WordPress-NJ | 0 |
| Sally Stretch Keen Memorial Library | NJ | WordPress-NJ | 0 |
| Scotch Plains Public Library | NJ | WordPress-NJ | 2 |
| Secaucus Free Public Library | NJ | WordPress-NJ | 0 |
| South River Public Library | NJ | WordPress-NJ | 0 |
| Sparta Public Library | NJ | WordPress-NJ | 79 |
| Spring Lake Public Library | NJ | WordPress-NJ | 4 |
| Springfield Free Public Library | NJ | WordPress-NJ | 1 |
| Stratford Public Library | NJ | WordPress-NJ | 1 |
| Summit Free Public Library | NJ | WordPress-NJ | 0 |
| Sussex County Library | NJ | WordPress-NJ | 0 |
| Teaneck Public Library | NJ | WordPress-NJ | 1 |
| Tenafly Free Public Library | NJ | WordPress-NJ | 0 |
| Union Free Public Library | NJ | WordPress-NJ | 104 |
| Verona Free Public Library | NJ | WordPress-NJ | 150 |
| Vineland Public Library | NJ | WordPress-NJ | 0 |
| Waldwick Public Library | NJ | WordPress-NJ | 0 |
| Wanaque Borough Free Public Library | NJ | WordPress-NJ | 150 |
| West Orange Free Public Library | NJ | WordPress-NJ | 0 |
| Westfield Memorial Library | NJ | WordPress-NJ | 5 |
| Westwood Free Public Library | NJ | WordPress-NJ | 0 |
| Wharton Public Library | NJ | WordPress-NJ | 0 |
| William E. Dermody Free Public Library | NJ | WordPress-NJ | 24 |
| Wood-Ridge Memorial Library | NJ | WordPress-NJ | 32 |
| Woodbridge Public Library | NJ | WordPress-NJ | 8 |
| Woodbury Public Library | NJ | WordPress-NJ | 23 |
| Woodstown-Pilesgrove Library | NJ | WordPress-NJ | 0 |
| Worth Pinkham Memorial Library | NJ | WordPress-NJ | 1 |
| Wyckoff Free Public Library | NJ | WordPress-NJ | 0 |
| Addison Public Library | NY | WordPress-NY | 0 |
| Albany Public Library | NY | WordPress-NY | 23 |
| Alden Ewell Free Library | NY | WordPress-NY | 0 |
| Alfred Box Of Books Library | NY | WordPress-NY | 2 |
| Allegany Public Library | NY | WordPress-NY | 1 |
| Almond Twentieth Century Club Library | NY | WordPress-NY | 1 |
| Amagansett Free Library | NY | WordPress-NY | 0 |
| Amenia Free Library | NY | WordPress-NY | 0 |
| Amherst Public Library Clearfield Branch | NY | WordPress-NY | 0 |
| Andes Public Library | NY | WordPress-NY | 0 |
| Andover Free Library | NY | WordPress-NY | 0 |
| Annie Porter Ainsworth Memorial Library | NY | WordPress-NY | 150 |
| Apalachin Library Association | NY | WordPress-NY | 0 |
| Arcade Free Library | NY | WordPress-NY | 0 |
| Ardsley Public Library | NY | WordPress-NY | 0 |
| Audubon Branch | NY | WordPress-NY | 25 |
| Aurora Free Library | NY | WordPress-NY | 2 |
| B. Elizabeth Strong Memorial Library | NY | WordPress-NY | 1 |
| Babylon School District Public Library | NY | WordPress-NY | 3 |
| Bainbridge Free Library | NY | WordPress-NY | 0 |
| Baldwin Public Library | NY | WordPress-NY | 0 |
| Bancroft Public Library | NY | WordPress-NY | 0 |
| Barker Free Library | NY | WordPress-NY | 14 |
| Barneveld Free Library Association | NY | WordPress-NY | 0 |
| Beaver Falls Library | NY | WordPress-NY | 0 |
| Bedford Free Library | NY | WordPress-NY | 1 |
| Bedford Hills Free Library | NY | WordPress-NY | 17 |
| Belden Noble Memorial Library Of Essex | NY | WordPress-NY | 0 |
| Belfast Public Library | NY | WordPress-NY | 150 |
| Bellmore Memorial Library | NY | WordPress-NY | 1 |
| Bemus Point Public Library | NY | WordPress-NY | 0 |
| Blodgett Memorial Library District Of Fishkill | NY | WordPress-NY | 0 |
| Blount Library | NY | WordPress-NY | 18 |
| Brentwood Public Library | NY | WordPress-NY | 0 |
| Brewster Public Library | NY | WordPress-NY | 35 |
| Briarcliff Manor Public Library | NY | WordPress-NY | 17 |
| Bronxville Public Library | NY | WordPress-NY | 20 |
| Brooklyn Public Library | NY | WordPress-NY | 0 |
| Brownville-Glen Park Library | NY | WordPress-NY | 0 |
| Bryant Library | NY | WordPress-NY | 0 |
| Buffalo & Erie County Public Library | NY | WordPress-NY | 80 |
| C. W. Clark Memorial Library | NY | WordPress-NY | 0 |
| Cairo Public Library | NY | WordPress-NY | 1 |
| Caledonia Library Association | NY | WordPress-NY | 1 |
| Cambridge Public Library | NY | WordPress-NY | 11 |
| Camden Library Association | NY | WordPress-NY | 2 |
| Canajoharie Library And Art Gallery | NY | WordPress-NY | 0 |
| Canastota Public Library | NY | WordPress-NY | 0 |
| Canton Free Library | NY | WordPress-NY | 1 |
| Cape Vincent Community Library | NY | WordPress-NY | 57 |
| Cattaraugus Free Library | NY | WordPress-NY | 1 |
| Cazenovia Public Library Society | NY | WordPress-NY | 1 |
| Center Moriches Free Public Library | NY | WordPress-NY | 1 |
| Central Islip Public Library | NY | WordPress-NY | 0 |
| Central Square Library | NY | WordPress-NY | 20 |
| Chappaqua Library | NY | WordPress-NY | 47 |
| Chatham Public Library | NY | WordPress-NY | 1 |
| Cherry Valley Memorial Library | NY | WordPress-NY | 10 |
| Chester Public Library | NY | WordPress-NY | 0 |
| Claverack Library | NY | WordPress-NY | 1 |
| Clyde-Savannah Public Library | NY | WordPress-NY | 2 |
| Clymer-French Creek Free Library | NY | WordPress-NY | 0 |
| Cohocton Public Library | NY | WordPress-NY | 66 |
| Cohoes Public Library | NY | WordPress-NY | 0 |
| Community Free Library | NY | WordPress-NY | 19 |
| Copiague Memorial Public Library | NY | WordPress-NY | 1 |
| Corfu Free Library | NY | WordPress-NY | 0 |
| Cornwall Public Library | NY | WordPress-NY | 6 |
| Cuba Circulating Library Association | NY | WordPress-NY | 65 |
| Cutchogue New Suffolk Free Library | NY | WordPress-NY | 0 |
| D.R. Evarts Library | NY | WordPress-NY | 38 |
| Dansville Public Library | NY | WordPress-NY | 0 |
| David A Howe Public Library | NY | WordPress-NY | 0 |
| Deer Park Public Library | NY | WordPress-NY | 0 |
| Delevan-Yorkshire Public Library | NY | WordPress-NY | 0 |
| Deruyter Free Library | NY | WordPress-NY | 1 |
| Dewitt Community Library Assoc., Inc | NY | WordPress-NY | 16 |
| Didymus Thomas Library | NY | WordPress-NY | 0 |
| Dobbs Ferry Public Library | NY | WordPress-NY | 20 |
| Dolgeville-Manheim Public Library | NY | WordPress-NY | 0 |
| Dormann Library | NY | WordPress-NY | 29 |
| Dunham Public Library | NY | WordPress-NY | 0 |
| Dunkirk Free Library | NY | WordPress-NY | 1 |
| Eagle Free Library | NY | WordPress-NY | 13 |
| Earlville Free Library | NY | WordPress-NY | 1 |
| East Greenbush Community Library | NY | WordPress-NY | 4 |
| East Hampton Library | NY | WordPress-NY | 33 |
| East Islip Public Library | NY | WordPress-NY | 0 |
| East Rochester Public Library | NY | WordPress-NY | 0 |
| East Rockaway Public Library | NY | WordPress-NY | 6 |
| Eastchester Public Library | NY | WordPress-NY | 5 |
| Edith B. Ford Memorial Library | NY | WordPress-NY | 0 |
| Elbridge Free Library | NY | WordPress-NY | 0 |
| Ellicottville Memorial Library | NY | WordPress-NY | 4 |
| Ellisburg Free Library | NY | WordPress-NY | 24 |
| Elmont Public Library | NY | WordPress-NY | 1 |
| Elwood Public Library | NY | WordPress-NY | 1 |
| Erwin Library Institute | NY | WordPress-NY | 0 |
| Ethelbert B. Crawford Public Library | NY | WordPress-NY | 18 |
| Fair Haven Public Library | NY | WordPress-NY | 1 |
| Fairport Public Library | NY | WordPress-NY | 8 |
| Falconer Public Library | NY | WordPress-NY | 1 |
| Farman Free Library Association Of Ellington | NY | WordPress-NY | 23 |
| Farmingdale Public Library | NY | WordPress-NY | 1 |
| Finkelstein Memorial Library | NY | WordPress-NY | 1 |
| Floral Park Public Library | NY | WordPress-NY | 2 |
| Franklin Free Library | NY | WordPress-NY | 3 |
| Fred And Harriet Taylor Memorial Library | NY | WordPress-NY | 23 |
| Free Library Of The Belmont Literary And Historical Society | NY | WordPress-NY | 13 |
| Freeport Memorial Library | NY | WordPress-NY | 7 |
| Fulton Public Library | NY | WordPress-NY | 0 |
| Galway Public Library | NY | WordPress-NY | 0 |
| Garden City Public Library | NY | WordPress-NY | 69 |
| Gardiner Library | NY | WordPress-NY | 0 |
| Germantown Library | NY | WordPress-NY | 150 |
| Glen Cove Public Library | NY | WordPress-NY | 0 |
| Gloversville Public Library | NY | WordPress-NY | 1 |
| Gorham Free Library | NY | WordPress-NY | 1 |
| Goshen Public Library And Historical Society | NY | WordPress-NY | 0 |
| Gowanda Free Library | NY | WordPress-NY | 2 |
| Great Neck Library | NY | WordPress-NY | 68 |
| Greenville Public Library | NY | WordPress-NY | 1 |
| Guernsey Memorial Library Of Norwich | NY | WordPress-NY | 1 |
| Guilderland Public Library | NY | WordPress-NY | 1 |
| Hamburg Library | NY | WordPress-NY | 27 |
| Hamilton Public Library | NY | WordPress-NY | 0 |
| Hamlin Public Library | NY | WordPress-NY | 0 |
| Hammond Free Library | NY | WordPress-NY | 0 |
| Hammond Library Of Crown Point | NY | WordPress-NY | 1 |
| Hampton Bays Public Library | NY | WordPress-NY | 5 |
| Hannibal Free Library | NY | WordPress-NY | 0 |
| Harrison Public Library | NY | WordPress-NY | 10 |
| Hauppauge Public Library | NY | WordPress-NY | 0 |
| Haverstraw Kings Daughters Public Library - Village Branch | NY | WordPress-NY | 0 |
| Hawn Memorial Library | NY | WordPress-NY | 150 |
| Haxton Memorial Library | NY | WordPress-NY | 11 |
| Henry Waldinger Memorial Library | NY | WordPress-NY | 43 |
| Hepburn Library Of Waddington | NY | WordPress-NY | 7 |
| Hicksville Public Library | NY | WordPress-NY | 15 |
| Highland Falls Library | NY | WordPress-NY | 0 |
| Highland Public Library | NY | WordPress-NY | 0 |
| Holland Patent Free Library | NY | WordPress-NY | 0 |
| Howland Public Library | NY | WordPress-NY | 2 |
| Hudson Area Association Library | NY | WordPress-NY | 1 |
| Huntington Public Library | NY | WordPress-NY | 0 |
| Hurley Library District | NY | WordPress-NY | 10 |
| Hyde Park Free Library | NY | WordPress-NY | 35 |
| Ilion Free Public Library | NY | WordPress-NY | 0 |
| Irvington Pub Lib Guiteau Foundation | NY | WordPress-NY | 3 |
| Island Park Public Library | NY | WordPress-NY | 1 |
| Islip Public Library | NY | WordPress-NY | 0 |
| Ithaca Tompkins County Public Library | NY | WordPress-NY | 42 |
| Jericho Public Library | NY | WordPress-NY | 69 |
| John C. Hart Memorial Library | NY | WordPress-NY | 0 |
| John Jermain Memorial Library | NY | WordPress-NY | 0 |
| Jordan Bramley Library | NY | WordPress-NY | 0 |
| Jordanville Public Library | NY | WordPress-NY | 0 |
| Katonah Village Library | NY | WordPress-NY | 6 |
| Keene Valley Public Library | NY | WordPress-NY | 0 |
| Kennedy Free Library | NY | WordPress-NY | 0 |
| Kinderhook Memorial Library | NY | WordPress-NY | 150 |
| King Memorial Library | NY | WordPress-NY | 13 |
| Kingston Library | NY | WordPress-NY | 11 |
| Kirkland Town Library | NY | WordPress-NY | 0 |
| Lafayette Public Library | NY | WordPress-NY | 0 |
| Lake Placid Public Library | NY | WordPress-NY | 12 |
| Lakewood Memorial Library | NY | WordPress-NY | 0 |
| Lansing Community Library | NY | WordPress-NY | 10 |
| Larchmont Public Library | NY | WordPress-NY | 9 |
| Lewisboro Library | NY | WordPress-NY | 150 |
| Lewiston Public Library | NY | WordPress-NY | 0 |
| Library Association Of Rockland County | NY | WordPress-NY | 58 |
| Lindenhurst Memorial Library | NY | WordPress-NY | 88 |
| Lisle Free Library | NY | WordPress-NY | 0 |
| Little Falls Public Library | NY | WordPress-NY | 67 |
| Livingston Free Library | NY | WordPress-NY | 0 |
| Livingston Manor Free Library | NY | WordPress-NY | 13 |
| Livonia Public Library | NY | WordPress-NY | 1 |
| Lockport Public Library | NY | WordPress-NY | 43 |
| Locust Valley Library | NY | WordPress-NY | 0 |
| Long Beach Public Library | NY | WordPress-NY | 1 |
| Louise Adelia Read Memorial Library | NY | WordPress-NY | 1 |
| Lynbrook Public Library | NY | WordPress-NY | 42 |
| Lyons Falls Library | NY | WordPress-NY | 3 |
| Lyons Public Library | NY | WordPress-NY | 0 |
| Mahopac Public Library | NY | WordPress-NY | 10 |
| Malverne Public Library | NY | WordPress-NY | 1 |
| Mamaroneck Public Library District | NY | WordPress-NY | 150 |
| Manhasset Public Library | NY | WordPress-NY | 12 |
| Manlius Library | NY | WordPress-NY | 1 |
| Mannsville Free Library | NY | WordPress-NY | 33 |
| Marcellus Free Library | NY | WordPress-NY | 0 |
| Marion Public Library | NY | WordPress-NY | 2 |
| Marlboro Free Library | NY | WordPress-NY | 2 |
| Mary E. Seymour Memorial Free Library | NY | WordPress-NY | 0 |
| Mayville Library | NY | WordPress-NY | 0 |
| Memorial Library Of Little Valley | NY | WordPress-NY | 3 |
| Menands Public Library | NY | WordPress-NY | 0 |
| Merrick Library | NY | WordPress-NY | 1 |
| Middleburgh Library | NY | WordPress-NY | 0 |
| Middleville Free Library | NY | WordPress-NY | 0 |
| Millbrook Free Library | NY | WordPress-NY | 0 |
| Minerva Free Library | NY | WordPress-NY | 1 |
| Minoa Library | NY | WordPress-NY | 0 |
| Modeste Bedient Memorial Library | NY | WordPress-NY | 6 |
| Monroe Free Library | NY | WordPress-NY | 0 |
| Montauk Library | NY | WordPress-NY | 12 |
| Montgomery Free Library | NY | WordPress-NY | 0 |
| Montour Falls Memorial Library | NY | WordPress-NY | 11 |
| Mooers Free Library | NY | WordPress-NY | 0 |
| Moore Memorial Library | NY | WordPress-NY | 0 |
| Morristown Public Library | NY | WordPress-NY | 2 |
| Morton Memorial Library | NY | WordPress-NY | 1 |
| Mount Morris Library | NY | WordPress-NY | 0 |
| Mount Vernon Public Library | NY | WordPress-NY | 30 |
| Nanuet Public Library | NY | WordPress-NY | 1 |
| Naples Library | NY | WordPress-NY | 0 |
| Nassau Free Library | NY | WordPress-NY | 1 |
| Nassau Library System | NY | WordPress-NY | 0 |
| New Berlin Library | NY | WordPress-NY | 37 |
| New Lebanon Library | NY | WordPress-NY | 26 |
| New Rochelle Public Library | NY | WordPress-NY | 0 |
| New Woodstock Free Library | NY | WordPress-NY | 0 |
| New York Mills Public Library | NY | WordPress-NY | 0 |
| New York Public Library | NY | WordPress-NY | 0 |
| Newark Public Library | NY | WordPress-NY | 1 |
| Newburgh Free Library | NY | WordPress-NY | 2 |
| Newfane Free Library | NY | WordPress-NY | 0 |
| Newstead Public Library | NY | WordPress-NY | 0 |
| North Bellmore Public Library | NY | WordPress-NY | 1 |
| North Chatham Free Library | NY | WordPress-NY | 40 |
| North Merrick Public Library | NY | WordPress-NY | 46 |
| Northville Public Library | NY | WordPress-NY | 0 |
| Norwood Library | NY | WordPress-NY | 0 |
| Nyack Library | NY | WordPress-NY | 1 |
| Oceanside Library | NY | WordPress-NY | 70 |
| Old Forge Library | NY | WordPress-NY | 1 |
| Olean Public Library | NY | WordPress-NY | 2 |
| Orangeburg Library | NY | WordPress-NY | 8 |
| Oriskany Public Library | NY | WordPress-NY | 0 |
| Orleans Public Library | NY | WordPress-NY | 0 |
| Ossining Public Library | NY | WordPress-NY | 4 |
| Oswego School District Public Library | NY | WordPress-NY | 0 |
| Oxford Memorial Library | NY | WordPress-NY | 0 |
| Oyster Bay-East Norwich Public Library | NY | WordPress-NY | 1 |
| Palisades Free Library | NY | WordPress-NY | 1 |
| Parish Public Library | NY | WordPress-NY | 0 |
| Patterson Library | NY | WordPress-NY | 1 |
| Pawling Free Library | NY | WordPress-NY | 0 |
| Pearl River Public Library | NY | WordPress-NY | 1 |
| Pember Library Museum | NY | WordPress-NY | 3 |
| Penfield Public Library | NY | WordPress-NY | 0 |
| Perry Public Library | NY | WordPress-NY | 0 |
| Peru Free Library | NY | WordPress-NY | 27 |
| Phillips Free Library | NY | WordPress-NY | 1 |
| Phoenicia Library | NY | WordPress-NY | 1 |
| Phoenix Public Library | NY | WordPress-NY | 1 |
| Piermont Library District | NY | WordPress-NY | 1 |
| Pike Library | NY | WordPress-NY | 0 |
| Pine Plains Free Library | NY | WordPress-NY | 150 |
| Plainedge Public Library | NY | WordPress-NY | 6 |
| Pleasant Valley Free Library | NY | WordPress-NY | 1 |
| Poestenkill Library | NY | WordPress-NY | 4 |
| Port Byron Library | NY | WordPress-NY | 1 |
| Port Chester Public Library | NY | WordPress-NY | 9 |
| Port Jervis Free Library | NY | WordPress-NY | 0 |
| Port Leyden Community Library | NY | WordPress-NY | 0 |
| Portville Free Library | NY | WordPress-NY | 0 |
| Potsdam Public Library | NY | WordPress-NY | 19 |
| Poughkeepsie Public Library District | NY | WordPress-NY | 1 |
| Pound Ridge Library District | NY | WordPress-NY | 0 |
| Prospect Free Library | NY | WordPress-NY | 0 |
| Putnam Valley Free Library | NY | WordPress-NY | 1 |
| Queens Borough Public Library - Astoria | NY | WordPress-NY | 0 |
| Queens Borough Public Library - Elmhurst | NY | WordPress-NY | 0 |
| Queens Borough Public Library - Glendale | NY | WordPress-NY | 0 |
| Queens Borough Public Library - Hollis | NY | WordPress-NY | 1 |
| Queens Borough Public Library - Woodside | NY | WordPress-NY | 13 |
| Queens Public Library | NY | WordPress-NY | 1 |
| Quogue Library | NY | WordPress-NY | 0 |
| Ramapo Catskill Library System | NY | WordPress-NY | 0 |
| Ransomville Free Library | NY | WordPress-NY | 0 |
| Reading Room Association Of Gouverneur | NY | WordPress-NY | 0 |
| Red Hook Public Library | NY | WordPress-NY | 1 |
| Reed Memorial Library | NY | WordPress-NY | 1 |
| Rensselaer Public Library | NY | WordPress-NY | 7 |
| Rensselaerville Public Library | NY | WordPress-NY | 0 |
| Richmond Memorial Library | NY | WordPress-NY | 0 |
| Ripley Free Library | NY | WordPress-NY | 7 |
| Riverhead Free Library | NY | WordPress-NY | 105 |
| Rochester Public Library | NY | WordPress-NY | 20 |
| Rockville Centre Public Library | NY | WordPress-NY | 58 |
| Rodman Public Library | NY | WordPress-NY | 0 |
| Roosevelt Public Library | NY | WordPress-NY | 0 |
| Rose Free Library | NY | WordPress-NY | 0 |
| Rose Memorial Library Association | NY | WordPress-NY | 1 |
| Rosendale Library | NY | WordPress-NY | 1 |
| Rouses Point Dodge Memorial Library | NY | WordPress-NY | 2 |
| Roxbury Library Association | NY | WordPress-NY | 1 |
| Rush Public Library | NY | WordPress-NY | 1 |
| Russell Public Library | NY | WordPress-NY | 1 |
| Rye Free Reading Room | NY | WordPress-NY | 2 |
| Sachem Public Library | NY | WordPress-NY | 0 |
| Salamanca Public Library | NY | WordPress-NY | 12 |
| Sayville Library | NY | WordPress-NY | 140 |
| Scarsdale Public Library | NY | WordPress-NY | 54 |
| Schenectady County Public Library | NY | WordPress-NY | 0 |
| Schoharie Free Library Assn. | NY | WordPress-NY | 0 |
| Schroon Lake Public Library | NY | WordPress-NY | 150 |
| Scio Memorial Library | NY | WordPress-NY | 0 |
| Scottsville Free Library | NY | WordPress-NY | 1 |
| Sea Cliff Village Library | NY | WordPress-NY | 1 |
| Seaford Public Library | NY | WordPress-NY | 0 |
| Seneca Falls Library | NY | WordPress-NY | 0 |
| Seneca Nation Of Indians Library Cattaraugus Territory | NY | WordPress-NY | 0 |
| Seymour Public Library District | NY | WordPress-NY | 122 |
| Shelter Island Public Library Society | NY | WordPress-NY | 0 |
| Shelter Rock Public Library | NY | WordPress-NY | 1 |
| Sherburne Public Library | NY | WordPress-NY | 2 |
| Sidney Memorial Public Library | NY | WordPress-NY | 0 |
| Sinclairville Free Library | NY | WordPress-NY | 14 |
| Sloatsburg Public Library | NY | WordPress-NY | 1 |
| Smyrna Public Library | NY | WordPress-NY | 0 |
| Sodus Free Library | NY | WordPress-NY | 0 |
| Solvay Public Library | NY | WordPress-NY | 0 |
| Somers Library | NY | WordPress-NY | 14 |
| Southold Free Library | NY | WordPress-NY | 0 |
| Staatsburg Library | NY | WordPress-NY | 13 |
| Stamford Village Library | NY | WordPress-NY | 0 |
| Stephentown Memorial Library | NY | WordPress-NY | 1 |
| Stillwater Free Library | NY | WordPress-NY | 5 |
| Stone Ridge Public Library | NY | WordPress-NY | 0 |
| Suffern Free Library | NY | WordPress-NY | 3 |
| Sullivan Free Library Of Bridgeport | NY | WordPress-NY | 21 |
| Swan Library | NY | WordPress-NY | 0 |
| Syosset Public Library | NY | WordPress-NY | 0 |
| Syracuse Public Library | NY | WordPress-NY | 74 |
| Tappan Library | NY | WordPress-NY | 0 |
| The Jervis Public Library Association, Inc. | NY | WordPress-NY | 0 |
| Tivoli Free Library | NY | WordPress-NY | 0 |
| Tomkins Cove Public Library | NY | WordPress-NY | 2 |
| Town Of Pelham Public Library | NY | WordPress-NY | 47 |
| Town Of Westerlo Public Library | NY | WordPress-NY | 15 |
| Tuckahoe Public Library | NY | WordPress-NY | 0 |
| Tuxedo Park Library | NY | WordPress-NY | 0 |
| Ulysses Philomathic Library | NY | WordPress-NY | 2 |
| Unadilla Public Library | NY | WordPress-NY | 1 |
| Utica Public Library | NY | WordPress-NY | 35 |
| Valley Cottage Free Library | NY | WordPress-NY | 0 |
| Valley Falls Free Library | NY | WordPress-NY | 2 |
| Vernon Public Library | NY | WordPress-NY | 7 |
| Village Library Of Cooperstown | NY | WordPress-NY | 0 |
| Voorheesville Public Library | NY | WordPress-NY | 0 |
| Wadsworth Library | NY | WordPress-NY | 0 |
| Walworth-Seely Public Library | NY | WordPress-NY | 0 |
| Wantagh Public Library | NY | WordPress-NY | 0 |
| Warner Library | NY | WordPress-NY | 0 |
| Warsaw Public Library | NY | WordPress-NY | 14 |
| Waterford Public Library | NY | WordPress-NY | 0 |
| Waterloo Library And Historical Society | NY | WordPress-NY | 0 |
| Watkins Glen Cen Sch Dis Free Pub Lib | NY | WordPress-NY | 150 |
| Waverly Free Library | NY | WordPress-NY | 3 |
| Wayland Free Library | NY | WordPress-NY | 0 |
| Webster Public Library | NY | WordPress-NY | 17 |
| Weedsport Free Library | NY | WordPress-NY | 19 |
| West Hurley Public Library | NY | WordPress-NY | 5 |
| West Islip Public Library | NY | WordPress-NY | 0 |
| West Nyack Free Library | NY | WordPress-NY | 0 |
| West Winfield Library | NY | WordPress-NY | 0 |
| Westbury Memorial Public Library | NY | WordPress-NY | 2 |
| Westchester Library System | NY | WordPress-NY | 0 |
| Westport Library Association | NY | WordPress-NY | 15 |
| White Plains Public Library | NY | WordPress-NY | 0 |
| Whitesville Public Library | NY | WordPress-NY | 0 |
| Wide Awake Club Library | NY | WordPress-NY | 0 |
| William H. Bush Memorial Library | NY | WordPress-NY | 0 |
| William K Sanford Town Library | NY | WordPress-NY | 1 |
| Williamson Free Public Library | NY | WordPress-NY | 0 |
| Williamstown Library | NY | WordPress-NY | 150 |
| Williston Park Public Library | NY | WordPress-NY | 62 |
| Wilmington E.M. Cooper Memorial Public Library | NY | WordPress-NY | 10 |
| Wilson Free Library | NY | WordPress-NY | 0 |
| Windham Public Library | NY | WordPress-NY | 2 |
| Wolcott Civic Free Library | NY | WordPress-NY | 2 |
| Womens Round Lake Improvement Society Lib | NY | WordPress-NY | 3 |
| Woodgate Free Library | NY | WordPress-NY | 0 |
| Woodward Memorial Library | NY | WordPress-NY | 8 |
| Worcester Free Library | NY | WordPress-NY | 1 |
| Wyandanch Public Library | NY | WordPress-NY | 0 |
| Yonkers Public Library | NY | WordPress-NY | 39 |
| Your Home Public Library | NY | WordPress-NY | 0 |
**Cycle-completion check: not complete.** Across the current cycle (`## 2026-08-16`, `## 2026-08-18`, `## 2026-08-19`, `## 2026-08-20`, plus today) **95 of 109** active library-family scrapers have at least one row and **14** do not: BiblioCommons-KY, Communico-CT, Drupal-Parks, GoogleCalendar-MA, GoogleCalendar-SC, Pratt-Library, SandhillRegional-NC, WordPressTec-Parks (all Group 1/3 — a normal mid-cycle rotation gap), plus Berks-County, Brooklyn-Library, Cecil-County, Howard-County, Louisville-Library and Somerset-County, which ran today and are now covered by the aggregate rows above. No `Cycle complete` marker is added.

## 2026-08-22

**Window: 2026-08-22T07:00:01Z → present.** Group 1 rotation. The MacaroniKid Group 1 tail was still executing when this audit was built (it started 18:00:57Z), so its nine states are not represented here and will land in the next section — the same ordering caveat as `## 2026-08-21`.

**600 per-site rows across 34 scrapers.** BiblioCommons-KY/NJ/VA, Communico-CT/DC/MA/NC/VA and Drupal-Pennsylvania all produce per-site rows here. That is the **first full-rotation confirmation** of the `Found {N} events` logging fix logged 2026-08-20, which until now had been proven only on a single hand-run `Communico-MA`. The `_pending` entry tracking it is cleared in this run.

**269 of the 600 sites returned zero events, and 249 of those are WordPress-\*** (CT 52, TN 43, VT 40, AL 40, NC 39, GA 35). That is the known WordPress platform-heterogeneity problem tracked by gate 1, not a new regression. The remaining 20 are Venue-Events-ScienceArts (8), WordPress-VA (4), LibCal-KY (3), CivicEngage-Libraries (2), and one each from LibCal-RI, LibCal-NY2, LibCal-NC.

**Three single-system scrapers ran today but emit neither recognised per-site log shape**, so they are recorded below as one aggregate row each, taken from the run table's FOUND column and labelled as such. `Pratt-Library` is the notable one — it had no row anywhere in the current cycle until this fallback was applied.

| Library Website | State | Scraper | Events Found |
|---|---|---|---|
| Enoch Pratt Free Library (scraper aggregate — no per-site log shape) | MD | Pratt-Library | 2363 |
| Free Library of Philadelphia (scraper aggregate — no per-site log shape) | PA | FreeLibrary-Philadelphia | 1000 |
| Westmoreland County Library (scraper aggregate — no per-site log shape) | PA | Westmoreland-Library | 24 |

| Library Website | State | Scraper | Events Found |
|---|---|---|---|
| Anne Arundel County Library events | — | AACPL | 23 |
| Kenton County Public Library | KY | BiblioCommons-KY | 499 |
| Burlington County Library System | NJ | BiblioCommons-NJ | 478 |
| Central Rappahannock Regional Library | VA | BiblioCommons-VA | 500 |
| Colonial Heights Public Library | VA | CivicEngage-Libraries | 0 |
| Williamson County Public Library | TN | CivicEngage-Libraries | 0 |
| Hartford Public Library | CT | Communico-CT | 13 |
| DC Public Library | DC | Communico-DC | 30 |
| Worcester Public Library | MA | Communico-MA | 4 |
| Forsyth County Public Library | NC | Communico-NC | 4 |
| Loudoun County Public Library | VA | Communico-VA | 10 |
| Prince William Public Library | VA | Communico-VA | 8 |
| Library System of Lancaster County | PA | Drupal-Pennsylvania | 1155 |
| York County Libraries | PA | Drupal-Pennsylvania | 564 |
| Lexington County Public Library | SC | EventON-Lexington | 1000 |
| Coverage: Fairfax County, Virginia | — | Fairfax-Parks | 20 |
| Alabama | AL | FairsFestivals-Eastern | 58 |
| Connecticut | CT | FairsFestivals-Eastern | 204 |
| Delaware | DE | FairsFestivals-Eastern | 30 |
| District of Columbia | DC | FairsFestivals-Eastern | 5 |
| Florida | FL | FairsFestivals-Eastern | 579 |
| Georgia | GA | FairsFestivals-Eastern | 193 |
| Illinois | IL | FairsFestivals-Eastern | 388 |
| Indiana | IN | FairsFestivals-Eastern | 186 |
| Kentucky | KY | FairsFestivals-Eastern | 85 |
| Maine | ME | FairsFestivals-Eastern | 110 |
| Maryland | MD | FairsFestivals-Eastern | 155 |
| Massachusetts | MA | FairsFestivals-Eastern | 209 |
| Michigan | MI | FairsFestivals-Eastern | 395 |
| Mississippi | MS | FairsFestivals-Eastern | 26 |
| New Hampshire | NH | FairsFestivals-Eastern | 73 |
| New Jersey | NJ | FairsFestivals-Eastern | 191 |
| New York | NY | FairsFestivals-Eastern | 430 |
| North Carolina | NC | FairsFestivals-Eastern | 436 |
| Ohio | OH | FairsFestivals-Eastern | 491 |
| Pennsylvania | PA | FairsFestivals-Eastern | 403 |
| Rhode Island | RI | FairsFestivals-Eastern | 57 |
| South Carolina | SC | FairsFestivals-Eastern | 105 |
| Tennessee | TN | FairsFestivals-Eastern | 184 |
| Vermont | VT | FairsFestivals-Eastern | 48 |
| Virginia | VA | FairsFestivals-Eastern | 270 |
| West Virginia | WV | FairsFestivals-Eastern | 23 |
| Wisconsin | WI | FairsFestivals-Eastern | 344 |
| Blue Ridge Regional Library | VA | FullCalendar-Libraries | 281 |
| Appoquinimink Public Library | DE | LibCal-DE | 100 |
| Bear Library | DE | LibCal-DE | 182 |
| Brandywine Hundred Library | DE | LibCal-DE | 33 |
| Bridgeville Public Library | DE | LibCal-DE | 68 |
| Claymont Library | DE | LibCal-DE | 33 |
| Delaware Libraries | DE | LibCal-DE | 20 |
| Boone County Public Library | KY | LibCal-KY | 0 |
| Clay County Public Library | KY | LibCal-KY | 20 |
| Kenton County Public Library | KY | LibCal-KY | 0 |
| Warren County Public Library | KY | LibCal-KY | 0 |
| Alamance County Library | NC | LibCal-NC | 48 |
| Brunswick County Public Library | NC | LibCal-NC | 10 |
| Craven-Pamlico Regional Library | NC | LibCal-NC | 0 |
| Durham County Library | NC | LibCal-NC | 20 |
| Gaston County Public Library | NC | LibCal-NC | 20 |
| Henderson County Public Library | NC | LibCal-NC | 5 |
| Iredell County Public Library | NC | LibCal-NC | 48 |
| New Hanover County Public Library | NC | LibCal-NC | 20 |
| Union County Public Library | NC | LibCal-NC | 25 |
| Concord Public Library | — | LibCal-NH | 47 |
| Hollis Social Library | — | LibCal-NH | 48 |
| Hooksett Public Library | — | LibCal-NH | 48 |
| Keene Public Library | — | LibCal-NH | 48 |
| Lebanon Public Libraries | — | LibCal-NH | 48 |
| Manchester City Library | — | LibCal-NH | 48 |
| Merrimack Public Library | — | LibCal-NH | 48 |
| Nashua Public Library | — | LibCal-NH | 48 |
| Pelham Public Library | — | LibCal-NH | 48 |
| Baldwin Public Library | NY | LibCal-NY2 | 0 |
| East Meadow Public Library | NY | LibCal-NY2 | 20 |
| Freeport Memorial Library | NY | LibCal-NY2 | 20 |
| Levittown Public Library | NY | LibCal-NY2 | 169 |
| North Bellmore Public Library | NY | LibCal-NY2 | 20 |
| North Merrick Public Library | NY | LibCal-NY2 | 20 |
| Oceanside Public Library | NY | LibCal-NY2 | 20 |
| Plainview-Old Bethpage Public Library | NY | LibCal-NY2 | 154 |
| Rockville Centre Public Library | NY | LibCal-NY2 | 20 |
| Wantagh Public Library | NY | LibCal-NY2 | 20 |
| Barrington Public Library | RI | LibCal-RI | 20 |
| Cranston Public Library | RI | LibCal-RI | 20 |
| Cumberland Public Library | RI | LibCal-RI | 25 |
| East Providence Public Library | RI | LibCal-RI | 20 |
| Newport Public Library | RI | LibCal-RI | 20 |
| North Kingstown Free Library | RI | LibCal-RI | 0 |
| Pawtucket Public Library | RI | LibCal-RI | 10 |
| Warwick Public Library | RI | LibCal-RI | 20 |
| West Warwick Public Library | RI | LibCal-RI | 20 |
| Amherst County Public Library | VA | LibraryCalendar-Libraries | 21 |
| Appomattox Regional Library | VA | LibraryCalendar-Libraries | 15 |
| Atlantic County Library System | NJ | LibraryCalendar-Libraries | 24 |
| Bedford Public Library System | VA | LibraryCalendar-Libraries | 19 |
| Bloomingdale Public Library | IL | LibraryCalendar-Libraries | 17 |
| Caroline County Public Library | MD | LibraryCalendar-Libraries | 18 |
| Cumberland County Public Library | NC | LibraryCalendar-Libraries | 20 |
| Essex Public Library | VA | LibraryCalendar-Libraries | 15 |
| Forsyth County Public Library | NC | LibraryCalendar-Libraries | 22 |
| Frederick County Public Libraries | MD | LibraryCalendar-Libraries | 18 |
| Gloucester County Library System | NJ | LibraryCalendar-Libraries | 22 |
| Howard County Library System | MD | LibraryCalendar-Libraries | 22 |
| Lynchburg Public Library | VA | LibraryCalendar-Libraries | 16 |
| Petersburg Public Library | VA | LibraryCalendar-Libraries | 8 |
| Poquoson Public Library | VA | LibraryCalendar-Libraries | 18 |
| Portsmouth Public Library | VA | LibraryCalendar-Libraries | 19 |
| Powhatan County Public Library | VA | LibraryCalendar-Libraries | 14 |
| Talbot County Free Library | MD | LibraryCalendar-Libraries | 21 |
| Waynesboro Public Library | VA | LibraryCalendar-Libraries | 16 |
| York County Library | SC | LibraryCalendar-Libraries | 23 |
| York County Public Library | VA | LibraryCalendar-Libraries | 17 |
| Fairfield Public Library | — | LibraryMarket-CT | 113 |
| Ferguson Library | — | LibraryMarket-CT | 24 |
| Meriden Public Library | — | LibraryMarket-CT | 4 |
| New Britain Public Library | — | LibraryMarket-CT | 22 |
| West Hartford Public Library | — | LibraryMarket-CT | 34 |
| Beaufort County Library | — | LibraryMarket-SC | 33 |
| Sumter County Library | — | LibraryMarket-SC | 7 |
| Spartanburg County Public Libraries | SC | Trumba-Spartanburg | 603 |
| Academy of Natural Sciences | PA | Venue-Events-ScienceArts | 10 |
| Adler Planetarium | IL | Venue-Events-ScienceArts | 8 |
| American Museum of Natural History | NY | Venue-Events-ScienceArts | 12 |
| Art Institute of Chicago | IL | Venue-Events-ScienceArts | 0 |
| Bishop Museum of Science & Nature | FL | Venue-Events-ScienceArts | 21 |
| Connecticut Science Center | CT | Venue-Events-ScienceArts | 21 |
| Conner Prairie Living History | IN | Venue-Events-ScienceArts | 7 |
| Corning Museum of Glass | NY | Venue-Events-ScienceArts | 83 |
| EcoTarium | MA | Venue-Events-ScienceArts | 90 |
| Fernbank Museum of Natural History | GA | Venue-Events-ScienceArts | 0 |
| Field Museum | IL | Venue-Events-ScienceArts | 1 |
| Franklin Institute | PA | Venue-Events-ScienceArts | 0 |
| Frost Science Museum | FL | Venue-Events-ScienceArts | 44 |
| Great Lakes Science Center | OH | Venue-Events-ScienceArts | 6 |
| Griffin Museum of Science and Industry | IL | Venue-Events-ScienceArts | 0 |
| Henry Ford Museum | MI | Venue-Events-ScienceArts | 1 |
| Imagination Station | OH | Venue-Events-ScienceArts | 0 |
| Impression 5 Science Center | MI | Venue-Events-ScienceArts | 1 |
| Indiana State Museum | IN | Venue-Events-ScienceArts | 14 |
| Intrepid Sea Air & Space Museum | NY | Venue-Events-ScienceArts | 0 |
| Kamin Science Center | PA | Venue-Events-ScienceArts | 0 |
| Kennedy Space Center Visitor Complex | FL | Venue-Events-ScienceArts | 62 |
| Maryland Science Center | MD | Venue-Events-ScienceArts | 8 |
| McAuliffe-Shepard Discovery Center | NH | Venue-Events-ScienceArts | 1 |
| Michigan Science Center | MI | Venue-Events-ScienceArts | 12 |
| Milwaukee Art Museum | WI | Venue-Events-ScienceArts | 20 |
| Museum of Science & Industry | FL | Venue-Events-ScienceArts | 1 |
| Museum of Science Boston | MA | Venue-Events-ScienceArts | 1 |
| National Building Museum | DC | Venue-Events-ScienceArts | 0 |
| NC Museum of Natural Sciences | NC | Venue-Events-ScienceArts | 20 |
| New York Hall of Science | NY | Venue-Events-ScienceArts | 1 |
| Science Museum of Virginia | VA | Venue-Events-ScienceArts | 6 |
| Smithsonian Air & Space Museum | DC | Venue-Events-ScienceArts | 10 |
| Smithsonian Natural History Museum | DC | Venue-Events-ScienceArts | 34 |
| Tellus Science Museum | GA | Venue-Events-ScienceArts | 13 |
| Tennessee State Museum | TN | Venue-Events-ScienceArts | 1 |
| Virginia Museum of Natural History | VA | Venue-Events-ScienceArts | 6 |
| Yale Peabody Museum | CT | Venue-Events-ScienceArts | 1 |
| ABBE Regional Library System | SC | WordPress-Abbe-Regional | 20 |
| Abbeville Memorial Library | — | WordPress-AL | 7 |
| Akron Public Library | — | WordPress-AL | 0 |
| Andalusia Public Library | — | WordPress-AL | 0 |
| Athens-Limestone Public Library | — | WordPress-AL | 0 |
| Auburn Public Library | — | WordPress-AL | 1 |
| Birmingham Public Library | — | WordPress-AL | 1 |
| Blanche R. Solomon Memorial Library | — | WordPress-AL | 0 |
| Bridgeport - Lena Cagle Public Library | — | WordPress-AL | 3 |
| Burchell Campbell Memorial Library | — | WordPress-AL | 0 |
| Butler County Public Library | — | WordPress-AL | 12 |
| Chelsea Public Library | — | WordPress-AL | 0 |
| Choctaw County Public Library | — | WordPress-AL | 0 |
| City Of Bayou La Batre Public Library | — | WordPress-AL | 0 |
| Clay Public Library | — | WordPress-AL | 0 |
| Collinsville Public Library | — | WordPress-AL | 0 |
| Daleville Public Library | — | WordPress-AL | 1 |
| Daphne Public Library | — | WordPress-AL | 0 |
| Decatur Public Library | — | WordPress-AL | 35 |
| Doris Stanley Memorial Library | — | WordPress-AL | 1 |
| Dothan Houston County Library System | — | WordPress-AL | 76 |
| Evergreen Public Library | — | WordPress-AL | 0 |
| Fairhope Public Library | — | WordPress-AL | 150 |
| Florence-Lauderdale Public Library | — | WordPress-AL | 0 |
| Foley Public Library | — | WordPress-AL | 0 |
| Gardendale Public Library | — | WordPress-AL | 1 |
| Grant Public Library | — | WordPress-AL | 0 |
| Guntersville Public Library | — | WordPress-AL | 0 |
| H. Grady Bradshaw - Chambers County Library | — | WordPress-AL | 1 |
| Hale County Library | — | WordPress-AL | 0 |
| Hartford - Mcgregor-Mckinney Public Library | — | WordPress-AL | 0 |
| Homewood Public Library | — | WordPress-AL | 0 |
| Hoover Public Library | — | WordPress-AL | 4 |
| Houston-Love Memorial Library - Columbia | — | WordPress-AL | 0 |
| Hueytown Public Library | — | WordPress-AL | 0 |
| Huntsville-Madison County Public Library | — | WordPress-AL | 13 |
| Irondale Public Library | — | WordPress-AL | 0 |
| Jane B. Holmes Public Library | — | WordPress-AL | 0 |
| Jane Culbreth Library | — | WordPress-AL | 1 |
| Jefferson County Library Cooperative | — | WordPress-AL | 0 |
| Kennedy Public Library | — | WordPress-AL | 0 |
| Lafayette Pilot Public Library | — | WordPress-AL | 0 |
| Leighton Public Library | — | WordPress-AL | 21 |
| Madison Public Library | AL | WordPress-AL | 0 |
| Marion-Perry County Library | — | WordPress-AL | 3 |
| Millbrook Public Library | — | WordPress-AL | 0 |
| Mobile Public Library | — | WordPress-AL | 31 |
| Montgomery City-County Public Library | — | WordPress-AL | 18 |
| Newton Public Library | — | WordPress-AL | 0 |
| Northwest Regional Library | — | WordPress-AL | 0 |
| Opp Public Library | — | WordPress-AL | 0 |
| Orange Beach Public Library | — | WordPress-AL | 0 |
| Piedmont Public Library | — | WordPress-AL | 0 |
| Ruby Pickens Tartt Public Library | — | WordPress-AL | 1 |
| Satsuma Public Library | — | WordPress-AL | 0 |
| Scottsboro Public Library | — | WordPress-AL | 0 |
| Selma-Dallas County Public Library | — | WordPress-AL | 1 |
| Sheffield Public Library | — | WordPress-AL | 0 |
| Stevenson Public Library | — | WordPress-AL | 0 |
| Trussville Public Library | — | WordPress-AL | 4 |
| Tuscaloosa Public Library | — | WordPress-AL | 150 |
| Vernon - Mary Wallace Cobb Memorial Library | — | WordPress-AL | 0 |
| Vestavia Hills Library | — | WordPress-AL | 150 |
| Walter J. Hanna Memorial Library | — | WordPress-AL | 0 |
| Warrior Public Library | — | WordPress-AL | 0 |
| Wilcox County Library | — | WordPress-AL | 1 |
| Wilsonville - Vernice Stoudenmire Library | — | WordPress-AL | 87 |
| Andover Public Library | CT | WordPress-CT | 0 |
| Ansonia Public Library | CT | WordPress-CT | 0 |
| Beacon Falls Public Library | CT | WordPress-CT | 0 |
| Beardsley Memorial Library | CT | WordPress-CT | 1 |
| Bethel Public Library | CT | WordPress-CT | 0 |
| Bethlehem Public Library | CT | WordPress-CT | 0 |
| Bill Library | CT | WordPress-CT | 1 |
| Bridgeport Public Library | CT | WordPress-CT | 16 |
| Bristol Public Library | CT | WordPress-CT | 212 |
| Brookfield Library | CT | WordPress-CT | 93 |
| Canterbury Public Library | CT | WordPress-CT | 0 |
| Cheshire Public Library | CT | WordPress-CT | 2 |
| Chester Public Library | CT | WordPress-CT | 0 |
| Clark Memorial Library | CT | WordPress-CT | 10 |
| Community Branch Library | CT | WordPress-CT | 1 |
| Cornwall Library Association | CT | WordPress-CT | 18 |
| Cyrenius H. Booth Library | CT | WordPress-CT | 0 |
| Danbury Public Library | CT | WordPress-CT | 0 |
| Darien Library | CT | WordPress-CT | 19 |
| Douglas Library Of Hebron | CT | WordPress-CT | 0 |
| Durham Public Library | CT | WordPress-CT | 45 |
| E.C. Scranton Memorial Library | CT | WordPress-CT | 0 |
| East Hampton Public Library | CT | WordPress-CT | 0 |
| East Hartford Public Library | CT | WordPress-CT | 0 |
| Easton Public Library | CT | WordPress-CT | 0 |
| Edith Wheeler Memorial Library | CT | WordPress-CT | 0 |
| Enfield Public Library | CT | WordPress-CT | 6 |
| Essex Library Association | CT | WordPress-CT | 0 |
| Fairfield Public Library | CT | WordPress-CT | 82 |
| Farmington Library | CT | WordPress-CT | 9 |
| Frederick H. Cossitt Library | CT | WordPress-CT | 1 |
| Goshen Public Library | CT | WordPress-CT | 0 |
| Greenwich Library | CT | WordPress-CT | 0 |
| Hartford Public Library | CT | WordPress-CT | 0 |
| Hartland Public Library | CT | WordPress-CT | 0 |
| Harwinton Public Library | CT | WordPress-CT | 107 |
| Henry Carter Hull Library | CT | WordPress-CT | 0 |
| Ivoryton Library Association | CT | WordPress-CT | 0 |
| Janet Carlson Calvert Library | CT | WordPress-CT | 3 |
| Jonathan Trumbull Library | CT | WordPress-CT | 0 |
| Kent Library Association | CT | WordPress-CT | 65 |
| Kent Memorial Library | CT | WordPress-CT | 0 |
| Killingworth Library | CT | WordPress-CT | 0 |
| Louis Piantino Branch Library | CT | WordPress-CT | 0 |
| Manchester Public Library | CT | WordPress-CT | 9 |
| Middlebury Public Library | CT | WordPress-CT | 24 |
| Middletown Public Library | CT | WordPress-CT | 1 |
| Milford Public Library | CT | WordPress-CT | 0 |
| Minor Memorial Library | CT | WordPress-CT | 58 |
| Mystic Noank Library | CT | WordPress-CT | 0 |
| New Britain Public Library | CT | WordPress-CT | 58 |
| New Canaan Library | CT | WordPress-CT | 79 |
| New Fairfield Free Public Library | CT | WordPress-CT | 6 |
| New Haven Free Public Library | CT | WordPress-CT | 1 |
| New Milford Public Library | CT | WordPress-CT | 1 |
| Norfolk Library | CT | WordPress-CT | 12 |
| North Haven Memorial Library | CT | WordPress-CT | 0 |
| Norwalk Public Library | CT | WordPress-CT | 0 |
| Oakville Branch Library | CT | WordPress-CT | 0 |
| Old Lyme - Phoebe Griffin Noyes Library | CT | WordPress-CT | 0 |
| Otis Library | CT | WordPress-CT | 38 |
| Pequot Library Association | CT | WordPress-CT | 0 |
| Plainville Public Library | CT | WordPress-CT | 0 |
| Pomfret Public Library | CT | WordPress-CT | 0 |
| Preston Public Library | CT | WordPress-CT | 1 |
| Public Library Of New London | CT | WordPress-CT | 0 |
| Ridgefield Library | CT | WordPress-CT | 10 |
| Salem Free Public Library | CT | WordPress-CT | 0 |
| Saxton B. Little Free Library | CT | WordPress-CT | 1 |
| Scoville Memorial Library | CT | WordPress-CT | 0 |
| Shelton Public Library | CT | WordPress-CT | 36 |
| Sherman Library Assn. | CT | WordPress-CT | 1 |
| South Windsor Public Library | CT | WordPress-CT | 68 |
| Southbury Public Library | CT | WordPress-CT | 62 |
| Southington Public Library | CT | WordPress-CT | 0 |
| Stafford Library Association | CT | WordPress-CT | 1 |
| Stonington Free Library | CT | WordPress-CT | 0 |
| Stratford Library | CT | WordPress-CT | 1 |
| Thomaston Public Library | CT | WordPress-CT | 0 |
| Torrington Library | CT | WordPress-CT | 0 |
| Trumbull Library | CT | WordPress-CT | 0 |
| Union Free Public Library | CT | WordPress-CT | 0 |
| Vernon Public Library | CT | WordPress-CT | 0 |
| Wallingford Public Library | CT | WordPress-CT | 28 |
| Warren Public Library | CT | WordPress-CT | 1 |
| Waterbury Public Library | CT | WordPress-CT | 0 |
| Waterford Public Library | CT | WordPress-CT | 0 |
| West Hartford Public Library | CT | WordPress-CT | 75 |
| Westbrook Public Library | CT | WordPress-CT | 117 |
| Westport Library | CT | WordPress-CT | 15 |
| Wethersfield Public Library | CT | WordPress-CT | 0 |
| Willimantic Public Library | CT | WordPress-CT | 0 |
| Wilson Branch Library | CT | WordPress-CT | 0 |
| Wilton Library Association | CT | WordPress-CT | 1 |
| Windham Free Library | CT | WordPress-CT | 11 |
| Windsor Locks Public Library | CT | WordPress-CT | 0 |
| Wolcott Public Library | CT | WordPress-CT | 1 |
| Woodbury Public Library | CT | WordPress-CT | 0 |
| Alma-Bacon County Public Library | GA | WordPress-GA | 4 |
| Appleby Branch | GA | WordPress-GA | 1 |
| Athens Regional Library System | GA | WordPress-GA | 33 |
| Baker County | GA | WordPress-GA | 0 |
| Boston Carnegie Library | GA | WordPress-GA | 20 |
| Bowman Branch | GA | WordPress-GA | 29 |
| Brooks County Public Library System | GA | WordPress-GA | 0 |
| Brunswick Glynn County Regional Library | GA | WordPress-GA | 1 |
| Butler Public Library | GA | WordPress-GA | 0 |
| Byron Public Library | GA | WordPress-GA | 75 |
| Cedartown Library | GA | WordPress-GA | 10 |
| Centerville Branch Library | GA | WordPress-GA | 0 |
| Chattahoochee Valley Regional Library System | GA | WordPress-GA | 14 |
| Chattooga County Library System | GA | WordPress-GA | 0 |
| Cherokee Regional Library System | GA | WordPress-GA | 1 |
| Clarkesville-Habersham Co. Lib. | GA | WordPress-GA | 0 |
| Clarkston Branch | GA | WordPress-GA | 1 |
| Clermont Library | GA | WordPress-GA | 0 |
| Commerce Public Library | GA | WordPress-GA | 0 |
| Coolidge Public Library | GA | WordPress-GA | 0 |
| Cornelia-Habersham Co. Lib. | GA | WordPress-GA | 1 |
| Covington Branch | GA | WordPress-GA | 19 |
| Dalton-Whitfield County Public Library | GA | WordPress-GA | 0 |
| Douglas-Coffee County Public Library | GA | WordPress-GA | 0 |
| Duluth | GA | WordPress-GA | 0 |
| Effingham | GA | WordPress-GA | 0 |
| Elizabeth Harris Library | GA | WordPress-GA | 1 |
| Gibbs Memorial Library | GA | WordPress-GA | 0 |
| Gordon Public Library | GA | WordPress-GA | 0 |
| Grantville Public Library | GA | WordPress-GA | 4 |
| Greene County Library | GA | WordPress-GA | 0 |
| Greenville Area Public Library | GA | WordPress-GA | 12 |
| Hancock County Library | GA | WordPress-GA | 0 |
| Harlie Fulford Memorial Library | GA | WordPress-GA | 1 |
| Heard County Public Library | GA | WordPress-GA | 0 |
| Hickory Flat Public Library | GA | WordPress-GA | 0 |
| Hightower Memorial Library | GA | WordPress-GA | 0 |
| Houston County Public Libraries System | GA | WordPress-GA | 0 |
| Ida Hilton Public Library | GA | WordPress-GA | 0 |
| Jefferson County Library System | GA | WordPress-GA | 1 |
| Lagrange Memorial Library | GA | WordPress-GA | 5 |
| Lake Sinclair Library | GA | WordPress-GA | 0 |
| Laurens County Library | GA | WordPress-GA | 0 |
| Lewis A. Ray Library | GA | WordPress-GA | 0 |
| Marion County Library | GA | WordPress-GA | 49 |
| Meigs Public Library | GA | WordPress-GA | 4 |
| Middle Georgia Regional Library System | GA | WordPress-GA | 0 |
| Miller Lakeland Library | GA | WordPress-GA | 1 |
| Monroe County Library | GA | WordPress-GA | 0 |
| Monroe-Walton County Library | GA | WordPress-GA | 0 |
| Morgan County Library | GA | WordPress-GA | 0 |
| Nelle Brown Memorial Public Library | GA | WordPress-GA | 0 |
| New Georgia Public Library | GA | WordPress-GA | 10 |
| Oglethorpe County Library | GA | WordPress-GA | 0 |
| Parks Memorial Library | GA | WordPress-GA | 13 |
| Riverdale Branch Library | GA | WordPress-GA | 1 |
| Rockmart Library | GA | WordPress-GA | 0 |
| Rossville Public Library | GA | WordPress-GA | 0 |
| Scottdale-Tobie Grant Branch | GA | WordPress-GA | 0 |
| Senoia Area Public Library | GA | WordPress-GA | 4 |
| Thomson-Mcduffie County Library | GA | WordPress-GA | 0 |
| Warren P. Sewell Memorial Library-Bremen | GA | WordPress-GA | 14 |
| Wayne County Library | GA | WordPress-GA | 1 |
| Wheeler County Library | GA | WordPress-GA | 2 |
| White County Public Library-Cleveland Branch | GA | WordPress-GA | 1 |
| Wilcox County Public Library | GA | WordPress-GA | 25 |
| Alleghany County Public Library | NC | WordPress-NC | 0 |
| Bath Community Library | NC | WordPress-NC | 0 |
| Beatties Ford Road Branch Library | NC | WordPress-NC | 1 |
| Belmont Branch Library | NC | WordPress-NC | 16 |
| Black Creek Branch Library | NC | WordPress-NC | 50 |
| Blanche Benjamin Branch Library | NC | WordPress-NC | 0 |
| Boonville Community Public Library | NC | WordPress-NC | 0 |
| Brunswick County Library | NC | WordPress-NC | 0 |
| Bunn Branch Library | NC | WordPress-NC | 0 |
| Carver Branch Library | NC | WordPress-NC | 0 |
| Cary Branch Library | NC | WordPress-NC | 4 |
| Catawba County Library | NC | WordPress-NC | 0 |
| Claremont Branch Library | NC | WordPress-NC | 0 |
| Cleveland County Memorial Library | NC | WordPress-NC | 0 |
| Craven-Pamlico-Carteret Regional Library | NC | WordPress-NC | 4 |
| Dallas Branch Library | NC | WordPress-NC | 16 |
| Danbury Public Library | NC | WordPress-NC | 0 |
| Davidson County Public Library System | NC | WordPress-NC | 0 |
| Dobson Community Library | NC | WordPress-NC | 0 |
| East Branch Library | NC | WordPress-NC | 50 |
| Farmville Public Library | NC | WordPress-NC | 0 |
| Florence S. Shanklin Branch Library | NC | WordPress-NC | 34 |
| Franklin County Library | NC | WordPress-NC | 4 |
| Graham Public Library | NC | WordPress-NC | 0 |
| Harmony Branch Library | NC | WordPress-NC | 1 |
| Havelock-Craven County Public | NC | WordPress-NC | 0 |
| Hazel W. Guilford Memorial Library | NC | WordPress-NC | 0 |
| Hickory Public Library | NC | WordPress-NC | 0 |
| Hudson Branch Library | NC | WordPress-NC | 1 |
| J.C. Holliday Library | NC | WordPress-NC | 0 |
| John W. Clark Public Library | NC | WordPress-NC | 0 |
| King Public Library | NC | WordPress-NC | 1 |
| La Grange Branch Library | NC | WordPress-NC | 5 |
| Lawrence Memorial Library | NC | WordPress-NC | 0 |
| Leland Branch Library | NC | WordPress-NC | 0 |
| Littleton Public Library (Wc Jones Memorial) | NC | WordPress-NC | 0 |
| Lowell Branch Library | NC | WordPress-NC | 16 |
| Macon County Public Library | NC | WordPress-NC | 0 |
| Madison Branch Library | NC | WordPress-NC | 0 |
| Madison County Public Library | NC | WordPress-NC | 0 |
| Margaret Little Blount Library | NC | WordPress-NC | 0 |
| Mary Duncan Public Library | NC | WordPress-NC | 0 |
| Matthews Branch Library | NC | WordPress-NC | 1 |
| Mcdowell County Law Library | NC | WordPress-NC | 3 |
| Mooresville Public Library | NC | WordPress-NC | 1 |
| Myrtle Grove Branch | NC | WordPress-NC | 10 |
| Norwood Branch Library | NC | WordPress-NC | 1 |
| Pettigrew Regional Library | NC | WordPress-NC | 0 |
| Polk County Public Library | NC | WordPress-NC | 14 |
| Princeton Public Library | NC | WordPress-NC | 0 |
| Public Library Of Johnston County Smithfield | NC | WordPress-NC | 0 |
| Roanoke Rapids Public Library | NC | WordPress-NC | 4 |
| Rowan Public Library | NC | WordPress-NC | 0 |
| Selma Public Library | NC | WordPress-NC | 0 |
| Spring Lake Branch | NC | WordPress-NC | 5 |
| Stanley Branch Library | NC | WordPress-NC | 16 |
| Star Branch | NC | WordPress-NC | 0 |
| Tyrrell County Library | NC | WordPress-NC | 0 |
| Union County Public Library | NC | WordPress-NC | 0 |
| Union West Branch Library | NC | WordPress-NC | 0 |
| Warsaw-Kornegay Public Library | NC | WordPress-NC | 0 |
| Watauga County Public Library | NC | WordPress-NC | 0 |
| Wayne County Public Library, Fremont | NC | WordPress-NC | 5 |
| Adams Memorial Library | — | WordPress-TN | 1 |
| Alexandria Branch Library | — | WordPress-TN | 0 |
| Athens Public Library | — | WordPress-TN | 1 |
| Auburntown Public Library | — | WordPress-TN | 1 |
| Audrey Pack Memorial Library | — | WordPress-TN | 0 |
| Bartlett Library | — | WordPress-TN | 0 |
| Baxter Branch Library | TN | WordPress-TN | 0 |
| Benton County Library | — | WordPress-TN | 1 |
| Blount County Public Library | — | WordPress-TN | 0 |
| Carroll County Library | — | WordPress-TN | 0 |
| Chattanooga Public Library | — | WordPress-TN | 150 |
| Clarksville-Montgomery County Public Library | — | WordPress-TN | 0 |
| Cleveland-Bradley County Public Library | — | WordPress-TN | 1 |
| Clinton Public Library | — | WordPress-TN | 0 |
| Collierville Burch Library | — | WordPress-TN | 0 |
| Crockett County Library | — | WordPress-TN | 1 |
| Crossville-Cumberland County Public Library | — | WordPress-TN | 0 |
| Franklin County Public Library | — | WordPress-TN | 0 |
| Franklin Public Library | — | WordPress-TN | 0 |
| Germantown Community Library | TN | WordPress-TN | 0 |
| Gleason Memorial Library | — | WordPress-TN | 0 |
| Hamilton Parks Public Library | — | WordPress-TN | 1 |
| Harriman Public Library | — | WordPress-TN | 0 |
| Hendersonville Public Library | — | WordPress-TN | 0 |
| Hickman County Public Library | — | WordPress-TN | 0 |
| Humphreys County Public Library | — | WordPress-TN | 0 |
| Johnson City Public Library | — | WordPress-TN | 21 |
| Kingsport Public Library | — | WordPress-TN | 0 |
| Kingston Public Library | — | WordPress-TN | 10 |
| Knox County Public Library | — | WordPress-TN | 27 |
| Lauderdale County Library | — | WordPress-TN | 54 |
| Madisonville Public Library | — | WordPress-TN | 0 |
| Mary E. Tippitt Memorial Library | — | WordPress-TN | 0 |
| Meigs-Decatur Public Library | — | WordPress-TN | 1 |
| Memphis Public Libraries | — | WordPress-TN | 32 |
| Middleton Community Library | — | WordPress-TN | 0 |
| Mildred G. Fields Memorial Library | — | WordPress-TN | 1 |
| Millard Oakley Public Library | — | WordPress-TN | 0 |
| Monterey Branch Library | — | WordPress-TN | 0 |
| Morristown-Hamblen Library | — | WordPress-TN | 0 |
| Mt. Juliet-Harvey Freeman Public Library | — | WordPress-TN | 0 |
| Nashville Public Library | — | WordPress-TN | 1 |
| Nashville Talking Library | TN | WordPress-TN | 0 |
| Newbern City Library | — | WordPress-TN | 0 |
| Parsons Public Library | — | WordPress-TN | 0 |
| Rogersville Public Library | — | WordPress-TN | 0 |
| Rutherford County Library System | — | WordPress-TN | 0 |
| Sam T. Wilson Public Library | — | WordPress-TN | 0 |
| Savannah-Hardin County Library | — | WordPress-TN | 1 |
| Sequatchie County Public Library | — | WordPress-TN | 0 |
| Sevier County Public Library System | — | WordPress-TN | 0 |
| Smyrna Public Library | — | WordPress-TN | 0 |
| Southeast Branch Library | — | WordPress-TN | 0 |
| Spring Hill Public Library | — | WordPress-TN | 0 |
| Sweetwater Public Library | — | WordPress-TN | 1 |
| The Brentwood Library | — | WordPress-TN | 0 |
| Tipton County Public Library | — | WordPress-TN | 0 |
| Tullahoma Public Library | — | WordPress-TN | 0 |
| Washburn Public Library | — | WordPress-TN | 1 |
| Westmoreland Public Library | — | WordPress-TN | 0 |
| White County Public Library | TN | WordPress-TN | 0 |
| White Pine Public Library | — | WordPress-TN | 1 |
| Winfield Public Library | — | WordPress-TN | 0 |
| Alexandria Library | — | WordPress-VA | 0 |
| Chesapeake Public Library | — | WordPress-VA | 0 |
| Culpeper County Library | — | WordPress-VA | 24 |
| Henrico County Public Library | — | WordPress-VA | 0 |
| Jefferson-Madison Regional Library | — | WordPress-VA | 0 |
| Manassas Park City Library | — | WordPress-VA | 10 |
| Ainsworth Public | VT | WordPress-VT | 150 |
| Aldrich Public Library | VT | WordPress-VT | 0 |
| Barton Public | VT | WordPress-VT | 0 |
| Bennington Free | VT | WordPress-VT | 1 |
| Benson Public | VT | WordPress-VT | 0 |
| Bent Northrup Memorial | VT | WordPress-VT | 1 |
| Bethel Public | VT | WordPress-VT | 0 |
| Bradford Public | VT | WordPress-VT | 0 |
| Brandon Free Public | VT | WordPress-VT | 63 |
| Brooks Memorial Library | VT | WordPress-VT | 150 |
| Brownell Library | VT | WordPress-VT | 150 |
| Butterfield | VT | WordPress-VT | 0 |
| Cabot Public | VT | WordPress-VT | 0 |
| Charlotte | VT | WordPress-VT | 70 |
| Chelsea Public | VT | WordPress-VT | 0 |
| Cobleigh Public Library | VT | WordPress-VT | 0 |
| Cornwall Free Public | VT | WordPress-VT | 18 |
| Cutler Memorial | VT | WordPress-VT | 0 |
| Deborah Rawson Memorial Library | VT | WordPress-VT | 7 |
| Essex Free | VT | WordPress-VT | 0 |
| Fair Haven Free | VT | WordPress-VT | 0 |
| Fairfax Community | VT | WordPress-VT | 0 |
| Fletcher Free Library | VT | WordPress-VT | 4 |
| Franklin-Grand Isle Bookmobile | VT | WordPress-VT | 13 |
| G. M. Kelley Community | VT | WordPress-VT | 0 |
| Gilman Public Library | VT | WordPress-VT | 0 |
| Glover Public | VT | WordPress-VT | 0 |
| Greensboro Free | VT | WordPress-VT | 0 |
| Hancock Free Public | VT | WordPress-VT | 1 |
| Hartford | VT | WordPress-VT | 0 |
| Hartland Public Library | VT | WordPress-VT | 0 |
| Haskell Free Library | VT | WordPress-VT | 0 |
| Haston | VT | WordPress-VT | 3 |
| Hitchcock Museum | VT | WordPress-VT | 1 |
| Huntington Public | VT | WordPress-VT | 0 |
| Ilsley Public Library | VT | WordPress-VT | 17 |
| Jaquith Public | VT | WordPress-VT | 0 |
| Kellogg-Hubbard Library | VT | WordPress-VT | 150 |
| Lanpher Memorial | VT | WordPress-VT | 1 |
| Latham Memorial | VT | WordPress-VT | 1 |
| Martha Canfield Memorial | VT | WordPress-VT | 0 |
| Moore Free | VT | WordPress-VT | 0 |
| Morrill Mem. Harris | VT | WordPress-VT | 0 |
| Morristown Centennial Library | VT | WordPress-VT | 0 |
| Mount Holly | VT | WordPress-VT | 10 |
| Norman Williams Public Library | VT | WordPress-VT | 150 |
| North Hero Public | VT | WordPress-VT | 1 |
| Norwich Public | VT | WordPress-VT | 1 |
| Peacham | VT | WordPress-VT | 1 |
| Pettee Memorial | VT | WordPress-VT | 1 |
| Pierson Library | VT | WordPress-VT | 13 |
| Pope Memorial | VT | WordPress-VT | 0 |
| Proctor Free | VT | WordPress-VT | 0 |
| Putney Public | VT | WordPress-VT | 37 |
| Quechee | VT | WordPress-VT | 6 |
| Reading Public | VT | WordPress-VT | 1 |
| Readsboro Community | VT | WordPress-VT | 0 |
| Rochester Public | VT | WordPress-VT | 0 |
| Rockingham Free Public Library | VT | WordPress-VT | 12 |
| Roger Clark Memorial | VT | WordPress-VT | 0 |
| Roxbury Free | VT | WordPress-VT | 0 |
| Russell Memorial | VT | WordPress-VT | 1 |
| Salisbury Free Public | VT | WordPress-VT | 0 |
| Sheldon Public | VT | WordPress-VT | 0 |
| Shrewsbury | VT | WordPress-VT | 0 |
| Springfield Town Library | VT | WordPress-VT | 2 |
| St. Johnsbury Athenaeum | VT | WordPress-VT | 3 |
| Stamford Community | VT | WordPress-VT | 0 |
| Stowe Free | VT | WordPress-VT | 0 |
| Tenney Memorial | VT | WordPress-VT | 1 |
| Tunbridge Public | VT | WordPress-VT | 34 |
| Vernon Free | VT | WordPress-VT | 7 |
| Warren Public | VT | WordPress-VT | 1 |
| West Hartford | VT | WordPress-VT | 75 |
| Westminster West Public | VT | WordPress-VT | 0 |
| Whiting | VT | WordPress-VT | 0 |
| Windham Town | VT | WordPress-VT | 2 |
| Windsor Public | VT | WordPress-VT | 0 |
| Woodbury Community | VT | WordPress-VT | 1 |
**Cycle-completion check: not complete.** Across the current cycle (`## 2026-08-16`, `## 2026-08-18`, `## 2026-08-19`, `## 2026-08-20`, `## 2026-08-21`, plus today) **96 of 100** active library-family scrapers have at least one row. The four without one — `GoogleCalendar-MA`, `GoogleCalendar-SC`, `SandhillRegional-NC`, `WordPressTec-Parks` — are **all Group 3**, which has not run in this cycle. This is a rotation gap, not a bug. No `Cycle complete` marker is added.

**Cycle status — 2026-08-23 (no dated section: no library scraper ran).**

**No new library-site rows.** The only scraper activity in this window (2026-08-22T18:00:57Z → 2026-08-23T11:17Z) was the MacaroniKid Group 1 tail, which contains no library-family scrapers. `build-library-site-audit.js` over that window returned 0 per-site rows, 0 scrapers with per-site output — a genuine absence of library scraping, not a parse failure.

**The 2026-08-23 rotation did not run.** Day 23 maps to Group 2, but the 2026-08-22 run was still executing at 03:00 (it took 28.3 hours end to end, finishing 11:17Z), so the scheduler slot was already occupied. **Group 2 therefore has no data in the current cycle**, and this cycle cannot complete until a Group 2 run happens. The newest dated section remains `## 2026-08-22`; no rows were added or changed today.

## 2026-08-24

Group 3 rotation, run start 2026-08-24T07:00:01Z. 743 per-site rows from 33 scrapers with per-site log output; 450 sites returned 0 events.

| Library Website | State | Scraper | Events Found |
|---|---|---|---|
| Boston Public Library | MA | BiblioCommons-MA | 495 |
| Lawrence Public Library | MA | BiblioCommons-MA | 500 |
| Alachua County Library District | FL | Communico-FL | 12 |
| Broward County Library | FL | Communico-FL | 51 |
| Hernando County Public Library | FL | Communico-FL | 104 |
| Hillsborough County Public Library Cooperative | FL | Communico-FL | 37 |
| Jacksonville Public Library | FL | Communico-FL | 23 |
| Largo Public Library | FL | Communico-FL | 5 |
| Martin County Library System | FL | Communico-FL | 7 |
| Miami-Dade Public Library | FL | Communico-FL | 95 |
| Pasco County Libraries | FL | Communico-FL | 6 |
| Anne Arundel County Public Library | MD | Communico-MD | 24 |
| Baltimore County Public Library | MD | Communico-MD | 18 |
| Calvert Library | MD | Communico-MD | 3 |
| Charles County Public Library | MD | Communico-MD | 7 |
| Harford County Public Library | MD | Communico-MD | 14 |
| Montgomery County Public Library | MD | Communico-MD | 27 |
| Prince George's County Memorial Library System | MD | Communico-MD | 24 |
| St. Mary's County Library | MD | Communico-MD | 4 |
| Peterborough Town Library | NH | Communico-NH | 4 |
| Huntington Public Library | NY | Communico-NY | 10 |
| Massapequa Public Library | NY | Communico-NY | 193 |
| Patchogue-Medford Library | NY | Communico-NY | 4 |
| Poughkeepsie Public Library District | NY | Communico-NY | 24 |
| Reading Public Library | PA | Communico-PA | 2 |
| Collierville Burch Library | TN | Communico-TN | 7 |
| Bridgeport Public Library | WV | Communico-WV | 5 |
| Huntington Public Library | WV | Communico-WV | 10 |
| Handley Regional Library | VA | Drupal-Virginia | 24 |
| Ashby Free Public Library | — | GoogleCalendar-MA | 45 |
| Somerset County Library | — | GoogleCalendar-MD | 173 |
| Berkeley County Library - Sangaree Library | — | GoogleCalendar-SC | 0 |
| Roger Clark Memorial Library | — | GoogleCalendar-VT | 45 |
| Camden County Library System | NJ | Intercept-Camden | 10 |
| Lakeland Public Library | FL | LibCal-FL | 20 |
| Marion County Public Library System | FL | LibCal-FL | 10 |
| Palm Beach County Library System | FL | LibCal-FL | 1 |
| Bangor Public Library | ME | LibCal-ME | 12 |
| BCCLS - Bergen County Cooperative Library System | NJ | LibCal-NJ | 3005 |
| Hunterdon County Library | NJ | LibCal-NJ | 48 |
| Jersey City Free Public Library | NJ | LibCal-NJ | 20 |
| Mercer County Library System | NJ | LibCal-NJ | 20 |
| Monmouth County Library System | NJ | LibCal-NJ | 20 |
| Montclair Public Library | NJ | LibCal-NJ | 20 |
| Newark Public Library | NJ | LibCal-NJ | 20 |
| Sussex County Library | NJ | LibCal-NJ | 10 |
| Union County Libraries | NJ | LibCal-NJ | 20 |
| Berkeley County Library System | SC | LibCal-SC | 20 |
| Charleston County Public Library | SC | LibCal-SC | 20 |
| Dorchester County Library | SC | LibCal-SC | 10 |
| Lexington County Public Library | SC | LibCal-SC | 10 |
| South Carolina State Library | SC | LibCal-SC | 20 |
| Arlington County Public Library | VA | LibCal-VA | 20 |
| Fairfax County Public Library | VA | LibCal-VA | 20 |
| Massanutten Regional Library | VA | LibCal-VA | 20 |
| Arlington Public Library | — | LibCal-VA2 | 12 |
| Fairfax County Public Library | — | LibCal-VA2 | 10 |
| Library of Virginia | — | LibCal-VA2 | 20 |
| Norfolk Public Library | — | LibCal-VA2 | 45 |
| Prince William Public Library System | — | LibCal-VA2 | 0 |
| Richmond Public Library | — | LibCal-VA2 | 20 |
| Roanoke Public Libraries | — | LibCal-VA2 | 48 |
| Suffolk Public Library | — | LibCal-VA2 | 20 |
| Williamsburg Regional Library | — | LibCal-VA2 | 5 |
| Buncombe County Libraries | — | LibraryMarket-NC | 5 |
| Hickory Public Library | — | LibraryMarket-NC | 3 |
| Bethlehem Area Public Library | — | LibraryMarket-PA | 24 |
| Lancaster Public Library | — | LibraryMarket-PA | 18 |
| York County Libraries | — | LibraryMarket-PA | 24 |
| Queen Anne's County Library | MD | Squarespace-Libraries | 74 |
| Hampton Public Library | VA | WithApps-Libraries | 45 |
| Dover Public Library | DE | WordPress-DE | 0 |
| Elsmere Library | DE | WordPress-DE | 0 |
| Frankford Public Library | DE | WordPress-DE | 0 |
| Garfield Park Library | DE | WordPress-DE | 0 |
| Georgetown Public Library | DE | WordPress-DE | 0 |
| Hockessin Library | DE | WordPress-DE | 0 |
| Kent County Library | DE | WordPress-DE | 0 |
| Kirkwood Library | DE | WordPress-DE | 0 |
| Laurel Public Library | DE | WordPress-DE | 0 |
| Lewes Public Library | DE | WordPress-DE | 0 |
| Newark Free Library | DE | WordPress-DE | 0 |
| Rehoboth Beach Public Library | DE | WordPress-DE | 95 |
| Wilmington Public Library | DE | WordPress-DE | 0 |
| Woodlawn Library | DE | WordPress-DE | 0 |
| Alleghany Highlands Regional Library | VA | WordPress-Events-Calendar | 7 |
| Blackwater Regional Library | VA | WordPress-Events-Calendar | 50 |
| Bristol Public Library | VA | WordPress-Events-Calendar | 0 |
| Carnegie Library of Pittsburgh | PA | WordPress-Events-Calendar | 11 |
| Charlotte County Library | VA | WordPress-Events-Calendar | 50 |
| Galax-Carroll Regional Library | VA | WordPress-Events-Calendar | 50 |
| Halifax County-South Boston Library | VA | WordPress-Events-Calendar | 3 |
| Heritage Public Library | VA | WordPress-Events-Calendar | 0 |
| Osterhout Free Library | PA | WordPress-Events-Calendar | 18 |
| Pittsylvania County Public Library | VA | WordPress-Events-Calendar | 50 |
| Rappahannock County Library | VA | WordPress-Events-Calendar | 50 |
| Washington County Public Library | VA | WordPress-Events-Calendar | 12 |
| Wythe-Grayson Regional Library | VA | WordPress-Events-Calendar | 50 |
| Adair County Public Library | KY | WordPress-KY | 0 |
| Allen County Public Library | — | WordPress-KY | 1 |
| Auburn Branch | — | WordPress-KY | 0 |
| Boone County Public Library | — | WordPress-KY | 7 |
| Bullitt County Public Library | — | WordPress-KY | 0 |
| Calloway County Public Library | — | WordPress-KY | 0 |
| Campbell County Public Library | — | WordPress-KY | 8 |
| Casey County Public Library | — | WordPress-KY | 11 |
| Christian County Public Library | — | WordPress-KY | 1 |
| Clark County Public Library | — | WordPress-KY | 0 |
| Crittenden County Public Library | KY | WordPress-KY | 0 |
| Cynthiana-Harrison County Public Library | — | WordPress-KY | 0 |
| Daviess County Public Library | — | WordPress-KY | 12 |
| Estill County Public Library | — | WordPress-KY | 0 |
| Florence Branch | KY | WordPress-KY | 0 |
| Floyd County Public Library | — | WordPress-KY | 1 |
| Fulton Public Library | — | WordPress-KY | 0 |
| Gallatin County Public Library | KY | WordPress-KY | 0 |
| Goodnight Memorial Library | KY | WordPress-KY | 0 |
| Grant County Public Library | — | WordPress-KY | 0 |
| Graves County Public Library | — | WordPress-KY | 0 |
| Greenup County Public Library | — | WordPress-KY | 0 |
| Hardin County Public Library | — | WordPress-KY | 0 |
| Harlan County Public Library | — | WordPress-KY | 0 |
| Henderson County Public Library | — | WordPress-KY | 80 |
| Hickman County Memorial Library | KY | WordPress-KY | 0 |
| Irvington Branch | — | WordPress-KY | 0 |
| Jessamine County Public Library | — | WordPress-KY | 0 |
| Laurel County Public Library | — | WordPress-KY | 0 |
| Lents Branch | KY | WordPress-KY | 0 |
| Lexington Public Library | — | WordPress-KY | 31 |
| Louisville Free Public Library | — | WordPress-KY | 22 |
| Madison County Public Library | — | WordPress-KY | 0 |
| Mahan-Oldham County Library | KY | WordPress-KY | 0 |
| Marion County Public Library | KY | WordPress-KY | 0 |
| Mary Wood Weldon Memorial Public Library | — | WordPress-KY | 23 |
| Mason County Public Library | — | WordPress-KY | 11 |
| McCracken County Public Library | — | WordPress-KY | 86 |
| Montgomery County Public Library | — | WordPress-KY | 2 |
| Nicholas County Public Library | KY | WordPress-KY | 0 |
| Ohio County Public Library | KY | WordPress-KY | 0 |
| Oldham County Public Library | — | WordPress-KY | 10 |
| Perry County Public Library | — | WordPress-KY | 9 |
| Pike County Public Library | — | WordPress-KY | 0 |
| Rebecca Caudill Public Library | — | WordPress-KY | 1 |
| Rowan County Public Library | — | WordPress-KY | 104 |
| Scott County Public Library | — | WordPress-KY | 1 |
| South Branch | — | WordPress-KY | 10 |
| Trimble County Public Library | KY | WordPress-KY | 0 |
| Warren County Public Library | — | WordPress-KY | 10 |
| Washington County Public Library | KY | WordPress-KY | 0 |
| Wayne County Public Library | KY | WordPress-KY | 0 |
| Whitley County Public Library | — | WordPress-KY | 0 |
| Woodford County Library | — | WordPress-KY | 0 |
| Acton Memorial Library | MA | WordPress-MA | 0 |
| Agawam Public Library | MA | WordPress-MA | 5 |
| Aldenville Branch Library | MA | WordPress-MA | 2 |
| Amesbury Public Library | MA | WordPress-MA | 0 |
| Andrews Branch Library | MA | WordPress-MA | 0 |
| Aquinnah Public Library | MA | WordPress-MA | 3 |
| Athol Public Library | MA | WordPress-MA | 0 |
| Attleboro Public Library | MA | WordPress-MA | 1 |
| Auburn Free Public Library | MA | WordPress-MA | 1 |
| Auburndale Branch Library | MA | WordPress-MA | 11 |
| Ayer Public Library | MA | WordPress-MA | 1 |
| Beals Memorial Library | MA | WordPress-MA | 0 |
| Bedford Free Public Library | MA | WordPress-MA | 0 |
| Bellingham Public Library | MA | WordPress-MA | 0 |
| Belmont Public Library | MA | WordPress-MA | 0 |
| Berkley Public Library | MA | WordPress-MA | 0 |
| Berkshire Athenaeum | MA | WordPress-MA | 5 |
| Bigelow Free Public Library | MA | WordPress-MA | 0 |
| Billerica Public Library | MA | WordPress-MA | 0 |
| Blackstone Free Public Library | MA | WordPress-MA | 0 |
| Blanding Public Library | MA | WordPress-MA | 0 |
| Boxford Town Library | MA | WordPress-MA | 0 |
| Boylston Public Library | MA | WordPress-MA | 0 |
| Boynton Public Library | MA | WordPress-MA | 0 |
| Brewster Ladies Library Assoc. | MA | WordPress-MA | 3 |
| Brighton Branch Library | MA | WordPress-MA | 0 |
| Brightwood Branch Library | MA | WordPress-MA | 1 |
| Brimfield Public Library | MA | WordPress-MA | 2 |
| Brookline Public Library | MA | WordPress-MA | 0 |
| Bushnell-Sage Library | MA | WordPress-MA | 0 |
| Cambridge Public Library | MA | WordPress-MA | 13 |
| Carver Public Library | MA | WordPress-MA | 0 |
| Cary Memorial Library | MA | WordPress-MA | 0 |
| Casa Da Saudade | MA | WordPress-MA | 0 |
| Centerville Public Library | MA | WordPress-MA | 60 |
| Chelmsford Public Library | MA | WordPress-MA | 0 |
| Chelsea Public Library | MA | WordPress-MA | 0 |
| Chester C. Corbin Public Library | MA | WordPress-MA | 0 |
| Chesterfield Public Library | MA | WordPress-MA | 1 |
| Chilmark Free Public Library | MA | WordPress-MA | 2 |
| Clarksburg Town Library | MA | WordPress-MA | 0 |
| Conant Free Public Library | MA | WordPress-MA | 0 |
| Concord Free Public Library | MA | WordPress-MA | 1 |
| Cotuit Library | MA | WordPress-MA | 1 |
| Dalton Free Public Library | MA | WordPress-MA | 24 |
| David Joyce Milne Public Library | MA | WordPress-MA | 0 |
| Dighton Public Library | MA | WordPress-MA | 0 |
| Dover Town Library | MA | WordPress-MA | 0 |
| Dudley Branch Library | MA | WordPress-MA | 26 |
| East Bridgewater Public Library | MA | WordPress-MA | 0 |
| East End Branch Library | MA | WordPress-MA | 1 |
| East Milton Branch Library | MA | WordPress-MA | 0 |
| Eastham Public Library | MA | WordPress-MA | 5 |
| Edgartown Free Public Library | MA | WordPress-MA | 0 |
| Edith M. Fox Library | MA | WordPress-MA | 0 |
| Edwards Public Library | MA | WordPress-MA | 9 |
| Eldredge Public Library | MA | WordPress-MA | 1 |
| Elizabeth Taber Memorial Library | MA | WordPress-MA | 0 |
| Emily Williston Memorial Library | MA | WordPress-MA | 0 |
| Fitchburg Public Library | MA | WordPress-MA | 1 |
| Five Corners Library | MA | WordPress-MA | 0 |
| Flint Public Library | MA | WordPress-MA | 0 |
| Forbush Memorial Library | MA | WordPress-MA | 0 |
| Framingham Public Library | MA | WordPress-MA | 61 |
| Frances Perkins Branch Library At Greendale | MA | WordPress-MA | 0 |
| Franklin Public Library | MA | WordPress-MA | 0 |
| G. A. R. Memorial Library | MA | WordPress-MA | 0 |
| Gleason Public Library | MA | WordPress-MA | 0 |
| Gloucester Lyceum Sawyer Free Lib | MA | WordPress-MA | 0 |
| Goshen Free Public Library | MA | WordPress-MA | 0 |
| Grace Hall Memorial Library | MA | WordPress-MA | 0 |
| Grafton Public Library | MA | WordPress-MA | 0 |
| Granby Free Public Library | MA | WordPress-MA | 1 |
| Granville Public Library | MA | WordPress-MA | 0 |
| Hamilton Memorial Library | MA | WordPress-MA | 0 |
| Hanson Public Library | MA | WordPress-MA | 0 |
| Harvard Public Library | MA | WordPress-MA | 12 |
| Harwich Port Library Assoc. | MA | WordPress-MA | 1 |
| Haston Free Public Library | MA | WordPress-MA | 0 |
| Haverhill Public Library | MA | WordPress-MA | 0 |
| Hazen Memorial Library | MA | WordPress-MA | 1 |
| Heath Free Public Library | MA | WordPress-MA | 0 |
| Hingham Public Library | MA | WordPress-MA | 1 |
| Holbrook Public Library | MA | WordPress-MA | 0 |
| Holland Public Library | MA | WordPress-MA | 0 |
| Holliston Public Library | MA | WordPress-MA | 0 |
| Holyoke Public Library | MA | WordPress-MA | 84 |
| Hopkinton Public Library | MA | WordPress-MA | 0 |
| Hubbardston Public Library | MA | WordPress-MA | 7 |
| Hudson Public Library | MA | WordPress-MA | 0 |
| Huntington Public Library | MA | WordPress-MA | 0 |
| Hyannis Public Library Assoc. | MA | WordPress-MA | 133 |
| Hyde Park Branch Library | MA | WordPress-MA | 0 |
| Ipswich Public Library | MA | WordPress-MA | 0 |
| Islington Branch Library | MA | WordPress-MA | 0 |
| J. V. Fletcher Library | MA | WordPress-MA | 1 |
| Jonathan Bourne Public Library | MA | WordPress-MA | 0 |
| Jones Library, Inc. | MA | WordPress-MA | 8 |
| Joseph H. Plumb Memorial Library | MA | WordPress-MA | 0 |
| Joshua Hyde Public Library | MA | WordPress-MA | 77 |
| Kingston Public Library | MA | WordPress-MA | 0 |
| Lakeville Free Public Library | MA | WordPress-MA | 0 |
| Lawrence Public Library | MA | WordPress-MA | 4 |
| Leicester Public Library | MA | WordPress-MA | 0 |
| Lenox Library Association | MA | WordPress-MA | 0 |
| Leominster Public Library | MA | WordPress-MA | 0 |
| Leverett Library | MA | WordPress-MA | 0 |
| Levi Heywood Memorial Library | MA | WordPress-MA | 7 |
| Lilly Library | MA | WordPress-MA | 0 |
| Lucius Beebe Memorial Library | MA | WordPress-MA | 3 |
| Lunenburg Public Library | MA | WordPress-MA | 0 |
| Lynnfield Public Library | MA | WordPress-MA | 0 |
| Mashpee Public Library | MA | WordPress-MA | 18 |
| Mattapoisett Public Library | MA | WordPress-MA | 0 |
| Medfield Memorial Library | MA | WordPress-MA | 0 |
| Medford Public Library | MA | WordPress-MA | 0 |
| Memorial Hall Library | MA | WordPress-MA | 0 |
| Merriam-Gilbert Public Library | MA | WordPress-MA | 0 |
| Merrimac Public Library | MA | WordPress-MA | 0 |
| Middlefield Public Library | MA | WordPress-MA | 0 |
| Millbury Public Library | MA | WordPress-MA | 0 |
| Millicent Library | MA | WordPress-MA | 0 |
| Millis Public Library | MA | WordPress-MA | 1 |
| Millville Free Public Library | MA | WordPress-MA | 4 |
| Monterey Public Library | MA | WordPress-MA | 0 |
| Morrill Memorial Library | MA | WordPress-MA | 1 |
| Moses Greeley Parker Memorial Lib. | MA | WordPress-MA | 0 |
| Nahant Public Library | MA | WordPress-MA | 35 |
| Nantucket Atheneum | MA | WordPress-MA | 0 |
| Needham Free Public Library | MA | WordPress-MA | 0 |
| Newton Free Library | MA | WordPress-MA | 0 |
| North Adams Public Library | MA | WordPress-MA | 0 |
| Northborough Free Library | MA | WordPress-MA | 0 |
| Norton Public Library | MA | WordPress-MA | 0 |
| Oak Bluffs Public Library | MA | WordPress-MA | 0 |
| Oxford Free Public Library | MA | WordPress-MA | 0 |
| Palmer Public Library | MA | WordPress-MA | 0 |
| Paul Pratt Memorial Library | MA | WordPress-MA | 0 |
| Peabody Institute Library | MA | WordPress-MA | 1 |
| Peru Library | MA | WordPress-MA | 0 |
| Petersham Memorial Library | MA | WordPress-MA | 0 |
| Phinehas S. Newton Library | MA | WordPress-MA | 0 |
| Plainville Public Library | MA | WordPress-MA | 0 |
| Plympton Public Library | MA | WordPress-MA | 30 |
| Pollard Memorial Library | MA | WordPress-MA | 0 |
| Provincetown Public Library | MA | WordPress-MA | 39 |
| Reading Public Library | MA | WordPress-MA | 0 |
| Reuben Hoar Library | MA | WordPress-MA | 0 |
| Revere Public Library | MA | WordPress-MA | 1 |
| Richard Salter Storrs Library | MA | WordPress-MA | 0 |
| Richards Memorial Library | MA | WordPress-MA | 1 |
| Rockport Public Library | MA | WordPress-MA | 1 |
| Rowley Public Library | MA | WordPress-MA | 0 |
| Russell Public Library | MA | WordPress-MA | 0 |
| Rutland Free Public Library | MA | WordPress-MA | 0 |
| Salem Public Library | MA | WordPress-MA | 0 |
| Salisbury Public Library | MA | WordPress-MA | 0 |
| Sandisfield Public Library | MA | WordPress-MA | 13 |
| Scituate Town Library | MA | WordPress-MA | 21 |
| Seekonk Public Library | MA | WordPress-MA | 0 |
| Shaw Memorial Library | MA | WordPress-MA | 1 |
| Sherborn Library | MA | WordPress-MA | 0 |
| Shrewsbury Free Public Library | MA | WordPress-MA | 0 |
| Simon Fairfield Public Library | MA | WordPress-MA | 4 |
| Somerset Public Library | MA | WordPress-MA | 0 |
| South Dennis Free Public Library | MA | WordPress-MA | 0 |
| Stevens Memorial Library | MA | WordPress-MA | 0 |
| Stockbridge Library Association | MA | WordPress-MA | 12 |
| Stoneham Public Library | MA | WordPress-MA | 4 |
| Stoughton Public Library | MA | WordPress-MA | 1 |
| Swampscott Public Library | MA | WordPress-MA | 1 |
| Swansea Free Public Library | MA | WordPress-MA | 0 |
| T.O.H.P. Burnham Free Library | MA | WordPress-MA | 0 |
| Taft Public Library | MA | WordPress-MA | 16 |
| Taunton Public Library | MA | WordPress-MA | 0 |
| Taylor Memorial Library | MA | WordPress-MA | 0 |
| Tewksbury Public Library | MA | WordPress-MA | 1 |
| Topsfield Town Library | MA | WordPress-MA | 0 |
| Townsend Public Library | MA | WordPress-MA | 0 |
| Tyler Memorial Library | MA | WordPress-MA | 0 |
| Uxbridge Free Public Library | MA | WordPress-MA | 0 |
| Ventress Memorial Library | MA | WordPress-MA | 0 |
| Waban Branch Library | MA | WordPress-MA | 4 |
| Walpole Public Library | MA | WordPress-MA | 49 |
| Warren Public Library | MA | WordPress-MA | 0 |
| Wayland Free Public Library | MA | WordPress-MA | 0 |
| Wellfleet Public Library | MA | WordPress-MA | 30 |
| West Dennis Free Public Library | MA | WordPress-MA | 0 |
| West Falmouth Library, Inc. | MA | WordPress-MA | 12 |
| Westborough Public Library | MA | WordPress-MA | 2 |
| Westfield Athenaeum | MA | WordPress-MA | 30 |
| Westhampton Memorial Library | MA | WordPress-MA | 0 |
| Weston Public Library | MA | WordPress-MA | 0 |
| Westport Free Public Library | MA | WordPress-MA | 0 |
| Whitinsville Social Library | MA | WordPress-MA | 0 |
| Wilbraham Public Library | MA | WordPress-MA | 0 |
| Wilmington Memorial Library | MA | WordPress-MA | 7 |
| Winchester Public Library | MA | WordPress-MA | 0 |
| Windsor Free Public Library | MA | WordPress-MA | 0 |
| Woods Memorial Library | MA | WordPress-MA | 1 |
| Young Mens Library Association | MA | WordPress-MA | 0 |
| Amherst Town Library | NH | WordPress-NH | 1 |
| Andover Public Library | NH | WordPress-NH | 0 |
| Barrington Public Library | NH | WordPress-NH | 2 |
| Bartlett Public Library | NH | WordPress-NH | 67 |
| Bath Public Library | NH | WordPress-NH | 0 |
| Bedford Public Library | NH | WordPress-NH | 2 |
| Belmont Public Library | NH | WordPress-NH | 0 |
| Bethlehem Public Library | NH | WordPress-NH | 0 |
| Blaisdell Memorial Library | NH | WordPress-NH | 1 |
| Bremer Pond Memorial Library | NH | WordPress-NH | 2 |
| Brown Memorial Library | NH | WordPress-NH | 0 |
| Byron G. Merrill Library | NH | WordPress-NH | 0 |
| Canaan Town Library | NH | WordPress-NH | 11 |
| Chamberlin Free Public Library | NH | WordPress-NH | 0 |
| Chester Public Library | NH | WordPress-NH | 0 |
| Chesterfield Public Library | NH | WordPress-NH | 1 |
| Chocorua Public Library | NH | WordPress-NH | 2 |
| Conant Public Library | NH | WordPress-NH | 0 |
| Concord Public Library | NH | WordPress-NH | 0 |
| Cook Memorial Library | NH | WordPress-NH | 10 |
| Dalton Public Library | NH | WordPress-NH | 0 |
| Derry Public Library | NH | WordPress-NH | 0 |
| Dover Public Library | NH | WordPress-NH | 0 |
| Dublin Public Library | NH | WordPress-NH | 0 |
| Dunbarton Public Library | NH | WordPress-NH | 0 |
| East Kingston Public Library | NH | WordPress-NH | 0 |
| East Rochester Public Library | NH | WordPress-NH | 0 |
| Effingham Free Public Library | NH | WordPress-NH | 0 |
| Elkins Library | NH | WordPress-NH | 0 |
| Exeter Public Library | NH | WordPress-NH | 0 |
| Fiske Free Library | NH | WordPress-NH | 0 |
| Franklin Public Library | NH | WordPress-NH | 0 |
| Fremont Public Library | NH | WordPress-NH | 0 |
| G. E.P. Dodge Library | NH | WordPress-NH | 12 |
| Gale Library | NH | WordPress-NH | 0 |
| George Gamble Library | NH | WordPress-NH | 1 |
| George Holmes Bixby Memorial Library | NH | WordPress-NH | 0 |
| Gilford Public Library | NH | WordPress-NH | 1 |
| Goffstown Public Library | NH | WordPress-NH | 0 |
| Goodwin Library | NH | WordPress-NH | 0 |
| Gorham Public Library | NH | WordPress-NH | 1 |
| Griffin Free Public Library | NH | WordPress-NH | 33 |
| Hampstead Public Library | NH | WordPress-NH | 0 |
| Hampton Falls Free Library | NH | WordPress-NH | 45 |
| Hampton Lane Memorial Library | NH | WordPress-NH | 0 |
| Hancock Town Library | NH | WordPress-NH | 1 |
| Harvey-Mitchell Memorial Library | NH | WordPress-NH | 1 |
| Haverhill Library Association | NH | WordPress-NH | 0 |
| Hebron Public Library | NH | WordPress-NH | 0 |
| Hill Public Library | NH | WordPress-NH | 7 |
| Holderness Library | NH | WordPress-NH | 0 |
| Hollis Social Library | NH | WordPress-NH | 0 |
| Hooksett Public Library | NH | WordPress-NH | 1 |
| Hudson Rodgers Memorial Library | NH | WordPress-NH | 1 |
| James E. Nichols Memorial Library | NH | WordPress-NH | 4 |
| Joseph Patch Library | NH | WordPress-NH | 0 |
| Josiah Carpenter Library | NH | WordPress-NH | 0 |
| Laconia Public Library | NH | WordPress-NH | 0 |
| Laura Johnson Memorial Library | NH | WordPress-NH | 0 |
| Lebanon Public Libraries | NH | WordPress-NH | 3 |
| Libbie A. Cass Memorial Library | NH | WordPress-NH | 0 |
| Littleton Public Library | NH | WordPress-NH | 0 |
| Londonderry Leach Library | NH | WordPress-NH | 0 |
| Madbury Public Library | NH | WordPress-NH | 1 |
| Madison Library | NH | WordPress-NH | 0 |
| Manchester City Library | NH | WordPress-NH | 3 |
| Mansfield Public Library | NH | WordPress-NH | 0 |
| Mary E. Bartlett Library | NH | WordPress-NH | 0 |
| Mason Public Library | NH | WordPress-NH | 0 |
| Meredith Public Library | NH | WordPress-NH | 2 |
| Merrimack Public Library | NH | WordPress-NH | 0 |
| Milan Public Library | NH | WordPress-NH | 0 |
| Milford Wadleigh Memorial Library | NH | WordPress-NH | 1 |
| Monroe Public Library | NH | WordPress-NH | 0 |
| Moultonborough Public Library | NH | WordPress-NH | 1 |
| Nashua Public Library | NH | WordPress-NH | 0 |
| New Durham Public Library | NH | WordPress-NH | 15 |
| New Ipswich Library | NH | WordPress-NH | 0 |
| Newbury Public Library | NH | WordPress-NH | 0 |
| Newfields Public Library | NH | WordPress-NH | 10 |
| Newmarket Public Library | NH | WordPress-NH | 0 |
| Nichols Memorial Library | NH | WordPress-NH | 0 |
| Olive G. Pettis Library | NH | WordPress-NH | 0 |
| Olivia Rodham Memorial Library | NH | WordPress-NH | 27 |
| Pembroke Town Library | NH | WordPress-NH | 161 |
| Philbrick-James Library | NH | WordPress-NH | 1 |
| Philip Read Memorial Library | NH | WordPress-NH | 0 |
| Pike Library | NH | WordPress-NH | 0 |
| Pillsbury Free Library | NH | WordPress-NH | 7 |
| Rollinsford Public Library | NH | WordPress-NH | 23 |
| Rye Public Library | NH | WordPress-NH | 0 |
| Salem Kelley Library | NH | WordPress-NH | 0 |
| Salisbury Free Library | NH | WordPress-NH | 0 |
| Stark Public Library | NH | WordPress-NH | 0 |
| Sullivan Public Library | NH | WordPress-NH | 0 |
| Tracy Memorial Library | NH | WordPress-NH | 0 |
| Wakefield Public Library | NH | WordPress-NH | 0 |
| Walpole Town Library | NH | WordPress-NH | 0 |
| Webster Free Public Library | NH | WordPress-NH | 0 |
| Westmoreland Public Library | NH | WordPress-NH | 0 |
| Whitefield Public Library | NH | WordPress-NH | 8 |
| Wilmot Public Library | NH | WordPress-NH | 5 |
| Wilton Public Gregg Free Library | NH | WordPress-NH | 0 |
| Windham Nesmith Library | NH | WordPress-NH | 1 |
| Wolfeboro Public Library | NH | WordPress-NH | 1 |
| Adams Memorial Library | — | WordPress-PA | 32 |
| Albright Memorial Library | — | WordPress-PA | 526 |
| Altoona Area Public Library | — | WordPress-PA | 70 |
| Andrew Carnegie Free Library | — | WordPress-PA | 11 |
| Aston Public Library | — | WordPress-PA | 0 |
| Avalon Public Library | — | WordPress-PA | 0 |
| Avella Area Library Center | — | WordPress-PA | 0 |
| Avonmore Public Library | — | WordPress-PA | 0 |
| Back Mountain Memorial Library | PA | WordPress-PA | 0 |
| Bangor Public Library | — | WordPress-PA | 0 |
| Barbara Moscato Brown Memorial Library | — | WordPress-PA | 0 |
| Beaver County Bookmobile Schedule | PA | WordPress-PA | 0 |
| Belle Vernon Public Library | — | WordPress-PA | 0 |
| Bellwood Antis Public Library | — | WordPress-PA | 11 |
| Berks County Public Libraries | PA | WordPress-PA | 0 |
| Bernville Area Community Library | — | WordPress-PA | 0 |
| Bethel Park Public Library | — | WordPress-PA | 0 |
| Bethel-Tulpehocken Public Library | PA | WordPress-PA | 0 |
| Bethlehem Area Public Library | PA | WordPress-PA | 0 |
| Borough Of Folcroft Public Library | — | WordPress-PA | 0 |
| Bosler Free Library | PA | WordPress-PA | 0 |
| Boyertown Community Library | — | WordPress-PA | 0 |
| Bradford Area Public Library | — | WordPress-PA | 0 |
| Bridgeville Public Library | — | WordPress-PA | 0 |
| Bucks County Free Library - Fallsington Library | — | WordPress-PA | 0 |
| Bucks County Free Library - Pipersville Free Library | — | WordPress-PA | 0 |
| Bucks County Free Library - Village Library Of Wrightstown | — | WordPress-PA | 0 |
| Butler Area Public Library | PA | WordPress-PA | 0 |
| Carbondale Public Library | — | WordPress-PA | 0 |
| Carnegie Free Library Of Swissvale | — | WordPress-PA | 0 |
| Carnegie Library Of Mckeesport | — | WordPress-PA | 0 |
| Carnegie Library Of Mckeesport - White Oak | — | WordPress-PA | 0 |
| Carnegie Library of Pittsburgh | — | WordPress-PA | 11 |
| Carnegie Library, Midland | — | WordPress-PA | 0 |
| Chester Springs Library | — | WordPress-PA | 0 |
| Clairton Public Library | — | WordPress-PA | 0 |
| Claysburg Area Public Library Inc | — | WordPress-PA | 0 |
| Coatesville Area Public Library | — | WordPress-PA | 0 |
| Community College Of Beaver County | — | WordPress-PA | 0 |
| Community Library Of Castle Shannon | — | WordPress-PA | 0 |
| Cooperstown Public Library | PA | WordPress-PA | 0 |
| Coraopolis Memorial Library | — | WordPress-PA | 0 |
| Corry Public Library | — | WordPress-PA | 5 |
| Coudersport Public Library | — | WordPress-PA | 4 |
| Dalton Community Library | PA | WordPress-PA | 0 |
| Darby Library | — | WordPress-PA | 4 |
| Degenstein Community Library | — | WordPress-PA | 4 |
| Delmont Public Library | — | WordPress-PA | 12 |
| Downingtown Library Company | — | WordPress-PA | 0 |
| East Berlin Community Library | — | WordPress-PA | 1 |
| Ellwood City Area Pub Library | — | WordPress-PA | 0 |
| Emmaus Public Library | — | WordPress-PA | 0 |
| Erie County Public Library | — | WordPress-PA | 0 |
| Evans City Public Library | — | WordPress-PA | 0 |
| Everett Free Library | — | WordPress-PA | 0 |
| Fleetwood Area Public Library | — | WordPress-PA | 0 |
| Foxburg Free Library Association | — | WordPress-PA | 0 |
| Francis J. Catania Law Library | — | WordPress-PA | 0 |
| Free Library of Philadelphia | — | WordPress-PA | 0 |
| Genesee Area Library | — | WordPress-PA | 0 |
| Glenolden Library | — | WordPress-PA | 0 |
| Green Free Library | — | WordPress-PA | 0 |
| Hamlin Memorial Library | — | WordPress-PA | 0 |
| Hawley Library | — | WordPress-PA | 0 |
| Hazleton Area Public Library | — | WordPress-PA | 0 |
| Hellertown Area Library | — | WordPress-PA | 0 |
| Hershey Public Library | — | WordPress-PA | 0 |
| Hollidaysburg Area Public Library | — | WordPress-PA | 0 |
| Honey Brook Community Library | — | WordPress-PA | 0 |
| Horsham Township Library | — | WordPress-PA | 0 |
| Hoyt Library | PA | WordPress-PA | 0 |
| Hughesville Area Public Library | — | WordPress-PA | 33 |
| Huntingdon County Library | — | WordPress-PA | 3 |
| Hyndman-Londonderry Public Library | — | WordPress-PA | 0 |
| Jefferson Hills Public Library | — | WordPress-PA | 1 |
| Jefferson Resource Center And Computer Lab | PA | WordPress-PA | 0 |
| Jenkintown Library | — | WordPress-PA | 2 |
| Johnsonburg Public Library | — | WordPress-PA | 0 |
| Joseph T. Simpson Public Library | — | WordPress-PA | 0 |
| Lansdale Public Library | — | WordPress-PA | 12 |
| Lansdowne Public Library | — | WordPress-PA | 1 |
| Lebanon Community Library | PA | WordPress-PA | 0 |
| Ligonier Valley Library | — | WordPress-PA | 12 |
| Lilly Washington Pub Library | — | WordPress-PA | 0 |
| Lititz Public Library | — | WordPress-PA | 0 |
| Louisa Gonser Community Library Inc | — | WordPress-PA | 2 |
| Malvern Public Library | — | WordPress-PA | 0 |
| Manheim Community Library | — | WordPress-PA | 0 |
| Marian Sutherland Kirby Library | — | WordPress-PA | 28 |
| Marienville Area Library | — | WordPress-PA | 0 |
| Mars Area Public Library | — | WordPress-PA | 0 |
| Martinsburg Community Library | PA | WordPress-PA | 0 |
| Mary S Biesecker Public Library | — | WordPress-PA | 0 |
| Meadville Public Library | — | WordPress-PA | 0 |
| Memorial Library Of Nazareth Vicinity | — | WordPress-PA | 5 |
| Mengle Memorial Library | — | WordPress-PA | 0 |
| Mercer Area Library | PA | WordPress-PA | 0 |
| Meyersdale Public Library | — | WordPress-PA | 0 |
| Middletown Public Library | PA | WordPress-PA | 0 |
| Mifflin County Library | — | WordPress-PA | 0 |
| Minersville Public Library | — | WordPress-PA | 0 |
| Monessen Public Library District Center | — | WordPress-PA | 0 |
| Monroeton Public Library | — | WordPress-PA | 4 |
| Monroeville Public Library | — | WordPress-PA | 0 |
| Montgomery Area Public Library | — | WordPress-PA | 0 |
| Moores Memorial Library | — | WordPress-PA | 0 |
| Mount Pleasant Free Public Library Association | — | WordPress-PA | 0 |
| Murrysville Community Library | — | WordPress-PA | 0 |
| Narberth Community Library | — | WordPress-PA | 10 |
| New Cumberland Public Library | — | WordPress-PA | 0 |
| New Florence Community Library | — | WordPress-PA | 11 |
| North Versailles Public Library | — | WordPress-PA | 0 |
| North Wales Library | — | WordPress-PA | 0 |
| Northern Wayne Community Library | PA | WordPress-PA | 0 |
| Norwood Public Library | PA | WordPress-PA | 0 |
| Oakmont Carnegie Library | — | WordPress-PA | 5 |
| Oil City Library | — | WordPress-PA | 0 |
| Orwigsburg Area Fr Pub Library | — | WordPress-PA | 0 |
| Parkesburg Free Library | — | WordPress-PA | 1 |
| Paul Smith Library Of Southern York County | PA | WordPress-PA | 0 |
| Pequea Valley Public Library | — | WordPress-PA | 3 |
| Pequea Valley Public Library - Gap Branch | — | WordPress-PA | 0 |
| Phoenixville Public Library | — | WordPress-PA | 1 |
| Portage Public Library | — | WordPress-PA | 2 |
| Pottsville Free Public Library | — | WordPress-PA | 12 |
| Pratt Memorial Library | PA | WordPress-PA | 0 |
| Priestley Forsyth Memorial Library | — | WordPress-PA | 0 |
| Prospect Community Library | — | WordPress-PA | 0 |
| Prospect Park Free Library | — | WordPress-PA | 0 |
| Punxsutawney Memorial Library | — | WordPress-PA | 0 |
| Quarryville Library Center | — | WordPress-PA | 0 |
| Ralston Link | — | WordPress-PA | 0 |
| Reynoldsville Public Library | — | WordPress-PA | 0 |
| Richland Community Library | PA | WordPress-PA | 0 |
| Ridgway Public Library | — | WordPress-PA | 0 |
| Ridley Park Public Library | — | WordPress-PA | 0 |
| Ringtown Area Library | — | WordPress-PA | 0 |
| Roaring Spring Comm Library | — | WordPress-PA | 0 |
| Robesonia Community Library | — | WordPress-PA | 0 |
| Rochester Public Library | PA | WordPress-PA | 0 |
| Sarah S Bovard Memorial Library | — | WordPress-PA | 0 |
| Saxonburg Area Library | — | WordPress-PA | 0 |
| Saxton Community Library | — | WordPress-PA | 0 |
| Scottdale Public Library | — | WordPress-PA | 0 |
| Sewickley Public Library | — | WordPress-PA | 4 |
| Sheffield Township Library | — | WordPress-PA | 0 |
| Shippensburg Public Library | — | WordPress-PA | 0 |
| Sinking Spring Public Library | — | WordPress-PA | 0 |
| Slatington Library Inc | — | WordPress-PA | 0 |
| Smithfield Library | — | WordPress-PA | 0 |
| South Fayette Township Library | — | WordPress-PA | 0 |
| South Park Township Library | — | WordPress-PA | 0 |
| Spalding Memorial Library | — | WordPress-PA | 0 |
| Spring City Free Public Library | — | WordPress-PA | 0 |
| Springdale Free Public Library | — | WordPress-PA | 0 |
| Springfield Township Library | PA | WordPress-PA | 0 |
| Strasburg-Heisler Library | — | WordPress-PA | 0 |
| Summerville Public Library | — | WordPress-PA | 0 |
| Sykesville Public Library | — | WordPress-PA | 0 |
| Taylor Community Library | — | WordPress-PA | 6 |
| Towanda Public Library | — | WordPress-PA | 5 |
| Trafford Community Public Library | — | WordPress-PA | 3 |
| Tunkhannock Public Library | — | WordPress-PA | 0 |
| Tyrone-Snyder Township Public Library | — | WordPress-PA | 0 |
| Union Library Company Of Hatborough | — | WordPress-PA | 0 |
| Warren Library Association | — | WordPress-PA | 0 |
| Waterford Public Library | PA | WordPress-PA | 0 |
| West Chester Public Library | — | WordPress-PA | 0 |
| West Newton Public Library | — | WordPress-PA | 3 |
| West Pittston Library | — | WordPress-PA | 0 |
| Westfield Public Library | — | WordPress-PA | 0 |
| Wilcox Public Library | — | WordPress-PA | 0 |
| Wilkinsburg Public Library | — | WordPress-PA | 0 |
| Windber Public Library Association | — | WordPress-PA | 0 |
| Wyalusing Public Library | — | WordPress-PA | 11 |
| Yeadon Public Library | — | WordPress-PA | 0 |
| Zelienople Public Library | — | WordPress-PA | 33 |
| Ashaway Free Library | RI | WordPress-RI | 0 |
| Brownell Library, Home Of Little Compton | RI | WordPress-RI | 0 |
| Central Falls Free Public Library | RI | WordPress-RI | 0 |
| Coventry Public Library | RI | WordPress-RI | 2 |
| East Greenwich Free Library | RI | WordPress-RI | 1 |
| Essex Public Library | RI | WordPress-RI | 1 |
| Exeter Public Library | RI | WordPress-RI | 0 |
| Fairmount Branch | RI | WordPress-RI | 17 |
| Fox Point Library | RI | WordPress-RI | 1 |
| George Hail Free Library | RI | WordPress-RI | 0 |
| Greene Public Library | RI | WordPress-RI | 0 |
| Greenville Public Library | RI | WordPress-RI | 0 |
| Harmony Library | RI | WordPress-RI | 0 |
| Island Free Library | RI | WordPress-RI | 0 |
| Knight Memorial Library | RI | WordPress-RI | 1 |
| Langworthy Public Library | RI | WordPress-RI | 0 |
| Louttit Memorial Library | RI | WordPress-RI | 37 |
| Marian J. Mohr Memorial Library | RI | WordPress-RI | 0 |
| Middletown Public Library | RI | WordPress-RI | 0 |
| Mount Pleasant Library | RI | WordPress-RI | 1 |
| North Smithfield Public Library | RI | WordPress-RI | 0 |
| Olneyville Library | RI | WordPress-RI | 1 |
| Pascoag Free Public Library | RI | WordPress-RI | 10 |
| Portsmouth Free Public Library | RI | WordPress-RI | 0 |
| Providence Public Library | RI | WordPress-RI | 1 |
| Rochambeau Library | RI | WordPress-RI | 1 |
| Rogers Free Library | RI | WordPress-RI | 0 |
| Rumford Branch | RI | WordPress-RI | 0 |
| Smith Hill Library | RI | WordPress-RI | 1 |
| South Providence Library | RI | WordPress-RI | 1 |
| Wanskuck Library | RI | WordPress-RI | 1 |
| Washington Park Library | RI | WordPress-RI | 1 |
| Westerly Public Library | RI | WordPress-RI | 4 |
| Woonsocket Harris Public Library | RI | WordPress-RI | 17 |
| Abbeville County Library System | SC | WordPress-SC | 0 |
| Aiken County Library - Midland Valley Branch Library | SC | WordPress-SC | 1 |
| Anderson County Library | SC | WordPress-SC | 110 |
| Anderson County Library - Piedmont Branch Library | SC | WordPress-SC | 0 |
| Chester County Library | SC | WordPress-SC | 0 |
| Chesterfield County Library System | SC | WordPress-SC | 0 |
| Clinton Public Library | SC | WordPress-SC | 0 |
| Dillon County Library System | SC | WordPress-SC | 1 |
| Edgefield County Public Library - Johnston Branch (Mobley Library) | SC | WordPress-SC | 0 |
| Florence County Library System | SC | WordPress-SC | 73 |
| Great Falls Library | SC | WordPress-SC | 56 |
| Greenville County Library - Anderson Road (West) Branch | SC | WordPress-SC | 12 |
| Hal Kohn Memorial Library | SC | WordPress-SC | 0 |
| Hampton County Library - Estill Branch Library | SC | WordPress-SC | 0 |
| Horry County Memorial Library - Loris Library | SC | WordPress-SC | 0 |
| Kershaw County Library - Camden Branch Library | SC | WordPress-SC | 0 |
| Kershaw County Library - Elgin Branch Library | SC | WordPress-SC | 0 |
| Lake View Library | SC | WordPress-SC | 1 |
| Lamar District Library | SC | WordPress-SC | 0 |
| Lexington County Library - Chapin | SC | WordPress-SC | 3 |
| Lexington County Library - Gilbert-Summit | SC | WordPress-SC | 0 |
| Lexington County Library - Irmo | SC | WordPress-SC | 0 |
| Lexington County Library - Swansea | SC | WordPress-SC | 0 |
| Lexington County Public Library System - Main | SC | WordPress-SC | 0 |
| Marion County Library System | SC | WordPress-SC | 0 |
| Mccormick County Library System | SC | WordPress-SC | 3 |
| Oconee County Public Library - Salem Branch Library | SC | WordPress-SC | 0 |
| Oconee County Public Library - Seneca Branch Library | SC | WordPress-SC | 0 |
| Oconee County Public Library - Westminster Branch Library | SC | WordPress-SC | 0 |
| Orangeburg County Library - Springfield Branch Library | SC | WordPress-SC | 0 |
| Orangeburg County Library Commission | SC | WordPress-SC | 0 |
| Pickens County Library - Central-Clemson Branch Library | SC | WordPress-SC | 0 |
| Pickens County Library - Sarlin Branch Library | SC | WordPress-SC | 2 |
| Saluda County Library System | SC | WordPress-SC | 25 |
| Spartanburg County Public Library - H. Carlisle Bean Law Library | SC | WordPress-SC | 0 |
| Union County Library System | SC | WordPress-SC | 3 |
| York Public Library | SC | WordPress-SC | 0 |
| Barrett-Wharton Public Library | WV | WordPress-WV | 31 |
| Berkeley County Public Library | WV | WordPress-WV | 0 |
| Boone-Madison Public Library | WV | WordPress-WV | 0 |
| Bridgeport Public Library | WV | WordPress-WV | 0 |
| Cameron Public Library | WV | WordPress-WV | 0 |
| Center Point Public Library | WV | WordPress-WV | 8 |
| Clay County Public Library | WV | WordPress-WV | 2 |
| Dunbar Branch Library | WV | WordPress-WV | 1 |
| East Hardy Branch Public Library | WV | WordPress-WV | 0 |
| Gilbert Public Library | WV | WordPress-WV | 0 |
| Glasgow Branch Library | WV | WordPress-WV | 30 |
| Hamlin-Lincoln County Public Library | WV | WordPress-WV | 0 |
| Harrison County Public Library | WV | WordPress-WV | 15 |
| Hillsboro Public Library | WV | WordPress-WV | 1 |
| Jackson County Public Library | WV | WordPress-WV | 1 |
| Kanawha County Public Library | WV | WordPress-WV | 24 |
| Lynn Murray Memorial Library | WV | WordPress-WV | 0 |
| Marion County Public Library | WV | WordPress-WV | 0 |
| Mercer County Public Library | WV | WordPress-WV | 1 |
| Monroe County Public Library | WV | WordPress-WV | 0 |
| Montgomery Public Library | WV | WordPress-WV | 0 |
| Ohio County Public Library | WV | WordPress-WV | 0 |
| Paden City Public Library | WV | WordPress-WV | 3 |
| Paw Paw Public Library | WV | WordPress-WV | 1 |
| Pendleton County Public Library | WV | WordPress-WV | 0 |
| Piedmont Public Library | WV | WordPress-WV | 0 |
| Pleasants County Public Library | WV | WordPress-WV | 0 |
| Putnam County Public Library | WV | WordPress-WV | 0 |
| Richwood Public Library | WV | WordPress-WV | 8 |
| Ronceverte Public Library | WV | WordPress-WV | 0 |
| Sand Hill Public Library | WV | WordPress-WV | 0 |
| South Charleston Public Library | WV | WordPress-WV | 8 |
| Summers County Public Library | WV | WordPress-WV | 49 |
| Swaney Memorial Library | WV | WordPress-WV | 0 |
| Waverly Library | WV | WordPress-WV | 2 |
| Whitesville Public Library | WV | WordPress-WV | 0 |
| Williamstown Library | WV | WordPress-WV | 0 |

## 2026-08-25

Group 1 rotation, run start 2026-08-25T07:00:01Z. 596 per-site rows from 34 scrapers with per-site log output; 301 sites returned 0 events.

**Two rows carry post-fix counts, not the rotation counts.** `BiblioCommons-KY` / Kenton County Public Library and `WordPress-Abbe-Regional` / ABBE Regional Library System both logged 0 in the 3:00 AM rotation and both were repaired and re-run by hand during this diagnosis. Kenton reads 407 rather than the rotation-log 0 (transient gateway 403 with no retry) and ABBE reads 19 rather than 0 (single navigation timeout aborting the pagination walk). Both re-runs printed to a console rather than `scraper-stdout.log`, so the builder could not see them; the corrected figures come from the re-runs and are recorded in `SCRAPER-FIX-LOG.jsonl` for 2026-08-25.

| Library Website | State | Scraper | Events Found |
|---|---|---|---|
| Anne Arundel County Library events | — | AACPL | 23 |
| Kenton County Public Library | KY | BiblioCommons-KY | 407 |
| Burlington County Library System | NJ | BiblioCommons-NJ | 479 |
| Central Rappahannock Regional Library | VA | BiblioCommons-VA | 500 |
| Colonial Heights Public Library | VA | CivicEngage-Libraries | 0 |
| Williamson County Public Library | TN | CivicEngage-Libraries | 0 |
| Hartford Public Library | CT | Communico-CT | 23 |
| DC Public Library | DC | Communico-DC | 43 |
| Worcester Public Library | MA | Communico-MA | 11 |
| Forsyth County Public Library | NC | Communico-NC | 9 |
| Loudoun County Public Library | VA | Communico-VA | 32 |
| Prince William Public Library | VA | Communico-VA | 10 |
| Library System of Lancaster County | PA | Drupal-Pennsylvania | 1215 |
| York County Libraries | PA | Drupal-Pennsylvania | 599 |
| Lexington County Public Library | SC | EventON-Lexington | 1000 |
| Coverage: Fairfax County, Virginia | — | Fairfax-Parks | 20 |
| Alabama | AL | FairsFestivals-Eastern | 56 |
| Connecticut | CT | FairsFestivals-Eastern | 198 |
| Delaware | DE | FairsFestivals-Eastern | 29 |
| District of Columbia | DC | FairsFestivals-Eastern | 5 |
| Florida | FL | FairsFestivals-Eastern | 561 |
| Georgia | GA | FairsFestivals-Eastern | 189 |
| Illinois | IL | FairsFestivals-Eastern | 373 |
| Indiana | IN | FairsFestivals-Eastern | 179 |
| Kentucky | KY | FairsFestivals-Eastern | 82 |
| Maine | ME | FairsFestivals-Eastern | 107 |
| Maryland | MD | FairsFestivals-Eastern | 153 |
| Massachusetts | MA | FairsFestivals-Eastern | 199 |
| Michigan | MI | FairsFestivals-Eastern | 377 |
| Mississippi | MS | FairsFestivals-Eastern | 26 |
| New Hampshire | NH | FairsFestivals-Eastern | 69 |
| New Jersey | NJ | FairsFestivals-Eastern | 181 |
| New York | NY | FairsFestivals-Eastern | 413 |
| North Carolina | NC | FairsFestivals-Eastern | 424 |
| Ohio | OH | FairsFestivals-Eastern | 476 |
| Pennsylvania | PA | FairsFestivals-Eastern | 389 |
| Rhode Island | RI | FairsFestivals-Eastern | 53 |
| South Carolina | SC | FairsFestivals-Eastern | 102 |
| Tennessee | TN | FairsFestivals-Eastern | 180 |
| Vermont | VT | FairsFestivals-Eastern | 46 |
| Virginia | VA | FairsFestivals-Eastern | 261 |
| West Virginia | WV | FairsFestivals-Eastern | 21 |
| Wisconsin | WI | FairsFestivals-Eastern | 326 |
| Blue Ridge Regional Library | VA | FullCalendar-Libraries | 282 |
| Appoquinimink Public Library | DE | LibCal-DE | 103 |
| Bear Library | DE | LibCal-DE | 182 |
| Brandywine Hundred Library | DE | LibCal-DE | 26 |
| Bridgeville Public Library | DE | LibCal-DE | 68 |
| Claymont Library | DE | LibCal-DE | 30 |
| Delaware Libraries | DE | LibCal-DE | 20 |
| Boone County Public Library | KY | LibCal-KY | 0 |
| Clay County Public Library | KY | LibCal-KY | 20 |
| Kenton County Public Library | KY | LibCal-KY | 0 |
| Warren County Public Library | KY | LibCal-KY | 0 |
| Alamance County Library | NC | LibCal-NC | 48 |
| Brunswick County Public Library | NC | LibCal-NC | 10 |
| Craven-Pamlico Regional Library | NC | LibCal-NC | 0 |
| Durham County Library | NC | LibCal-NC | 20 |
| Gaston County Public Library | NC | LibCal-NC | 20 |
| Henderson County Public Library | NC | LibCal-NC | 5 |
| Iredell County Public Library | NC | LibCal-NC | 48 |
| New Hanover County Public Library | NC | LibCal-NC | 20 |
| Union County Public Library | NC | LibCal-NC | 25 |
| Concord Public Library | — | LibCal-NH | 45 |
| Hollis Social Library | — | LibCal-NH | 48 |
| Hooksett Public Library | — | LibCal-NH | 48 |
| Keene Public Library | — | LibCal-NH | 48 |
| Lebanon Public Libraries | — | LibCal-NH | 48 |
| Manchester City Library | — | LibCal-NH | 48 |
| Merrimack Public Library | — | LibCal-NH | 48 |
| Nashua Public Library | — | LibCal-NH | 48 |
| Pelham Public Library | — | LibCal-NH | 48 |
| Baldwin Public Library | NY | LibCal-NY2 | 0 |
| East Meadow Public Library | NY | LibCal-NY2 | 20 |
| Freeport Memorial Library | NY | LibCal-NY2 | 20 |
| Levittown Public Library | NY | LibCal-NY2 | 169 |
| North Bellmore Public Library | NY | LibCal-NY2 | 20 |
| North Merrick Public Library | NY | LibCal-NY2 | 20 |
| Oceanside Public Library | NY | LibCal-NY2 | 20 |
| Plainview-Old Bethpage Public Library | NY | LibCal-NY2 | 154 |
| Rockville Centre Public Library | NY | LibCal-NY2 | 20 |
| Wantagh Public Library | NY | LibCal-NY2 | 20 |
| Barrington Public Library | RI | LibCal-RI | 20 |
| Cranston Public Library | RI | LibCal-RI | 20 |
| Cumberland Public Library | RI | LibCal-RI | 25 |
| East Providence Public Library | RI | LibCal-RI | 20 |
| Newport Public Library | RI | LibCal-RI | 20 |
| North Kingstown Free Library | RI | LibCal-RI | 0 |
| Pawtucket Public Library | RI | LibCal-RI | 10 |
| Warwick Public Library | RI | LibCal-RI | 20 |
| West Warwick Public Library | RI | LibCal-RI | 20 |
| Amherst County Public Library | VA | LibraryCalendar-Libraries | 21 |
| Appomattox Regional Library | VA | LibraryCalendar-Libraries | 15 |
| Atlantic County Library System | NJ | LibraryCalendar-Libraries | 24 |
| Bedford Public Library System | VA | LibraryCalendar-Libraries | 19 |
| Bloomingdale Public Library | IL | LibraryCalendar-Libraries | 16 |
| Caroline County Public Library | MD | LibraryCalendar-Libraries | 17 |
| Cumberland County Public Library | NC | LibraryCalendar-Libraries | 21 |
| Essex Public Library | VA | LibraryCalendar-Libraries | 16 |
| Forsyth County Public Library | NC | LibraryCalendar-Libraries | 23 |
| Frederick County Public Libraries | MD | LibraryCalendar-Libraries | 16 |
| Gloucester County Library System | NJ | LibraryCalendar-Libraries | 19 |
| Howard County Library System | MD | LibraryCalendar-Libraries | 19 |
| Jessamine County Public Library | KY | LibraryCalendar-Libraries | 21 |
| Lynchburg Public Library | VA | LibraryCalendar-Libraries | 17 |
| Petersburg Public Library | VA | LibraryCalendar-Libraries | 8 |
| Poquoson Public Library | VA | LibraryCalendar-Libraries | 18 |
| Portsmouth Public Library | VA | LibraryCalendar-Libraries | 20 |
| Powhatan County Public Library | VA | LibraryCalendar-Libraries | 15 |
| Talbot County Free Library | MD | LibraryCalendar-Libraries | 21 |
| Waynesboro Public Library | VA | LibraryCalendar-Libraries | 16 |
| York County Library | SC | LibraryCalendar-Libraries | 20 |
| York County Public Library | VA | LibraryCalendar-Libraries | 21 |
| Fairfield Public Library | — | LibraryMarket-CT | 112 |
| Ferguson Library | — | LibraryMarket-CT | 24 |
| Meriden Public Library | — | LibraryMarket-CT | 5 |
| New Britain Public Library | — | LibraryMarket-CT | 22 |
| West Hartford Public Library | — | LibraryMarket-CT | 34 |
| Beaufort County Library | — | LibraryMarket-SC | 32 |
| Sumter County Library | — | LibraryMarket-SC | 4 |
| Spartanburg County Public Libraries | SC | Trumba-Spartanburg | 595 |
| Academy of Natural Sciences | PA | Venue-Events-ScienceArts | 10 |
| Adler Planetarium | IL | Venue-Events-ScienceArts | 7 |
| American Museum of Natural History | NY | Venue-Events-ScienceArts | 12 |
| Art Institute of Chicago | IL | Venue-Events-ScienceArts | 0 |
| Bishop Museum of Science & Nature | FL | Venue-Events-ScienceArts | 21 |
| Connecticut Science Center | CT | Venue-Events-ScienceArts | 21 |
| Conner Prairie Living History | IN | Venue-Events-ScienceArts | 7 |
| Corning Museum of Glass | NY | Venue-Events-ScienceArts | 83 |
| EcoTarium | MA | Venue-Events-ScienceArts | 96 |
| Fernbank Museum of Natural History | GA | Venue-Events-ScienceArts | 0 |
| Field Museum | IL | Venue-Events-ScienceArts | 1 |
| Franklin Institute | PA | Venue-Events-ScienceArts | 0 |
| Frost Science Museum | FL | Venue-Events-ScienceArts | 44 |
| Great Lakes Science Center | OH | Venue-Events-ScienceArts | 6 |
| Griffin Museum of Science and Industry | IL | Venue-Events-ScienceArts | 0 |
| Henry Ford Museum | MI | Venue-Events-ScienceArts | 1 |
| Imagination Station | OH | Venue-Events-ScienceArts | 0 |
| Impression 5 Science Center | MI | Venue-Events-ScienceArts | 1 |
| Indiana State Museum | IN | Venue-Events-ScienceArts | 14 |
| Intrepid Sea Air & Space Museum | NY | Venue-Events-ScienceArts | 0 |
| Kamin Science Center | PA | Venue-Events-ScienceArts | 0 |
| Kennedy Space Center Visitor Complex | FL | Venue-Events-ScienceArts | 62 |
| Maryland Science Center | MD | Venue-Events-ScienceArts | 8 |
| McAuliffe-Shepard Discovery Center | NH | Venue-Events-ScienceArts | 1 |
| Michigan Science Center | MI | Venue-Events-ScienceArts | 12 |
| Milwaukee Art Museum | WI | Venue-Events-ScienceArts | 20 |
| Museum of Science & Industry | FL | Venue-Events-ScienceArts | 1 |
| Museum of Science Boston | MA | Venue-Events-ScienceArts | 1 |
| National Building Museum | DC | Venue-Events-ScienceArts | 0 |
| NC Museum of Natural Sciences | NC | Venue-Events-ScienceArts | 20 |
| New York Hall of Science | NY | Venue-Events-ScienceArts | 1 |
| Science Museum of Virginia | VA | Venue-Events-ScienceArts | 7 |
| Smithsonian Air & Space Museum | DC | Venue-Events-ScienceArts | 10 |
| Smithsonian Natural History Museum | DC | Venue-Events-ScienceArts | 32 |
| Tellus Science Museum | GA | Venue-Events-ScienceArts | 13 |
| Tennessee State Museum | TN | Venue-Events-ScienceArts | 1 |
| Virginia Museum of Natural History | VA | Venue-Events-ScienceArts | 6 |
| Yale Peabody Museum | CT | Venue-Events-ScienceArts | 1 |
| ABBE Regional Library System | SC | WordPress-Abbe-Regional | 19 |
| Abbeville Memorial Library | — | WordPress-AL | 7 |
| Akron Public Library | AL | WordPress-AL | 0 |
| Andalusia Public Library | — | WordPress-AL | 0 |
| Athens-Limestone Public Library | — | WordPress-AL | 0 |
| Auburn Public Library | — | WordPress-AL | 1 |
| Birmingham Public Library | — | WordPress-AL | 1 |
| Blanche R. Solomon Memorial Library | — | WordPress-AL | 0 |
| Bridgeport - Lena Cagle Public Library | AL | WordPress-AL | 0 |
| Burchell Campbell Memorial Library | AL | WordPress-AL | 0 |
| Butler County Public Library | AL | WordPress-AL | 0 |
| Chelsea Public Library | AL | WordPress-AL | 0 |
| Choctaw County Public Library | AL | WordPress-AL | 0 |
| City Of Bayou La Batre Public Library | — | WordPress-AL | 0 |
| Clay Public Library | — | WordPress-AL | 0 |
| Collinsville Public Library | — | WordPress-AL | 0 |
| Daleville Public Library | — | WordPress-AL | 1 |
| Daphne Public Library | — | WordPress-AL | 0 |
| Decatur Public Library | — | WordPress-AL | 33 |
| Doris Stanley Memorial Library | — | WordPress-AL | 1 |
| Dothan Houston County Library System | — | WordPress-AL | 76 |
| Evergreen Public Library | — | WordPress-AL | 0 |
| Fairhope Public Library | — | WordPress-AL | 150 |
| Florence-Lauderdale Public Library | — | WordPress-AL | 0 |
| Foley Public Library | — | WordPress-AL | 0 |
| Gardendale Public Library | — | WordPress-AL | 1 |
| Grant Public Library | — | WordPress-AL | 0 |
| Guntersville Public Library | — | WordPress-AL | 0 |
| H. Grady Bradshaw - Chambers County Library | — | WordPress-AL | 1 |
| Hale County Library | AL | WordPress-AL | 0 |
| Hartford - Mcgregor-Mckinney Public Library | AL | WordPress-AL | 0 |
| Hoover Public Library | — | WordPress-AL | 5 |
| Houston-Love Memorial Library - Columbia | AL | WordPress-AL | 0 |
| Hueytown Public Library | — | WordPress-AL | 0 |
| Huntsville-Madison County Public Library | — | WordPress-AL | 12 |
| Irondale Public Library | — | WordPress-AL | 0 |
| Jane B. Holmes Public Library | — | WordPress-AL | 0 |
| Jane Culbreth Library | — | WordPress-AL | 0 |
| Jefferson County Library Cooperative | — | WordPress-AL | 0 |
| Kennedy Public Library | AL | WordPress-AL | 0 |
| Lafayette Pilot Public Library | — | WordPress-AL | 0 |
| Leighton Public Library | — | WordPress-AL | 21 |
| Madison Public Library | AL | WordPress-AL | 0 |
| Marion-Perry County Library | AL | WordPress-AL | 0 |
| Millbrook Public Library | AL | WordPress-AL | 0 |
| Mobile Public Library | — | WordPress-AL | 32 |
| Montgomery City-County Public Library | — | WordPress-AL | 17 |
| Newton Public Library | AL | WordPress-AL | 0 |
| Northwest Regional Library | — | WordPress-AL | 0 |
| Opp Public Library | — | WordPress-AL | 0 |
| Orange Beach Public Library | — | WordPress-AL | 0 |
| Piedmont Public Library | AL | WordPress-AL | 0 |
| Ruby Pickens Tartt Public Library | AL | WordPress-AL | 0 |
| Satsuma Public Library | — | WordPress-AL | 0 |
| Scottsboro Public Library | — | WordPress-AL | 0 |
| Selma-Dallas County Public Library | — | WordPress-AL | 1 |
| Sheffield Public Library | AL | WordPress-AL | 0 |
| Stevenson Public Library | — | WordPress-AL | 0 |
| Trussville Public Library | — | WordPress-AL | 4 |
| Tuscaloosa Public Library | — | WordPress-AL | 150 |
| Vernon - Mary Wallace Cobb Memorial Library | AL | WordPress-AL | 0 |
| Vestavia Hills Library | — | WordPress-AL | 150 |
| Walter J. Hanna Memorial Library | — | WordPress-AL | 0 |
| Warrior Public Library | — | WordPress-AL | 0 |
| Wilcox County Library | AL | WordPress-AL | 0 |
| Wilsonville - Vernice Stoudenmire Library | — | WordPress-AL | 87 |
| Andover Public Library | CT | WordPress-CT | 0 |
| Ansonia Public Library | CT | WordPress-CT | 0 |
| Beacon Falls Public Library | CT | WordPress-CT | 0 |
| Beardsley Memorial Library | CT | WordPress-CT | 0 |
| Bethel Public Library | CT | WordPress-CT | 0 |
| Bethlehem Public Library | CT | WordPress-CT | 0 |
| Bill Library | CT | WordPress-CT | 1 |
| Bridgeport Public Library | CT | WordPress-CT | 16 |
| Bristol Public Library | CT | WordPress-CT | 222 |
| Brookfield Library | CT | WordPress-CT | 93 |
| Canterbury Public Library | CT | WordPress-CT | 0 |
| Cheshire Public Library | CT | WordPress-CT | 2 |
| Chester Public Library | CT | WordPress-CT | 0 |
| Clark Memorial Library | CT | WordPress-CT | 10 |
| Community Branch Library | CT | WordPress-CT | 1 |
| Cornwall Library Association | CT | WordPress-CT | 18 |
| Cyrenius H. Booth Library | CT | WordPress-CT | 0 |
| Danbury Public Library | CT | WordPress-CT | 0 |
| Darien Library | CT | WordPress-CT | 19 |
| Douglas Library Of Hebron | CT | WordPress-CT | 0 |
| Durham Public Library | CT | WordPress-CT | 44 |
| E.C. Scranton Memorial Library | CT | WordPress-CT | 0 |
| East Hampton Public Library | CT | WordPress-CT | 0 |
| East Hartford Public Library | CT | WordPress-CT | 0 |
| Easton Public Library | CT | WordPress-CT | 0 |
| Edith Wheeler Memorial Library | CT | WordPress-CT | 0 |
| Enfield Public Library | CT | WordPress-CT | 6 |
| Essex Library Association | CT | WordPress-CT | 0 |
| Fairfield Public Library | CT | WordPress-CT | 81 |
| Farmington Library | CT | WordPress-CT | 0 |
| Frederick H. Cossitt Library | CT | WordPress-CT | 0 |
| Goshen Public Library | CT | WordPress-CT | 0 |
| Greenwich Library | CT | WordPress-CT | 0 |
| Hartford Public Library | CT | WordPress-CT | 0 |
| Hartland Public Library | CT | WordPress-CT | 0 |
| Harwinton Public Library | CT | WordPress-CT | 106 |
| Henry Carter Hull Library | CT | WordPress-CT | 0 |
| Ivoryton Library Association | CT | WordPress-CT | 0 |
| Janet Carlson Calvert Library | CT | WordPress-CT | 0 |
| Jonathan Trumbull Library | CT | WordPress-CT | 0 |
| Kent Library Association | CT | WordPress-CT | 65 |
| Kent Memorial Library | CT | WordPress-CT | 0 |
| Killingworth Library | CT | WordPress-CT | 0 |
| Louis Piantino Branch Library | CT | WordPress-CT | 0 |
| Manchester Public Library | CT | WordPress-CT | 9 |
| Middlebury Public Library | CT | WordPress-CT | 24 |
| Middletown Public Library | CT | WordPress-CT | 1 |
| Milford Public Library | CT | WordPress-CT | 0 |
| Minor Memorial Library | CT | WordPress-CT | 46 |
| Mystic Noank Library | CT | WordPress-CT | 0 |
| New Britain Public Library | CT | WordPress-CT | 58 |
| New Canaan Library | CT | WordPress-CT | 79 |
| New Fairfield Free Public Library | CT | WordPress-CT | 6 |
| New Haven Free Public Library | CT | WordPress-CT | 1 |
| New Milford Public Library | CT | WordPress-CT | 1 |
| Norfolk Library | CT | WordPress-CT | 12 |
| North Haven Memorial Library | CT | WordPress-CT | 0 |
| Norwalk Public Library | CT | WordPress-CT | 3 |
| Oakville Branch Library | CT | WordPress-CT | 0 |
| Old Lyme - Phoebe Griffin Noyes Library | CT | WordPress-CT | 0 |
| Otis Library | CT | WordPress-CT | 39 |
| Pequot Library Association | CT | WordPress-CT | 0 |
| Plainville Public Library | CT | WordPress-CT | 0 |
| Pomfret Public Library | CT | WordPress-CT | 0 |
| Preston Public Library | CT | WordPress-CT | 1 |
| Public Library Of New London | CT | WordPress-CT | 0 |
| Ridgefield Library | CT | WordPress-CT | 10 |
| Salem Free Public Library | CT | WordPress-CT | 0 |
| Saxton B. Little Free Library | CT | WordPress-CT | 0 |
| Scoville Memorial Library | CT | WordPress-CT | 0 |
| Shelton Public Library | CT | WordPress-CT | 34 |
| Sherman Library Assn. | CT | WordPress-CT | 1 |
| South Windsor Public Library | CT | WordPress-CT | 67 |
| Southbury Public Library | CT | WordPress-CT | 62 |
| Southington Public Library | CT | WordPress-CT | 0 |
| Stafford Library Association | CT | WordPress-CT | 1 |
| Stonington Free Library | CT | WordPress-CT | 0 |
| Stratford Library | CT | WordPress-CT | 1 |
| Thomaston Public Library | CT | WordPress-CT | 0 |
| Torrington Library | CT | WordPress-CT | 0 |
| Trumbull Library | CT | WordPress-CT | 0 |
| Union Free Public Library | CT | WordPress-CT | 0 |
| Vernon Public Library | CT | WordPress-CT | 0 |
| Wallingford Public Library | CT | WordPress-CT | 29 |
| Warren Public Library | CT | WordPress-CT | 0 |
| Waterbury Public Library | CT | WordPress-CT | 0 |
| Waterford Public Library | CT | WordPress-CT | 0 |
| West Hartford Public Library | CT | WordPress-CT | 72 |
| Westbrook Public Library | CT | WordPress-CT | 117 |
| Westport Library | CT | WordPress-CT | 15 |
| Willimantic Public Library | CT | WordPress-CT | 19 |
| Wilson Branch Library | CT | WordPress-CT | 0 |
| Wilton Library Association | CT | WordPress-CT | 1 |
| Windham Free Library | CT | WordPress-CT | 10 |
| Windsor Locks Public Library | CT | WordPress-CT | 0 |
| Wolcott Public Library | CT | WordPress-CT | 1 |
| Woodbury Public Library | CT | WordPress-CT | 0 |
| Alma-Bacon County Public Library | GA | WordPress-GA | 4 |
| Appleby Branch | GA | WordPress-GA | 1 |
| Athens Regional Library System | GA | WordPress-GA | 39 |
| Baker County | GA | WordPress-GA | 0 |
| Boston Carnegie Library | GA | WordPress-GA | 20 |
| Bowman Branch | GA | WordPress-GA | 34 |
| Brooks County Public Library System | GA | WordPress-GA | 0 |
| Brunswick Glynn County Regional Library | GA | WordPress-GA | 1 |
| Butler Public Library | GA | WordPress-GA | 0 |
| Byron Public Library | GA | WordPress-GA | 77 |
| Cedartown Library | GA | WordPress-GA | 10 |
| Centerville Branch Library | GA | WordPress-GA | 0 |
| Chattahoochee Valley Regional Library System | GA | WordPress-GA | 0 |
| Chattooga County Library System | GA | WordPress-GA | 0 |
| Cherokee Regional Library System | GA | WordPress-GA | 1 |
| Clarkesville-Habersham Co. Lib. | GA | WordPress-GA | 0 |
| Clarkston Branch | GA | WordPress-GA | 1 |
| Clermont Library | GA | WordPress-GA | 0 |
| Commerce Public Library | GA | WordPress-GA | 0 |
| Coolidge Public Library | GA | WordPress-GA | 0 |
| Cornelia-Habersham Co. Lib. | GA | WordPress-GA | 1 |
| Covington Branch | GA | WordPress-GA | 2 |
| Dalton-Whitfield County Public Library | GA | WordPress-GA | 0 |
| Douglas-Coffee County Public Library | GA | WordPress-GA | 0 |
| Duluth | GA | WordPress-GA | 0 |
| Effingham | GA | WordPress-GA | 0 |
| Elizabeth Harris Library | GA | WordPress-GA | 0 |
| Gibbs Memorial Library | GA | WordPress-GA | 0 |
| Gordon Public Library | GA | WordPress-GA | 0 |
| Grantville Public Library | GA | WordPress-GA | 3 |
| Greene County Library | GA | WordPress-GA | 0 |
| Greenville Area Public Library | GA | WordPress-GA | 0 |
| Hancock County Library | GA | WordPress-GA | 0 |
| Harlie Fulford Memorial Library | GA | WordPress-GA | 0 |
| Heard County Public Library | GA | WordPress-GA | 0 |
| Hickory Flat Public Library | GA | WordPress-GA | 0 |
| Hightower Memorial Library | GA | WordPress-GA | 0 |
| Houston County Public Libraries System | GA | WordPress-GA | 0 |
| Ida Hilton Public Library | GA | WordPress-GA | 0 |
| Jefferson County Library System | GA | WordPress-GA | 1 |
| Lagrange Memorial Library | GA | WordPress-GA | 0 |
| Lake Sinclair Library | GA | WordPress-GA | 0 |
| Laurens County Library | GA | WordPress-GA | 0 |
| Lewis A. Ray Library | GA | WordPress-GA | 0 |
| Marion County Library | GA | WordPress-GA | 0 |
| Meigs Public Library | GA | WordPress-GA | 4 |
| Middle Georgia Regional Library System | GA | WordPress-GA | 0 |
| Miller Lakeland Library | GA | WordPress-GA | 1 |
| Monroe County Library | GA | WordPress-GA | 0 |
| Monroe-Walton County Library | GA | WordPress-GA | 0 |
| Morgan County Library | GA | WordPress-GA | 0 |
| Nelle Brown Memorial Public Library | GA | WordPress-GA | 0 |
| New Georgia Public Library | GA | WordPress-GA | 10 |
| Oglethorpe County Library | GA | WordPress-GA | 0 |
| Parks Memorial Library | GA | WordPress-GA | 0 |
| Riverdale Branch Library | GA | WordPress-GA | 0 |
| Rockmart Library | GA | WordPress-GA | 0 |
| Rossville Public Library | GA | WordPress-GA | 0 |
| Scottdale-Tobie Grant Branch | GA | WordPress-GA | 0 |
| Senoia Area Public Library | GA | WordPress-GA | 3 |
| Thomson-Mcduffie County Library | GA | WordPress-GA | 0 |
| Warren P. Sewell Memorial Library-Bremen | GA | WordPress-GA | 14 |
| Wayne County Library | GA | WordPress-GA | 1 |
| Wheeler County Library | GA | WordPress-GA | 2 |
| White County Public Library-Cleveland Branch | GA | WordPress-GA | 0 |
| Wilcox County Public Library | GA | WordPress-GA | 20 |
| Alleghany County Public Library | NC | WordPress-NC | 0 |
| Bath Community Library | NC | WordPress-NC | 0 |
| Beatties Ford Road Branch Library | NC | WordPress-NC | 1 |
| Belmont Branch Library | NC | WordPress-NC | 16 |
| Black Creek Branch Library | NC | WordPress-NC | 50 |
| Blanche Benjamin Branch Library | NC | WordPress-NC | 0 |
| Boonville Community Public Library | NC | WordPress-NC | 0 |
| Brunswick County Library | NC | WordPress-NC | 0 |
| Bunn Branch Library | NC | WordPress-NC | 0 |
| Carver Branch Library | NC | WordPress-NC | 0 |
| Cary Branch Library | NC | WordPress-NC | 4 |
| Catawba County Library | NC | WordPress-NC | 2 |
| Claremont Branch Library | NC | WordPress-NC | 2 |
| Cleveland County Memorial Library | NC | WordPress-NC | 0 |
| Craven-Pamlico-Carteret Regional Library | NC | WordPress-NC | 4 |
| Dallas Branch Library | NC | WordPress-NC | 16 |
| Danbury Public Library | NC | WordPress-NC | 0 |
| Davidson County Public Library System | NC | WordPress-NC | 0 |
| Dobson Community Library | NC | WordPress-NC | 0 |
| East Branch Library | NC | WordPress-NC | 50 |
| Farmville Public Library | NC | WordPress-NC | 0 |
| Florence S. Shanklin Branch Library | NC | WordPress-NC | 31 |
| Franklin County Library | NC | WordPress-NC | 7 |
| Graham Public Library | NC | WordPress-NC | 0 |
| Harmony Branch Library | NC | WordPress-NC | 0 |
| Havelock-Craven County Public | NC | WordPress-NC | 0 |
| Hazel W. Guilford Memorial Library | NC | WordPress-NC | 0 |
| Hickory Public Library | NC | WordPress-NC | 0 |
| Hudson Branch Library | NC | WordPress-NC | 0 |
| J.C. Holliday Library | NC | WordPress-NC | 0 |
| John W. Clark Public Library | NC | WordPress-NC | 0 |
| King Public Library | NC | WordPress-NC | 1 |
| La Grange Branch Library | NC | WordPress-NC | 0 |
| Lawrence Memorial Library | NC | WordPress-NC | 0 |
| Leland Branch Library | NC | WordPress-NC | 0 |
| Littleton Public Library (Wc Jones Memorial) | NC | WordPress-NC | 0 |
| Lowell Branch Library | NC | WordPress-NC | 16 |
| Macon County Public Library | NC | WordPress-NC | 0 |
| Madison Branch Library | NC | WordPress-NC | 0 |
| Madison County Public Library | NC | WordPress-NC | 0 |
| Margaret Little Blount Library | NC | WordPress-NC | 0 |
| Mary Duncan Public Library | NC | WordPress-NC | 0 |
| Mcdowell County Law Library | NC | WordPress-NC | 0 |
| Mooresville Public Library | NC | WordPress-NC | 1 |
| Myrtle Grove Branch | NC | WordPress-NC | 10 |
| Norwood Branch Library | NC | WordPress-NC | 0 |
| Pettigrew Regional Library | NC | WordPress-NC | 0 |
| Polk County Public Library | NC | WordPress-NC | 0 |
| Princeton Public Library | NC | WordPress-NC | 0 |
| Public Library Of Johnston County Smithfield | NC | WordPress-NC | 0 |
| Roanoke Rapids Public Library | NC | WordPress-NC | 4 |
| Rowan Public Library | NC | WordPress-NC | 0 |
| Selma Public Library | NC | WordPress-NC | 0 |
| Spring Lake Branch | NC | WordPress-NC | 0 |
| Stanley Branch Library | NC | WordPress-NC | 16 |
| Star Branch | NC | WordPress-NC | 0 |
| Tyrrell County Library | NC | WordPress-NC | 0 |
| Union County Public Library | NC | WordPress-NC | 0 |
| Union West Branch Library | NC | WordPress-NC | 0 |
| Warsaw-Kornegay Public Library | NC | WordPress-NC | 0 |
| Watauga County Public Library | NC | WordPress-NC | 0 |
| Wayne County Public Library, Fremont | NC | WordPress-NC | 5 |
| Adams Memorial Library | — | WordPress-TN | 1 |
| Alexandria Branch Library | — | WordPress-TN | 0 |
| Athens Public Library | — | WordPress-TN | 1 |
| Auburntown Public Library | — | WordPress-TN | 1 |
| Audrey Pack Memorial Library | TN | WordPress-TN | 0 |
| Bartlett Library | — | WordPress-TN | 0 |
| Baxter Branch Library | TN | WordPress-TN | 0 |
| Benton County Library | TN | WordPress-TN | 0 |
| Blount County Public Library | — | WordPress-TN | 0 |
| Carroll County Library | TN | WordPress-TN | 0 |
| Chattanooga Public Library | — | WordPress-TN | 150 |
| Clarksville-Montgomery County Public Library | — | WordPress-TN | 0 |
| Cleveland-Bradley County Public Library | — | WordPress-TN | 1 |
| Clinton Public Library | TN | WordPress-TN | 0 |
| Collierville Burch Library | — | WordPress-TN | 0 |
| Crockett County Library | — | WordPress-TN | 1 |
| Crossville-Cumberland County Public Library | — | WordPress-TN | 0 |
| Franklin County Public Library | TN | WordPress-TN | 0 |
| Franklin Public Library | — | WordPress-TN | 0 |
| Germantown Community Library | TN | WordPress-TN | 0 |
| Gleason Memorial Library | — | WordPress-TN | 0 |
| Hamilton Parks Public Library | — | WordPress-TN | 1 |
| Harriman Public Library | — | WordPress-TN | 0 |
| Hendersonville Public Library | — | WordPress-TN | 0 |
| Hickman County Public Library | — | WordPress-TN | 0 |
| Humphreys County Public Library | — | WordPress-TN | 0 |
| Johnson City Public Library | — | WordPress-TN | 21 |
| Kingsport Public Library | — | WordPress-TN | 0 |
| Kingston Public Library | TN | WordPress-TN | 0 |
| Knox County Public Library | — | WordPress-TN | 21 |
| Lauderdale County Library | — | WordPress-TN | 53 |
| Madisonville Public Library | — | WordPress-TN | 0 |
| Mary E. Tippitt Memorial Library | TN | WordPress-TN | 0 |
| Meigs-Decatur Public Library | — | WordPress-TN | 1 |
| Memphis Public Libraries | — | WordPress-TN | 29 |
| Middleton Community Library | — | WordPress-TN | 0 |
| Mildred G. Fields Memorial Library | TN | WordPress-TN | 0 |
| Millard Oakley Public Library | TN | WordPress-TN | 0 |
| Monterey Branch Library | TN | WordPress-TN | 0 |
| Morristown-Hamblen Library | — | WordPress-TN | 0 |
| Mt. Juliet-Harvey Freeman Public Library | — | WordPress-TN | 0 |
| Nashville Public Library | — | WordPress-TN | 1 |
| Nashville Talking Library | TN | WordPress-TN | 0 |
| Newbern City Library | — | WordPress-TN | 0 |
| Parsons Public Library | — | WordPress-TN | 0 |
| Rogersville Public Library | — | WordPress-TN | 0 |
| Rutherford County Library System | — | WordPress-TN | 0 |
| Sam T. Wilson Public Library | TN | WordPress-TN | 0 |
| Savannah-Hardin County Library | — | WordPress-TN | 1 |
| Sequatchie County Public Library | TN | WordPress-TN | 0 |
| Sevier County Public Library System | — | WordPress-TN | 0 |
| Smyrna Public Library | TN | WordPress-TN | 0 |
| Southeast Branch Library | — | WordPress-TN | 0 |
| Spring Hill Public Library | — | WordPress-TN | 0 |
| Sweetwater Public Library | — | WordPress-TN | 1 |
| The Brentwood Library | TN | WordPress-TN | 0 |
| Tipton County Public Library | — | WordPress-TN | 0 |
| Tullahoma Public Library | — | WordPress-TN | 0 |
| Washburn Public Library | — | WordPress-TN | 1 |
| Westmoreland Public Library | — | WordPress-TN | 0 |
| White County Public Library | TN | WordPress-TN | 0 |
| White Pine Public Library | — | WordPress-TN | 1 |
| Winfield Public Library | — | WordPress-TN | 0 |
| Alexandria Library | — | WordPress-VA | 0 |
| Chesapeake Public Library | — | WordPress-VA | 0 |
| Culpeper County Library | — | WordPress-VA | 22 |
| Jefferson-Madison Regional Library | — | WordPress-VA | 0 |
| Manassas Park City Library | — | WordPress-VA | 10 |
| Ainsworth Public | VT | WordPress-VT | 0 |
| Aldrich Public Library | VT | WordPress-VT | 0 |
| Barton Public | VT | WordPress-VT | 0 |
| Bennington Free | VT | WordPress-VT | 1 |
| Benson Public | VT | WordPress-VT | 0 |
| Bent Northrup Memorial | VT | WordPress-VT | 1 |
| Bethel Public | VT | WordPress-VT | 0 |
| Bradford Public | VT | WordPress-VT | 0 |
| Brandon Free Public | VT | WordPress-VT | 0 |
| Brooks Memorial Library | VT | WordPress-VT | 150 |
| Brownell Library | VT | WordPress-VT | 150 |
| Butterfield | VT | WordPress-VT | 0 |
| Cabot Public | VT | WordPress-VT | 0 |
| Charlotte | VT | WordPress-VT | 70 |
| Chelsea Public | VT | WordPress-VT | 0 |
| Cobleigh Public Library | VT | WordPress-VT | 0 |
| Cornwall Free Public | VT | WordPress-VT | 0 |
| Cutler Memorial | VT | WordPress-VT | 0 |
| Deborah Rawson Memorial Library | VT | WordPress-VT | 7 |
| Essex Free | VT | WordPress-VT | 0 |
| Fair Haven Free | VT | WordPress-VT | 0 |
| Fairfax Community | VT | WordPress-VT | 1 |
| Fletcher Free Library | VT | WordPress-VT | 4 |
| Franklin-Grand Isle Bookmobile | VT | WordPress-VT | 113 |
| G. M. Kelley Community | VT | WordPress-VT | 0 |
| Gilman Public Library | VT | WordPress-VT | 0 |
| Glover Public | VT | WordPress-VT | 0 |
| Greensboro Free | VT | WordPress-VT | 0 |
| Hancock Free Public | VT | WordPress-VT | 1 |
| Hartford | VT | WordPress-VT | 0 |
| Hartland Public Library | VT | WordPress-VT | 0 |
| Haskell Free Library | VT | WordPress-VT | 0 |
| Haston | VT | WordPress-VT | 0 |
| Hitchcock Museum | VT | WordPress-VT | 0 |
| Huntington Public | VT | WordPress-VT | 0 |
| Ilsley Public Library | VT | WordPress-VT | 17 |
| Jaquith Public | VT | WordPress-VT | 0 |
| Kellogg-Hubbard Library | VT | WordPress-VT | 109 |
| Lanpher Memorial | VT | WordPress-VT | 1 |
| Latham Memorial | VT | WordPress-VT | 1 |
| Martha Canfield Memorial | VT | WordPress-VT | 0 |
| Moore Free | VT | WordPress-VT | 0 |
| Morrill Mem. Harris | VT | WordPress-VT | 0 |
| Morristown Centennial Library | VT | WordPress-VT | 0 |
| Mount Holly | VT | WordPress-VT | 0 |
| Norman Williams Public Library | VT | WordPress-VT | 150 |
| North Hero Public | VT | WordPress-VT | 1 |
| Norwich Public | VT | WordPress-VT | 1 |
| Peacham | VT | WordPress-VT | 2 |
| Pettee Memorial | VT | WordPress-VT | 1 |
| Pierson Library | VT | WordPress-VT | 9 |
| Pope Memorial | VT | WordPress-VT | 0 |
| Proctor Free | VT | WordPress-VT | 0 |
| Putney Public | VT | WordPress-VT | 42 |
| Quechee | VT | WordPress-VT | 6 |
| Reading Public | VT | WordPress-VT | 1 |
| Readsboro Community | VT | WordPress-VT | 0 |
| Rochester Public | VT | WordPress-VT | 0 |
| Rockingham Free Public Library | VT | WordPress-VT | 12 |
| Roxbury Free | VT | WordPress-VT | 0 |
| Russell Memorial | VT | WordPress-VT | 1 |
| Salisbury Free Public | VT | WordPress-VT | 0 |
| Sheldon Public | VT | WordPress-VT | 0 |
| Shrewsbury | VT | WordPress-VT | 0 |
| Springfield Town Library | VT | WordPress-VT | 2 |
| St. Johnsbury Athenaeum | VT | WordPress-VT | 3 |
| Stamford Community | VT | WordPress-VT | 0 |
| Stowe Free | VT | WordPress-VT | 0 |
| Tenney Memorial | VT | WordPress-VT | 0 |
| Tunbridge Public | VT | WordPress-VT | 34 |
| Vernon Free | VT | WordPress-VT | 0 |
| Warren Public | VT | WordPress-VT | 0 |
| West Hartford | VT | WordPress-VT | 0 |
| Westminster West Public | VT | WordPress-VT | 0 |
| Whiting | VT | WordPress-VT | 0 |
| Windham Town | VT | WordPress-VT | 2 |
| Windsor Public | VT | WordPress-VT | 0 |
| Woodbury Community | VT | WordPress-VT | 1 |

### Note — 2026-08-26 (no library rows; deliberately NOT a dated section)

This is a subsection rather than a `## 2026-08-26` heading on purpose. A dated section is a DATA section: `loadSites()` parses the newest one to project the report, so a dated heading with no table underneath yields 0 rows and makes the whole section invisible to `generate-site-report.js`. `preflight-diagnosis.js` fails on exactly that shape, and it did when this note was first written as a dated section. The newest parseable dated section therefore stays `## 2026-08-25`.

**No new library-website rows today, and this is a rotation fact rather than a gap in the audit.** The only scrapers that completed in today's window were the nine MacaroniKid Group 1 state scrapers (PA, NC, MA, TN, AL, KY, RI, DC, WV), which finished at 09:04Z after running 15.5h. MacaroniKid is not one of the library families this step inventories, so it contributes no rows here; its per-site data is in `AGE-RANGE-AUDIT.md` under the same date.

Every library scraper from the 2026-08-25 Group 1 rotation was already recorded in the `## 2026-08-25` section above, including the two post-fix corrections (`BiblioCommons-KY` 407, `WordPress-Abbe-Regional` 19).

**Today's scheduled rotation did not run at all.** The 2026-08-25 Group 1 run occupied 26 hours (03:00 on 08-25 to 09:04 on 08-26), so when `FunHive-Scrapers` fired at 03:00 today, Task Scheduler's `MultipleInstances: IgnoreNew` policy discarded the new instance silently — `LastTaskResult` still reads 0. Group 2 therefore contributed nothing to this cycle today. This is the third occurrence of the pattern (2026-08-14 and 2026-08-17 have no run log for the same reason), and it is the condition `scrapers/helpers/group-catchup.js` exists to recover from: Group 2 is now 5.0 days starved, past the 4-day threshold, so tomorrow's run will select Group 2 instead of the calendar's Group 3. Verified directly against `selectGroup()` — see today's diagnosis report.

**Cycle-completion check: not complete.** No new library scrapers were added today, so the cycle stands exactly where the `## 2026-08-25` section left it, and no `Cycle complete` marker is added. The Group 2 library scrapers remain the outstanding block; they are expected to land on 2026-08-27 via the catch-up path above.

## 2026-08-27

Group 2 catch-up rotation, started 07:00:01Z. 888 per-site rows from 32 library scrapers with per-site log output; 418 zero-event sites. MacaroniKid Group 2 was still running when this section was built, so its sites land in the next section.

| Library Website | State | Scraper | Events Found |
|---|---|---|---|
| Fulton County Library System | GA | BiblioCommons-GA | 499 |
| Charlotte Mecklenburg Library | NC | BiblioCommons-NC | 498 |
| Homewood Public Library | AL | Communico-AL | 6 |
| Hoover Public Library | AL | Communico-AL | 1 |
| Trussville Public Library | AL | Communico-AL | 2 |
| Chattahoochee Valley Libraries | GA | Communico-GA | 10 |
| Clayton County Library System | GA | Communico-GA | 13 |
| DeKalb County Public Library | GA | Communico-GA | 7 |
| Forsyth County Public Library | GA | Communico-GA | 10 |
| Gwinnett County Public Library | GA | Communico-GA | 24 |
| Henry County Library System | GA | Communico-GA | 10 |
| Anderson Public Library | KY | Communico-KY | 1 |
| Lexington Public Library | KY | Communico-KY | 9 |
| Muhlenberg County Public Libraries | KY | Communico-KY | 2 |
| Pike County Public Library | KY | Communico-KY | 5 |
| Camden County Library System | NJ | Communico-NJ | 0 |
| Cape May County Library | NJ | Communico-NJ | 13 |
| Hoboken Public Library | NJ | Communico-NJ | 8 |
| Middlesex County Library | NJ | Communico-NJ | 11 |
| Ocean County Library | NJ | Communico-NJ | 38 |
| Somerset County Library System | NJ | Communico-NJ | 21 |
| Warren County Library | NJ | Communico-NJ | 2 |
| Pickens County Library | SC | Communico-SC | 7 |
| Anderson County Library System | SC | CustomDrupal-Libraries | 0 |
| Cobb County Public Library System | GA | CustomDrupal-Libraries | 10 |
| Florence County Library System | SC | CustomDrupal-Libraries | 51 |
| Greenville County Library System | SC | CustomDrupal-Libraries | 10 |
| Kanawha County Public Library | WV | CustomDrupal-Libraries | 176 |
| Rowan County Public Library | NC | CustomDrupal-Libraries | 24 |
| Wake County Public Libraries | NC | CustomDrupal-Libraries | 144 |
| Jefferson-Madison Regional Library | VA | EventActions-Libraries | 500 |
| [1/27] Alabama | AL | Festivals-Eastern-US | 20 |
| [10/27] Massachusetts | MA | Festivals-Eastern-US | 20 |
| [11/27] Maryland | MD | Festivals-Eastern-US | 20 |
| [12/27] Maine | ME | Festivals-Eastern-US | 20 |
| [13/27] Michigan | MI | Festivals-Eastern-US | 20 |
| [14/27] Mississippi | MS | Festivals-Eastern-US | 19 |
| [15/27] North Carolina | NC | Festivals-Eastern-US | 20 |
| [16/27] New Hampshire | NH | Festivals-Eastern-US | 20 |
| [17/27] New Jersey | NJ | Festivals-Eastern-US | 20 |
| [18/27] New York | NY | Festivals-Eastern-US | 20 |
| [19/27] Ohio | OH | Festivals-Eastern-US | 20 |
| [2/27] Connecticut | CT | Festivals-Eastern-US | 20 |
| [20/27] Pennsylvania | PA | Festivals-Eastern-US | 20 |
| [21/27] Rhode Island | RI | Festivals-Eastern-US | 20 |
| [22/27] South Carolina | SC | Festivals-Eastern-US | 20 |
| [23/27] Tennessee | TN | Festivals-Eastern-US | 20 |
| [24/27] Virginia | VA | Festivals-Eastern-US | 20 |
| [25/27] Vermont | VT | Festivals-Eastern-US | 21 |
| [26/27] Wisconsin | WI | Festivals-Eastern-US | 20 |
| [27/27] West Virginia | WV | Festivals-Eastern-US | 17 |
| [3/27] District of Columbia | DC | Festivals-Eastern-US | 20 |
| [4/27] Delaware | DE | Festivals-Eastern-US | 19 |
| [5/27] Florida | FL | Festivals-Eastern-US | 20 |
| [6/27] Georgia | GA | Festivals-Eastern-US | 20 |
| [7/27] Illinois | IL | Festivals-Eastern-US | 20 |
| [8/27] Indiana | IN | Festivals-Eastern-US | 20 |
| [9/27] Kentucky | KY | Festivals-Eastern-US | 20 |
| Morris County Library | NJ | Graniculator-Morris | 12 |
| Bridgeport Public Library | CT | LibCal-CT | 10 |
| East Hartford Public Library | CT | LibCal-CT | 20 |
| Greenwich Library | CT | LibCal-CT | 48 |
| Hamden Public Library | CT | LibCal-CT | 48 |
| Hartford Public Library | CT | LibCal-CT | 0 |
| New Haven Free Public Library | CT | LibCal-CT | 20 |
| Silas Bronson Library | CT | LibCal-CT | 0 |
| Stratford Library | CT | LibCal-CT | 20 |
| Wethersfield Public Library | CT | LibCal-CT | 16 |
| Athens-Clarke County Library | GA | LibCal-GA | 5 |
| Auburn Public Library | GA | LibCal-GA | 20 |
| Banks County Public Library | GA | LibCal-GA | 0 |
| Hall County Library System | GA | LibCal-GA | 10 |
| Brookline Public Library | MA | LibCal-MA | 20 |
| Cambridge Public Library | MA | LibCal-MA | 10 |
| Newton Free Library | MA | LibCal-MA | 20 |
| Albany Public Library | NY | LibCal-NY1 | 24 |
| Buffalo & Erie County Public Library | NY | LibCal-NY1 | 20 |
| Garden City Public Library | NY | LibCal-NY1 | 10 |
| Great Neck Library | NY | LibCal-NY1 | 20 |
| Hicksville Public Library | NY | LibCal-NY1 | 20 |
| Long Beach Public Library | NY | LibCal-NY1 | 45 |
| Monroe County Library System | NY | LibCal-NY1 | 20 |
| Northern Onondaga Public Libraries | NY | LibCal-NY1 | 10 |
| Onondaga County Public Libraries | NY | LibCal-NY1 | 20 |
| Suffolk Cooperative Library System | NY | LibCal-NY1 | 11 |
| Westchester Library System | NY | LibCal-NY1 | 20 |
| Bucks County Free Library | PA | LibCal-PA | 25 |
| Chester County Library System | PA | LibCal-PA | 20 |
| Dauphin County Library System | PA | LibCal-PA | 10 |
| Delaware County Library System | PA | LibCal-PA | 20 |
| Easton Area Public Library | PA | LibCal-PA | 48 |
| Erie County Public Library | PA | LibCal-PA | 10 |
| Montgomery County-Norristown Public Library | PA | LibCal-PA | 20 |
| Clarksville-Montgomery County Public Library | TN | LibCal-TN | 48 |
| Memphis Public Libraries | TN | LibCal-TN | 41 |
| Fletcher Free Library | VT | LibCal-VT | 20 |
| Morgantown Public Library | WV | LibCal-WV | 10 |
| Allegany County Library System | — | LibraryMarket | 119 |
| Carroll County Public Library | — | LibraryMarket | 2225 |
| Dallas Public Library | — | LibraryMarket | 120 |
| Lee County Library System | — | LibraryMarket | 120 |
| Pikes Peak Library District | — | LibraryMarket | 120 |
| Rochester Public Library | — | LibraryMarket | 118 |
| Sarasota County Libraries | — | LibraryMarket | 120 |
| Virginia Beach Public Library | — | LibraryMarket | 120 |
| Washington County Free Library | — | LibraryMarket | 120 |
| Augusta-Richmond County Library | — | LibraryMarket-GA | 22 |
| Auburn Public Library | — | LibraryMarket-ME-NH-MA | 24 |
| Portland Public Library | — | LibraryMarket-ME-NH-MA | 22 |
| Rochester Public Library | — | LibraryMarket-ME-NH-MA | 27 |
| Springfield City Library | — | LibraryMarket-ME-NH-MA | 30 |
| West Hartford Library | — | LibraryMarket-ME-NH-MA | 34 |
| Coverage: Montgomery County, Maryland | — | Montgomery-Parks | 30 |
| Bath County branch: https://www.rrlib.net/bath-county-ics-calendar/ | — | Rockbridge-Regional | 16 |
| Bookmobile branch: https://www.rrlib.net/bookmobile-ics-calendar/ | — | Rockbridge-Regional | 37 |
| Buena Vista branch: https://www.rrlib.net/buena-vista-ics-calendar/ | — | Rockbridge-Regional | 9 |
| Glasgow branch: https://www.rrlib.net/glasgow-ics-calendar/ | — | Rockbridge-Regional | 12 |
| Goshen branch: https://www.rrlib.net/goshen-ics-calendar/ | — | Rockbridge-Regional | 5 |
| Lexington branch: https://www.rrlib.net/lexington-ics-calendar/ | — | Rockbridge-Regional | 48 |
| Decatur County - Gilbert H. Gragg Library | GA | SouthwestGeorgia-GA | 141 |
| Miller County - James W. Merritt, Jr. Memorial Library | GA | SouthwestGeorgia-GA | 29 |
| Seminole County Public Library | GA | SouthwestGeorgia-GA | 47 |
| Horry County Memorial Library | SC | Tockify-Horry | 362 |
| Alachua Branch Library | — | WordPress-FL | 0 |
| Archer Branch Library | — | WordPress-FL | 1 |
| Auburndale Public Library | — | WordPress-FL | 3 |
| Bartow Public Library | — | WordPress-FL | 0 |
| Blake Library | — | WordPress-FL | 15 |
| Brandon Branch | FL | WordPress-FL | 0 |
| Broward County Library | — | WordPress-FL | 20 |
| Celebration Library | — | WordPress-FL | 0 |
| Coleman Library | — | WordPress-FL | 1 |
| Cooper Memorial Library | FL | WordPress-FL | 0 |
| Desoto County Library | — | WordPress-FL | 1 |
| E.C. Rowell Public Library | FL | WordPress-FL | 0 |
| East Lake Community Library | — | WordPress-FL | 0 |
| Edgewater Public Library | FL | WordPress-FL | 0 |
| Eustis Memorial Library | — | WordPress-FL | 1 |
| Freeport Branch Library | FL | WordPress-FL | 0 |
| Fruitland Park Library | — | WordPress-FL | 0 |
| Greenville Public Library | FL | WordPress-FL | 0 |
| Havana Public Library | — | WordPress-FL | 1 |
| Homestead Branch Library | — | WordPress-FL | 0 |
| Hudson Regional Library | FL | WordPress-FL | 0 |
| Jacaranda Public Library | — | WordPress-FL | 0 |
| Jefferson County R. J. Bailar Public Library | — | WordPress-FL | 0 |
| Lake County Library System | — | WordPress-FL | 0 |
| Lake Placid Memorial Library | — | WordPress-FL | 1 |
| Lakeland Public Library | — | WordPress-FL | 0 |
| Land Olakes Branch Library | — | WordPress-FL | 139 |
| Lantana Public Library | — | WordPress-FL | 1 |
| Largo Public Library | — | WordPress-FL | 0 |
| Levy County Public Library System | FL | WordPress-FL | 0 |
| Madison County Library | FL | WordPress-FL | 0 |
| Mandel Public Library Of West Palm Beach | — | WordPress-FL | 8 |
| Margate Catharine Young Branch | FL | WordPress-FL | 0 |
| Miami-Dade Public Library System | — | WordPress-FL | 96 |
| Newberry Branch Library | FL | WordPress-FL | 0 |
| Oldsmar Public Library | — | WordPress-FL | 1 |
| Orange City Dickinson Memorial Library | — | WordPress-FL | 9 |
| Orange County Library System | — | WordPress-FL | 16 |
| Palm Beach County Library System | — | WordPress-FL | 0 |
| Palm Springs Public Library | — | WordPress-FL | 1 |
| Parker Public Library | — | WordPress-FL | 0 |
| Parkland Library | — | WordPress-FL | 1 |
| Pierson Public Library | FL | WordPress-FL | 0 |
| Polk City Library | — | WordPress-FL | 1 |
| Reddick Public Library | — | WordPress-FL | 0 |
| Safety Harbor Public Library | — | WordPress-FL | 143 |
| Springfield Branch | FL | WordPress-FL | 0 |
| Sunrise Dan Pearl Branch | — | WordPress-FL | 0 |
| Tampa-Hillsborough County Public Library | — | WordPress-FL | 0 |
| Taylor County Public Library | FL | WordPress-FL | 0 |
| Umatilla Public Library | — | WordPress-FL | 0 |
| Vernon Branch Library | FL | WordPress-FL | 0 |
| West Branch Library | — | WordPress-FL | 187 |
| Wildwood Public Library | — | WordPress-FL | 0 |
| Winter Park Public Library | — | WordPress-FL | 104 |
| Zephyrhills Library | — | WordPress-FL | 1 |
| Cecil County Public Library | — | WordPress-MD | 33 |
| Dorchester County Public Library | — | WordPress-MD | 1 |
| Kent County Public Library | — | WordPress-MD | 21 |
| Ruth Enlow Library of Garrett County | — | WordPress-MD | 2 |
| Talbot County Free Library | — | WordPress-MD | 44 |
| Wicomico Public Libraries | — | WordPress-MD | 26 |
| Worcester County Library | — | WordPress-MD | 35 |
| Abel J.Morneault Memorial Library | ME | WordPress-ME | 0 |
| Acton Public Library | ME | WordPress-ME | 0 |
| Albion Public Library | ME | WordPress-ME | 0 |
| Andover Public Library | ME | WordPress-ME | 0 |
| Auburn Public Library | ME | WordPress-ME | 25 |
| Augusta - Lithgow Public Library | ME | WordPress-ME | 1 |
| Bangor Public Library | ME | WordPress-ME | 1 |
| Belfast Free Library | ME | WordPress-ME | 150 |
| Belgrade Public Library | ME | WordPress-ME | 0 |
| Bethel Library Assn | ME | WordPress-ME | 0 |
| Biddeford-McArthur Library | ME | WordPress-ME | 82 |
| Blue Hill Library | ME | WordPress-ME | 0 |
| Boothbay Harbor Memorial Library | ME | WordPress-ME | 0 |
| Bowdoinham Public Library | ME | WordPress-ME | 6 |
| Bremen Public Library | ME | WordPress-ME | 0 |
| Bridgton Public Library | ME | WordPress-ME | 1 |
| Brooksville Free Public Library | ME | WordPress-ME | 27 |
| Brown Memorial Library - Clinton | ME | WordPress-ME | 0 |
| Brownville Public Library | ME | WordPress-ME | 0 |
| Brunswick Curtis Memorial Library | ME | WordPress-ME | 4 |
| Camden Public Library | ME | WordPress-ME | 150 |
| Chase Emerson Memorial Library | ME | WordPress-ME | 0 |
| Cumberland - Chebeague Island Library | ME | WordPress-ME | 2 |
| Farmington Public Library | ME | WordPress-ME | 0 |
| Fort Fairfield Public Library | ME | WordPress-ME | 0 |
| Freeland Holmes Library | ME | WordPress-ME | 0 |
| Freeport Community Library | ME | WordPress-ME | 0 |
| Frenchmans Bay Library | ME | WordPress-ME | 0 |
| Frost Memorial Library | ME | WordPress-ME | 8 |
| Gardiner Public Library | ME | WordPress-ME | 0 |
| Gorham Baxter Memorial Library | ME | WordPress-ME | 150 |
| Hartland Public Library | ME | WordPress-ME | 0 |
| Henry D. Moore Library | ME | WordPress-ME | 0 |
| Hollis Center Public Library | ME | WordPress-ME | 0 |
| Ivan O. Davis-Liberty Library | ME | WordPress-ME | 1 |
| John B. Curtis Free Public Library | ME | WordPress-ME | 0 |
| Julia Adams Morse Memorial Library | ME | WordPress-ME | 0 |
| Katahdin Public Library | ME | WordPress-ME | 0 |
| Kennebunk Free Library | ME | WordPress-ME | 0 |
| Lawrence Public Library | ME | WordPress-ME | 0 |
| Lebanon Town Library | ME | WordPress-ME | 0 |
| Lewiston Public Library | ME | WordPress-ME | 0 |
| Limerick Public Library | ME | WordPress-ME | 0 |
| Louise Clements Library | ME | WordPress-ME | 0 |
| Lyman Community Library | ME | WordPress-ME | 1 |
| Machias - Porter Memorial Library | ME | WordPress-ME | 0 |
| Madawaska Public Library | ME | WordPress-ME | 0 |
| Madison Public Library | ME | WordPress-ME | 0 |
| Mark And Emily Turner Memorial Library | ME | WordPress-ME | 10 |
| Mercer - Shaw Library | ME | WordPress-ME | 0 |
| Merrill Memorial Library | ME | WordPress-ME | 63 |
| Milbridge Public Library | ME | WordPress-ME | 0 |
| Monroe Community Library | ME | WordPress-ME | 0 |
| New Gloucester Public Library | ME | WordPress-ME | 0 |
| New Vineyard Public Library | ME | WordPress-ME | 0 |
| North Haven Public Library | ME | WordPress-ME | 0 |
| Oakland Public Library | ME | WordPress-ME | 0 |
| Ogunquit Memorial Library | ME | WordPress-ME | 0 |
| Orrs Island Library | ME | WordPress-ME | 46 |
| Owls Head Village Library | ME | WordPress-ME | 0 |
| Parsons Memorial Library | ME | WordPress-ME | 0 |
| Parsonsfield Public Library | ME | WordPress-ME | 0 |
| Patten Free Library | ME | WordPress-ME | 0 |
| Pembroke Library | ME | WordPress-ME | 0 |
| Pittsfield Public Library | ME | WordPress-ME | 14 |
| Portland Public Library | ME | WordPress-ME | 0 |
| Prince Memorial Library | ME | WordPress-ME | 20 |
| Rangeley Public Library | ME | WordPress-ME | 75 |
| Rockland Public Library | ME | WordPress-ME | 0 |
| Rockport Public Library | ME | WordPress-ME | 150 |
| Sargentville Library Assn | ME | WordPress-ME | 2 |
| Scarborough Public Library | ME | WordPress-ME | 2 |
| Shaw Public Library - Greenville | ME | WordPress-ME | 2 |
| Sherman Public Library | ME | WordPress-ME | 0 |
| Simpson Memorial Library | ME | WordPress-ME | 0 |
| South Berwick Public Library | ME | WordPress-ME | 0 |
| South China Public Library | ME | WordPress-ME | 16 |
| South Portland Public Library | ME | WordPress-ME | 12 |
| Southport Memorial Library | ME | WordPress-ME | 0 |
| Springvale Public Library | ME | WordPress-ME | 0 |
| Standish - Richville Library | ME | WordPress-ME | 1 |
| Steep Falls Library | ME | WordPress-ME | 0 |
| Stockton Springs Community Library | ME | WordPress-ME | 0 |
| Stonington Public Library | ME | WordPress-ME | 0 |
| Swans Island Public Library | ME | WordPress-ME | 0 |
| Thomas Free Library | ME | WordPress-ME | 0 |
| Thomaston Public Library | ME | WordPress-ME | 0 |
| Topsham Public Library | ME | WordPress-ME | 0 |
| Vose Library | ME | WordPress-ME | 0 |
| Waldoboro Public Library | ME | WordPress-ME | 0 |
| Warren Free Public Library | ME | WordPress-ME | 0 |
| Washburn Memorial Library | ME | WordPress-ME | 0 |
| Waterford Library Association | ME | WordPress-ME | 0 |
| Waterville Public Library | ME | WordPress-ME | 38 |
| Wells Public Library | ME | WordPress-ME | 0 |
| West Paris Public Library | ME | WordPress-ME | 0 |
| Westbrook Public Library | ME | WordPress-ME | 0 |
| Wilton Free Public Library | ME | WordPress-ME | 0 |
| Windham Public Library | ME | WordPress-ME | 0 |
| Winterport Memorial Library | ME | WordPress-ME | 1 |
| York Public Library | ME | WordPress-ME | 0 |
| A. E. Wood Library | MS | WordPress-MS | 0 |
| Ada S. Fant Memorial Library | MS | WordPress-MS | 0 |
| Belmont Public Library | MS | WordPress-MS | 0 |
| Bolivar County Library System | — | WordPress-MS | 1 |
| Central Mississippi Regional Library System | — | WordPress-MS | 0 |
| Clarke County-Quitman Public Library | MS | WordPress-MS | 0 |
| Columbia-Marion County Library | MS | WordPress-MS | 0 |
| Columbus-Lowndes Public Library | — | WordPress-MS | 0 |
| Crawford Public Library | — | WordPress-MS | 1 |
| Crosby Public Library | — | WordPress-MS | 0 |
| Decatur Public Library | — | WordPress-MS | 0 |
| Dekalb Public Library | MS | WordPress-MS | 0 |
| Dixie Regional Library System | — | WordPress-MS | 0 |
| Enterprise Public Library | — | WordPress-MS | 0 |
| Evelyn Taylor Majure Library | — | WordPress-MS | 0 |
| Field Memorial Library | — | WordPress-MS | 0 |
| First Regional Library | — | WordPress-MS | 0 |
| Florence Public Library | MS | WordPress-MS | 0 |
| Forest Public Library | — | WordPress-MS | 6 |
| Franklin County Public Library | MS | WordPress-MS | 0 |
| Hamilton Public Library | — | WordPress-MS | 0 |
| Harrison County Library System | — | WordPress-MS | 18 |
| Houston Carnegie Library | — | WordPress-MS | 0 |
| Itawamba County-Pratt Memorial Library | — | WordPress-MS | 0 |
| J. Elliott Mcmullan Library | MS | WordPress-MS | 0 |
| Jackson-George Regional Library System | — | WordPress-MS | 6 |
| Jackson-Hinds Library System | — | WordPress-MS | 21 |
| Kemper-Newton Regional Library | MS | WordPress-MS | 0 |
| Lafayette County-Oxford Public Library | — | WordPress-MS | 0 |
| Laurel-Jones County Library | — | WordPress-MS | 150 |
| Lawrence County Public Library | MS | WordPress-MS | 0 |
| Lee-Itawamba Library System | — | WordPress-MS | 25 |
| Leland Public Library | MS | WordPress-MS | 0 |
| Lexington Public Library | MS | WordPress-MS | 0 |
| Lincoln-Lawrence-Franklin Regional Library | — | WordPress-MS | 18 |
| Long Beach Public Library | MS | WordPress-MS | 0 |
| Magnolia Public Library | — | WordPress-MS | 0 |
| Morton Public Library | — | WordPress-MS | 0 |
| Northeast Regional Library | — | WordPress-MS | 0 |
| Oakland Public Library | MS | WordPress-MS | 0 |
| Pearl River County Library System | — | WordPress-MS | 137 |
| Pine Forest Regional Library | — | WordPress-MS | 1 |
| Rebecca Baine Rigby Library | MS | WordPress-MS | 0 |
| Richland Public Library | MS | WordPress-MS | 0 |
| Ripley Public Library | — | WordPress-MS | 0 |
| Sherman Library | MS | WordPress-MS | 0 |
| Starkville-Oktibbeha County Public Library | — | WordPress-MS | 1 |
| Tombigbee Regional Library System | — | WordPress-MS | 1 |
| Warren County-Vicksburg Public Library | — | WordPress-MS | 1 |
| William And Dolores Mauldin Library | — | WordPress-MS | 0 |
| William Estes Powell Memorial Library | — | WordPress-MS | 0 |
| Winston County Library | — | WordPress-MS | 12 |
| Woodville Public Library | — | WordPress-MS | 0 |
| Anthony Pio Costa Memorial Library | NJ | WordPress-NJ | 4 |
| Asbury Park Free Public Library | NJ | WordPress-NJ | 0 |
| Atlantic City Free Public Library | NJ | WordPress-NJ | 0 |
| Audubon Free Public Library | NJ | WordPress-NJ | 23 |
| Bayonne Free Public Library | NJ | WordPress-NJ | 1 |
| Beach Haven Free Public Library | NJ | WordPress-NJ | 52 |
| Belmar Public Library | NJ | WordPress-NJ | 150 |
| Bergenfield Free Public Library | NJ | WordPress-NJ | 0 |
| Bernardsville Public Library | NJ | WordPress-NJ | 1 |
| Bloomingdale Free Public Library | NJ | WordPress-NJ | 0 |
| Boonton Holmes Public Library | NJ | WordPress-NJ | 0 |
| Bradley Beach Public Library | NJ | WordPress-NJ | 0 |
| Bridgeton Free Public Library | NJ | WordPress-NJ | 0 |
| Butler Public Library | NJ | WordPress-NJ | 0 |
| Camden Free Public Library | NJ | WordPress-NJ | 0 |
| Carteret Free Public Library | NJ | WordPress-NJ | 0 |
| Cedar Grove Free Public Library | NJ | WordPress-NJ | 0 |
| Chathams Joint Free Public Library | NJ | WordPress-NJ | 164 |
| Chester Library | NJ | WordPress-NJ | 0 |
| Clark Public Library | NJ | WordPress-NJ | 0 |
| Cliffside Park Free Public Library | NJ | WordPress-NJ | 137 |
| Cranford Public Library | NJ | WordPress-NJ | 31 |
| Cresskill Public Library | NJ | WordPress-NJ | 0 |
| Crosswicks Library Company | NJ | WordPress-NJ | 1 |
| Delanco Public Library | NJ | WordPress-NJ | 0 |
| Demarest Public Library Association | NJ | WordPress-NJ | 0 |
| Denville Free Public Library | NJ | WordPress-NJ | 44 |
| Dixon Homestead Library | NJ | WordPress-NJ | 1 |
| Dover Free Public Library | NJ | WordPress-NJ | 3 |
| Dowdell Library Of South Amboy | NJ | WordPress-NJ | 0 |
| Dunellen Free Public Library | NJ | WordPress-NJ | 5 |
| Dwight D. Eisenhower Library | NJ | WordPress-NJ | 0 |
| Edgewater Free Public Library | NJ | WordPress-NJ | 0 |
| Elmwood Park Free Public Library | NJ | WordPress-NJ | 0 |
| Emerson Public Library | NJ | WordPress-NJ | 2 |
| Englewood Free Public Library | NJ | WordPress-NJ | 0 |
| Fair Haven Public Library | NJ | WordPress-NJ | 0 |
| Fanwood Memorial Library | NJ | WordPress-NJ | 8 |
| Flemington Free Public Library | NJ | WordPress-NJ | 1 |
| Fort Lee Free Public Library | NJ | WordPress-NJ | 67 |
| Franklin Lakes Free Public Library | NJ | WordPress-NJ | 37 |
| Franklin Twp Public Library-Gloucester | NJ | WordPress-NJ | 66 |
| Franklin Twp Public Library-Somerset | NJ | WordPress-NJ | 7 |
| Glen Ridge Free Public Library | NJ | WordPress-NJ | 0 |
| Glen Rock Public Library | NJ | WordPress-NJ | 1 |
| Gloucester City Library | NJ | WordPress-NJ | 95 |
| Hackettstown Free Public Library | NJ | WordPress-NJ | 150 |
| Haddonfield Public Library | NJ | WordPress-NJ | 0 |
| Hamilton Township Free Public Library | NJ | WordPress-NJ | 0 |
| Hasbrouck Heights Free Public Library | NJ | WordPress-NJ | 1 |
| Haworth Municipal Library | NJ | WordPress-NJ | 0 |
| Hillside Free Public Library | NJ | WordPress-NJ | 90 |
| Hoboken Public Library | NJ | WordPress-NJ | 20 |
| Irvington Public Library | NJ | WordPress-NJ | 1 |
| Jamesburg Public Library | NJ | WordPress-NJ | 5 |
| Kearny Public Library | NJ | WordPress-NJ | 67 |
| Kenilworth Public Library | NJ | WordPress-NJ | 7 |
| Keyport Free Public Library | NJ | WordPress-NJ | 0 |
| Kinnelon Public Library | NJ | WordPress-NJ | 1 |
| Lambertville Free Public Library | NJ | WordPress-NJ | 0 |
| Leonia Public Library | NJ | WordPress-NJ | 1 |
| Lincoln Park Public Library | NJ | WordPress-NJ | 0 |
| Linwood Public Library | NJ | WordPress-NJ | 0 |
| Little Falls Public Library | NJ | WordPress-NJ | 59 |
| Little Silver Public Library | NJ | WordPress-NJ | 0 |
| Lyndhurst Free Public Library | NJ | WordPress-NJ | 9 |
| Madison Public Library | NJ | WordPress-NJ | 0 |
| Maplewood Memorial Library | NJ | WordPress-NJ | 1 |
| Margate City Public Library | NJ | WordPress-NJ | 11 |
| Maurice M. Pine Free Public Library | NJ | WordPress-NJ | 0 |
| Maywood Public Library | NJ | WordPress-NJ | 0 |
| Metuchen Public Library | NJ | WordPress-NJ | 92 |
| Middletown Township Public Library | NJ | WordPress-NJ | 0 |
| Midland Park Memorial Library | NJ | WordPress-NJ | 11 |
| Millburn Free Public Library | NJ | WordPress-NJ | 2 |
| Milltown Public Library | NJ | WordPress-NJ | 0 |
| Millville Public Library | NJ | WordPress-NJ | 0 |
| Monmouth Beach Public Library | NJ | WordPress-NJ | 0 |
| Monroe Twp Public Library-Gloucester | NJ | WordPress-NJ | 0 |
| Monroe Twp Public Library-Middlesex | NJ | WordPress-NJ | 1 |
| Montclair Public Library | NJ | WordPress-NJ | 116 |
| Montville Township Public Library | NJ | WordPress-NJ | 13 |
| Moorestown Library | NJ | WordPress-NJ | 37 |
| Morris Plains Library | NJ | WordPress-NJ | 4 |
| Morristown-Morris Twp Joint Public Library | NJ | WordPress-NJ | 0 |
| Mount Arlington Public Library | NJ | WordPress-NJ | 0 |
| Mount Laurel Library | NJ | WordPress-NJ | 206 |
| Mountain Lakes Free Public Library | NJ | WordPress-NJ | 4 |
| Mountainside Free Public Library | NJ | WordPress-NJ | 18 |
| New Milford Public Library | NJ | WordPress-NJ | 0 |
| New Providence Memorial Library | NJ | WordPress-NJ | 0 |
| North Arlington Public Library | NJ | WordPress-NJ | 0 |
| North Brunswick Free Public Library | NJ | WordPress-NJ | 5 |
| North Haledon Free Public Library | NJ | WordPress-NJ | 1 |
| Norwood Public Library | NJ | WordPress-NJ | 0 |
| Oakland Public Library | NJ | WordPress-NJ | 0 |
| Ocean City Free Public Library | NJ | WordPress-NJ | 4 |
| Old Bridge Public Library | NJ | WordPress-NJ | 0 |
| Old Tappan Free Public Library | NJ | WordPress-NJ | 0 |
| Palisades Park Free Public Library | NJ | WordPress-NJ | 1 |
| Paramus Public Library | NJ | WordPress-NJ | 1 |
| Park Ridge Free Public Library | NJ | WordPress-NJ | 5 |
| Parsippany-Troy Hills Public Library | NJ | WordPress-NJ | 0 |
| Passaic Public Library | NJ | WordPress-NJ | 0 |
| Pennington Free Public Library | NJ | WordPress-NJ | 21 |
| Pennsauken Free Public Library | NJ | WordPress-NJ | 1 |
| Pennsville Public Library | NJ | WordPress-NJ | 0 |
| Piscataway Public Library | NJ | WordPress-NJ | 132 |
| Plainfield Free Public Library | NJ | WordPress-NJ | 125 |
| Plainsboro Free Public Library | NJ | WordPress-NJ | 0 |
| Pompton Lakes Borough Free Public Library | NJ | WordPress-NJ | 6 |
| Princeton Public Library | NJ | WordPress-NJ | 0 |
| Rahway Public Library | NJ | WordPress-NJ | 11 |
| Ramsey Free Public Library | NJ | WordPress-NJ | 41 |
| Red Bank Public Library | NJ | WordPress-NJ | 28 |
| Ridgefield Free Public Library | NJ | WordPress-NJ | 0 |
| Ridgewood Public Library | NJ | WordPress-NJ | 0 |
| Ringwood Public Library | NJ | WordPress-NJ | 150 |
| River Vale Public Library | NJ | WordPress-NJ | 0 |
| Riverdale Public Library | NJ | WordPress-NJ | 1 |
| Riverside Public Library | NJ | WordPress-NJ | 0 |
| Roseland Free Public Library | NJ | WordPress-NJ | 0 |
| Roselle Free Public Library | NJ | WordPress-NJ | 54 |
| Roselle Park Veterans Memorial Library | NJ | WordPress-NJ | 1 |
| Runnemede Public Library | NJ | WordPress-NJ | 10 |
| Ruth L. Rockwood Memorial Library | NJ | WordPress-NJ | 1 |
| Rutherford Free Public Library | NJ | WordPress-NJ | 1 |
| Saddle Brook Free Public Library | NJ | WordPress-NJ | 13 |
| Salem Free Public Library | NJ | WordPress-NJ | 0 |
| Sally Stretch Keen Memorial Library | NJ | WordPress-NJ | 0 |
| Scotch Plains Public Library | NJ | WordPress-NJ | 2 |
| Secaucus Free Public Library | NJ | WordPress-NJ | 0 |
| South River Public Library | NJ | WordPress-NJ | 0 |
| Sparta Public Library | NJ | WordPress-NJ | 0 |
| Spring Lake Public Library | NJ | WordPress-NJ | 4 |
| Springfield Free Public Library | NJ | WordPress-NJ | 0 |
| Stratford Public Library | NJ | WordPress-NJ | 0 |
| Summit Free Public Library | NJ | WordPress-NJ | 0 |
| Sussex County Library | NJ | WordPress-NJ | 0 |
| Teaneck Public Library | NJ | WordPress-NJ | 1 |
| Tenafly Free Public Library | NJ | WordPress-NJ | 0 |
| Union Free Public Library | NJ | WordPress-NJ | 0 |
| Verona Free Public Library | NJ | WordPress-NJ | 150 |
| Vineland Public Library | NJ | WordPress-NJ | 0 |
| Waldwick Public Library | NJ | WordPress-NJ | 0 |
| Wanaque Borough Free Public Library | NJ | WordPress-NJ | 150 |
| West Orange Free Public Library | NJ | WordPress-NJ | 0 |
| Westfield Memorial Library | NJ | WordPress-NJ | 5 |
| Westwood Free Public Library | NJ | WordPress-NJ | 0 |
| Wharton Public Library | NJ | WordPress-NJ | 0 |
| William E. Dermody Free Public Library | NJ | WordPress-NJ | 22 |
| Wood-Ridge Memorial Library | NJ | WordPress-NJ | 33 |
| Woodbridge Public Library | NJ | WordPress-NJ | 7 |
| Woodbury Public Library | NJ | WordPress-NJ | 23 |
| Woodstown-Pilesgrove Library | NJ | WordPress-NJ | 0 |
| Worth Pinkham Memorial Library | NJ | WordPress-NJ | 1 |
| Wyckoff Free Public Library | NJ | WordPress-NJ | 0 |
| Addison Public Library | NY | WordPress-NY | 0 |
| Albany Public Library | NY | WordPress-NY | 23 |
| Alden Ewell Free Library | NY | WordPress-NY | 0 |
| Alfred Box Of Books Library | NY | WordPress-NY | 0 |
| Allegany Public Library | NY | WordPress-NY | 1 |
| Almond Twentieth Century Club Library | NY | WordPress-NY | 3 |
| Amagansett Free Library | NY | WordPress-NY | 0 |
| Amenia Free Library | NY | WordPress-NY | 0 |
| Amherst Public Library Clearfield Branch | NY | WordPress-NY | 0 |
| Andes Public Library | NY | WordPress-NY | 0 |
| Andover Free Library | NY | WordPress-NY | 0 |
| Annie Porter Ainsworth Memorial Library | NY | WordPress-NY | 150 |
| Apalachin Library Association | NY | WordPress-NY | 0 |
| Arcade Free Library | NY | WordPress-NY | 0 |
| Ardsley Public Library | NY | WordPress-NY | 0 |
| Audubon Branch | NY | WordPress-NY | 18 |
| Aurora Free Library | NY | WordPress-NY | 2 |
| B. Elizabeth Strong Memorial Library | NY | WordPress-NY | 0 |
| Babylon School District Public Library | NY | WordPress-NY | 3 |
| Bainbridge Free Library | NY | WordPress-NY | 0 |
| Baldwin Public Library | NY | WordPress-NY | 0 |
| Bancroft Public Library | NY | WordPress-NY | 0 |
| Barker Free Library | NY | WordPress-NY | 14 |
| Barneveld Free Library Association | NY | WordPress-NY | 0 |
| Beaver Falls Library | NY | WordPress-NY | 0 |
| Bedford Free Library | NY | WordPress-NY | 0 |
| Bedford Hills Free Library | NY | WordPress-NY | 18 |
| Belden Noble Memorial Library Of Essex | NY | WordPress-NY | 0 |
| Belfast Public Library | NY | WordPress-NY | 0 |
| Bellmore Memorial Library | NY | WordPress-NY | 1 |
| Bemus Point Public Library | NY | WordPress-NY | 0 |
| Blodgett Memorial Library District Of Fishkill | NY | WordPress-NY | 0 |
| Blount Library | NY | WordPress-NY | 18 |
| Brentwood Public Library | NY | WordPress-NY | 0 |
| Brewster Public Library | NY | WordPress-NY | 37 |
| Briarcliff Manor Public Library | NY | WordPress-NY | 15 |
| Bronxville Public Library | NY | WordPress-NY | 4 |
| Brooklyn Public Library | NY | WordPress-NY | 0 |
| Brownville-Glen Park Library | NY | WordPress-NY | 0 |
| Bryant Library | NY | WordPress-NY | 0 |
| Buffalo & Erie County Public Library | NY | WordPress-NY | 49 |
| C. W. Clark Memorial Library | NY | WordPress-NY | 0 |
| Cairo Public Library | NY | WordPress-NY | 1 |
| Caledonia Library Association | NY | WordPress-NY | 1 |
| Cambridge Public Library | NY | WordPress-NY | 0 |
| Camden Library Association | NY | WordPress-NY | 0 |
| Canajoharie Library And Art Gallery | NY | WordPress-NY | 0 |
| Canastota Public Library | NY | WordPress-NY | 0 |
| Canton Free Library | NY | WordPress-NY | 1 |
| Cape Vincent Community Library | NY | WordPress-NY | 53 |
| Cattaraugus Free Library | NY | WordPress-NY | 0 |
| Cazenovia Public Library Society | NY | WordPress-NY | 1 |
| Center Moriches Free Public Library | NY | WordPress-NY | 1 |
| Central Islip Public Library | NY | WordPress-NY | 0 |
| Central Square Library | NY | WordPress-NY | 19 |
| Chappaqua Library | NY | WordPress-NY | 48 |
| Chatham Public Library | NY | WordPress-NY | 1 |
| Cherry Valley Memorial Library | NY | WordPress-NY | 10 |
| Chester Public Library | NY | WordPress-NY | 0 |
| Claverack Library | NY | WordPress-NY | 1 |
| Clyde-Savannah Public Library | NY | WordPress-NY | 2 |
| Clymer-French Creek Free Library | NY | WordPress-NY | 0 |
| Cohocton Public Library | NY | WordPress-NY | 62 |
| Cohoes Public Library | NY | WordPress-NY | 0 |
| Community Free Library | NY | WordPress-NY | 19 |
| Copiague Memorial Public Library | NY | WordPress-NY | 1 |
| Corfu Free Library | NY | WordPress-NY | 0 |
| Cornwall Public Library | NY | WordPress-NY | 0 |
| Cuba Circulating Library Association | NY | WordPress-NY | 65 |
| Cutchogue New Suffolk Free Library | NY | WordPress-NY | 0 |
| D.R. Evarts Library | NY | WordPress-NY | 35 |
| Dansville Public Library | NY | WordPress-NY | 0 |
| David A Howe Public Library | NY | WordPress-NY | 0 |
| Deer Park Public Library | NY | WordPress-NY | 0 |
| Delevan-Yorkshire Public Library | NY | WordPress-NY | 0 |
| Deruyter Free Library | NY | WordPress-NY | 1 |
| Dewitt Community Library Assoc., Inc | NY | WordPress-NY | 16 |
| Didymus Thomas Library | NY | WordPress-NY | 0 |
| Dobbs Ferry Public Library | NY | WordPress-NY | 39 |
| Dolgeville-Manheim Public Library | NY | WordPress-NY | 0 |
| Dormann Library | NY | WordPress-NY | 0 |
| Dunham Public Library | NY | WordPress-NY | 0 |
| Dunkirk Free Library | NY | WordPress-NY | 1 |
| Eagle Free Library | NY | WordPress-NY | 13 |
| Earlville Free Library | NY | WordPress-NY | 1 |
| East Greenbush Community Library | NY | WordPress-NY | 4 |
| East Hampton Library | NY | WordPress-NY | 34 |
| East Islip Public Library | NY | WordPress-NY | 0 |
| East Rochester Public Library | NY | WordPress-NY | 0 |
| East Rockaway Public Library | NY | WordPress-NY | 6 |
| Eastchester Public Library | NY | WordPress-NY | 4 |
| Edith B. Ford Memorial Library | NY | WordPress-NY | 0 |
| Elbridge Free Library | NY | WordPress-NY | 0 |
| Ellicottville Memorial Library | NY | WordPress-NY | 2 |
| Ellisburg Free Library | NY | WordPress-NY | 24 |
| Elmont Public Library | NY | WordPress-NY | 1 |
| Elwood Public Library | NY | WordPress-NY | 1 |
| Erwin Library Institute | NY | WordPress-NY | 0 |
| Ethelbert B. Crawford Public Library | NY | WordPress-NY | 0 |
| Fair Haven Public Library | NY | WordPress-NY | 1 |
| Fairport Public Library | NY | WordPress-NY | 8 |
| Falconer Public Library | NY | WordPress-NY | 1 |
| Farman Free Library Association Of Ellington | NY | WordPress-NY | 22 |
| Farmingdale Public Library | NY | WordPress-NY | 1 |
| Finkelstein Memorial Library | NY | WordPress-NY | 1 |
| Floral Park Public Library | NY | WordPress-NY | 2 |
| Franklin Free Library | NY | WordPress-NY | 0 |
| Fred And Harriet Taylor Memorial Library | NY | WordPress-NY | 20 |
| Free Library Of The Belmont Literary And Historical Society | NY | WordPress-NY | 0 |
| Freeport Memorial Library | NY | WordPress-NY | 6 |
| Fulton Public Library | NY | WordPress-NY | 0 |
| Galway Public Library | NY | WordPress-NY | 0 |
| Garden City Public Library | NY | WordPress-NY | 66 |
| Gardiner Library | NY | WordPress-NY | 0 |
| Germantown Library | NY | WordPress-NY | 150 |
| Glen Cove Public Library | NY | WordPress-NY | 0 |
| Gloversville Public Library | NY | WordPress-NY | 1 |
| Gorham Free Library | NY | WordPress-NY | 0 |
| Goshen Public Library And Historical Society | NY | WordPress-NY | 0 |
| Gowanda Free Library | NY | WordPress-NY | 7 |
| Great Neck Library | NY | WordPress-NY | 71 |
| Greenville Public Library | NY | WordPress-NY | 1 |
| Guernsey Memorial Library Of Norwich | NY | WordPress-NY | 1 |
| Guilderland Public Library | NY | WordPress-NY | 1 |
| Hamburg Library | NY | WordPress-NY | 26 |
| Hamilton Public Library | NY | WordPress-NY | 0 |
| Hamlin Public Library | NY | WordPress-NY | 0 |
| Hammond Free Library | NY | WordPress-NY | 0 |
| Hammond Library Of Crown Point | NY | WordPress-NY | 1 |
| Hampton Bays Public Library | NY | WordPress-NY | 5 |
| Hannibal Free Library | NY | WordPress-NY | 0 |
| Harrison Public Library | NY | WordPress-NY | 9 |
| Hauppauge Public Library | NY | WordPress-NY | 0 |
| Haverstraw Kings Daughters Public Library - Village Branch | NY | WordPress-NY | 0 |
| Hawn Memorial Library | NY | WordPress-NY | 150 |
| Haxton Memorial Library | NY | WordPress-NY | 12 |
| Henry Waldinger Memorial Library | NY | WordPress-NY | 44 |
| Hepburn Library Of Waddington | NY | WordPress-NY | 2 |
| Hicksville Public Library | NY | WordPress-NY | 14 |
| Highland Falls Library | NY | WordPress-NY | 0 |
| Highland Public Library | NY | WordPress-NY | 0 |
| Holland Patent Free Library | NY | WordPress-NY | 0 |
| Howland Public Library | NY | WordPress-NY | 2 |
| Hudson Area Association Library | NY | WordPress-NY | 0 |
| Huntington Public Library | NY | WordPress-NY | 0 |
| Hurley Library District | NY | WordPress-NY | 10 |
| Hyde Park Free Library | NY | WordPress-NY | 35 |
| Ilion Free Public Library | NY | WordPress-NY | 0 |
| Irvington Pub Lib Guiteau Foundation | NY | WordPress-NY | 3 |
| Island Park Public Library | NY | WordPress-NY | 1 |
| Islip Public Library | NY | WordPress-NY | 0 |
| Ithaca Tompkins County Public Library | NY | WordPress-NY | 42 |
| Jericho Public Library | NY | WordPress-NY | 69 |
| John C. Hart Memorial Library | NY | WordPress-NY | 0 |
| John Jermain Memorial Library | NY | WordPress-NY | 0 |
| Jordan Bramley Library | NY | WordPress-NY | 0 |
| Jordanville Public Library | NY | WordPress-NY | 0 |
| Katonah Village Library | NY | WordPress-NY | 5 |
| Keene Valley Public Library | NY | WordPress-NY | 0 |
| Kennedy Free Library | NY | WordPress-NY | 0 |
| Kinderhook Memorial Library | NY | WordPress-NY | 150 |
| King Memorial Library | NY | WordPress-NY | 12 |
| Kingston Library | NY | WordPress-NY | 11 |
| Kirkland Town Library | NY | WordPress-NY | 0 |
| Lafayette Public Library | NY | WordPress-NY | 0 |
| Lake Placid Public Library | NY | WordPress-NY | 12 |
| Lakewood Memorial Library | NY | WordPress-NY | 0 |
| Lansing Community Library | NY | WordPress-NY | 8 |
| Larchmont Public Library | NY | WordPress-NY | 9 |
| Lewisboro Library | NY | WordPress-NY | 150 |
| Lewiston Public Library | NY | WordPress-NY | 0 |
| Library Association Of Rockland County | NY | WordPress-NY | 58 |
| Lindenhurst Memorial Library | NY | WordPress-NY | 89 |
| Lisle Free Library | NY | WordPress-NY | 0 |
| Little Falls Public Library | NY | WordPress-NY | 0 |
| Livingston Free Library | NY | WordPress-NY | 0 |
| Livingston Manor Free Library | NY | WordPress-NY | 13 |
| Livonia Public Library | NY | WordPress-NY | 1 |
| Lockport Public Library | NY | WordPress-NY | 44 |
| Locust Valley Library | NY | WordPress-NY | 0 |
| Long Beach Public Library | NY | WordPress-NY | 1 |
| Louise Adelia Read Memorial Library | NY | WordPress-NY | 1 |
| Lynbrook Public Library | NY | WordPress-NY | 42 |
| Lyons Falls Library | NY | WordPress-NY | 1 |
| Lyons Public Library | NY | WordPress-NY | 0 |
| Mahopac Public Library | NY | WordPress-NY | 10 |
| Malverne Public Library | NY | WordPress-NY | 1 |
| Mamaroneck Public Library District | NY | WordPress-NY | 150 |
| Manhasset Public Library | NY | WordPress-NY | 11 |
| Manlius Library | NY | WordPress-NY | 1 |
| Mannsville Free Library | NY | WordPress-NY | 31 |
| Marcellus Free Library | NY | WordPress-NY | 0 |
| Marion Public Library | NY | WordPress-NY | 0 |
| Marlboro Free Library | NY | WordPress-NY | 2 |
| Mary E. Seymour Memorial Free Library | NY | WordPress-NY | 0 |
| Mayville Library | NY | WordPress-NY | 0 |
| Memorial Library Of Little Valley | NY | WordPress-NY | 3 |
| Menands Public Library | NY | WordPress-NY | 0 |
| Merrick Library | NY | WordPress-NY | 1 |
| Middleburgh Library | NY | WordPress-NY | 0 |
| Middleville Free Library | NY | WordPress-NY | 0 |
| Millbrook Free Library | NY | WordPress-NY | 0 |
| Minerva Free Library | NY | WordPress-NY | 0 |
| Minoa Library | NY | WordPress-NY | 0 |
| Modeste Bedient Memorial Library | NY | WordPress-NY | 15 |
| Monroe Free Library | NY | WordPress-NY | 0 |
| Montauk Library | NY | WordPress-NY | 12 |
| Montgomery Free Library | NY | WordPress-NY | 6 |
| Montour Falls Memorial Library | NY | WordPress-NY | 16 |
| Mooers Free Library | NY | WordPress-NY | 0 |
| Moore Memorial Library | NY | WordPress-NY | 0 |
| Morristown Public Library | NY | WordPress-NY | 0 |
| Morton Memorial Library | NY | WordPress-NY | 1 |
| Mount Morris Library | NY | WordPress-NY | 0 |
| Mount Vernon Public Library | NY | WordPress-NY | 31 |
| Nanuet Public Library | NY | WordPress-NY | 1 |
| Naples Library | NY | WordPress-NY | 0 |
| Nassau Free Library | NY | WordPress-NY | 1 |
| Nassau Library System | NY | WordPress-NY | 0 |
| New Berlin Library | NY | WordPress-NY | 39 |
| New Lebanon Library | NY | WordPress-NY | 26 |
| New Rochelle Public Library | NY | WordPress-NY | 0 |
| New Woodstock Free Library | NY | WordPress-NY | 0 |
| New York Mills Public Library | NY | WordPress-NY | 0 |
| New York Public Library | NY | WordPress-NY | 0 |
| Newark Public Library | NY | WordPress-NY | 1 |
| Newburgh Free Library | NY | WordPress-NY | 2 |
| Newfane Free Library | NY | WordPress-NY | 0 |
| Newstead Public Library | NY | WordPress-NY | 0 |
| North Bellmore Public Library | NY | WordPress-NY | 1 |
| North Chatham Free Library | NY | WordPress-NY | 34 |
| North Merrick Public Library | NY | WordPress-NY | 42 |
| Northville Public Library | NY | WordPress-NY | 0 |
| Norwood Library | NY | WordPress-NY | 0 |
| Nyack Library | NY | WordPress-NY | 1 |
| Oceanside Library | NY | WordPress-NY | 70 |
| Old Forge Library | NY | WordPress-NY | 1 |
| Olean Public Library | NY | WordPress-NY | 2 |
| Orangeburg Library | NY | WordPress-NY | 7 |
| Oriskany Public Library | NY | WordPress-NY | 0 |
| Orleans Public Library | NY | WordPress-NY | 0 |
| Ossining Public Library | NY | WordPress-NY | 4 |
| Oswego School District Public Library | NY | WordPress-NY | 0 |
| Oxford Memorial Library | NY | WordPress-NY | 0 |
| Oyster Bay-East Norwich Public Library | NY | WordPress-NY | 1 |
| Palisades Free Library | NY | WordPress-NY | 1 |
| Parish Public Library | NY | WordPress-NY | 0 |
| Patterson Library | NY | WordPress-NY | 0 |
| Pawling Free Library | NY | WordPress-NY | 0 |
| Pearl River Public Library | NY | WordPress-NY | 1 |
| Pember Library Museum | NY | WordPress-NY | 0 |
| Penfield Public Library | NY | WordPress-NY | 0 |
| Perry Public Library | NY | WordPress-NY | 0 |
| Peru Free Library | NY | WordPress-NY | 0 |
| Phillips Free Library | NY | WordPress-NY | 1 |
| Phoenicia Library | NY | WordPress-NY | 1 |
| Phoenix Public Library | NY | WordPress-NY | 1 |
| Piermont Library District | NY | WordPress-NY | 1 |
| Pike Library | NY | WordPress-NY | 0 |
| Pine Plains Free Library | NY | WordPress-NY | 150 |
| Plainedge Public Library | NY | WordPress-NY | 6 |
| Pleasant Valley Free Library | NY | WordPress-NY | 1 |
| Poestenkill Library | NY | WordPress-NY | 4 |
| Port Byron Library | NY | WordPress-NY | 1 |
| Port Chester Public Library | NY | WordPress-NY | 9 |
| Port Jervis Free Library | NY | WordPress-NY | 0 |
| Port Leyden Community Library | NY | WordPress-NY | 0 |
| Portville Free Library | NY | WordPress-NY | 0 |
| Potsdam Public Library | NY | WordPress-NY | 39 |
| Poughkeepsie Public Library District | NY | WordPress-NY | 1 |
| Pound Ridge Library District | NY | WordPress-NY | 0 |
| Prospect Free Library | NY | WordPress-NY | 0 |
| Putnam Valley Free Library | NY | WordPress-NY | 1 |
| Queens Borough Public Library - Astoria | NY | WordPress-NY | 0 |
| Queens Borough Public Library - Elmhurst | NY | WordPress-NY | 0 |
| Queens Borough Public Library - Glendale | NY | WordPress-NY | 0 |
| Queens Borough Public Library - Hollis | NY | WordPress-NY | 1 |
| Queens Borough Public Library - Woodside | NY | WordPress-NY | 0 |
| Queens Public Library | NY | WordPress-NY | 1 |
| Quogue Library | NY | WordPress-NY | 0 |
| Ramapo Catskill Library System | NY | WordPress-NY | 0 |
| Ransomville Free Library | NY | WordPress-NY | 0 |
| Reading Room Association Of Gouverneur | NY | WordPress-NY | 0 |
| Red Hook Public Library | NY | WordPress-NY | 1 |
| Reed Memorial Library | NY | WordPress-NY | 1 |
| Rensselaer Public Library | NY | WordPress-NY | 7 |
| Rensselaerville Public Library | NY | WordPress-NY | 0 |
| Richmond Memorial Library | NY | WordPress-NY | 0 |
| Ripley Free Library | NY | WordPress-NY | 9 |
| Riverhead Free Library | NY | WordPress-NY | 104 |
| Rochester Public Library | NY | WordPress-NY | 18 |
| Rockville Centre Public Library | NY | WordPress-NY | 54 |
| Rodman Public Library | NY | WordPress-NY | 0 |
| Roosevelt Public Library | NY | WordPress-NY | 0 |
| Rose Free Library | NY | WordPress-NY | 0 |
| Rose Memorial Library Association | NY | WordPress-NY | 1 |
| Rosendale Library | NY | WordPress-NY | 1 |
| Rouses Point Dodge Memorial Library | NY | WordPress-NY | 1 |
| Roxbury Library Association | NY | WordPress-NY | 1 |
| Rush Public Library | NY | WordPress-NY | 1 |
| Russell Public Library | NY | WordPress-NY | 0 |
| Rye Free Reading Room | NY | WordPress-NY | 2 |
| Sachem Public Library | NY | WordPress-NY | 0 |
| Salamanca Public Library | NY | WordPress-NY | 2 |
| Sayville Library | NY | WordPress-NY | 140 |
| Scarsdale Public Library | NY | WordPress-NY | 55 |
| Schenectady County Public Library | NY | WordPress-NY | 0 |
| Schoharie Free Library Assn. | NY | WordPress-NY | 0 |
| Schroon Lake Public Library | NY | WordPress-NY | 150 |
| Scio Memorial Library | NY | WordPress-NY | 0 |
| Scottsville Free Library | NY | WordPress-NY | 1 |
| Sea Cliff Village Library | NY | WordPress-NY | 1 |
| Seaford Public Library | NY | WordPress-NY | 0 |
| Seneca Falls Library | NY | WordPress-NY | 0 |
| Seneca Nation Of Indians Library Cattaraugus Territory | NY | WordPress-NY | 0 |
| Seymour Public Library District | NY | WordPress-NY | 115 |
| Shelter Island Public Library Society | NY | WordPress-NY | 0 |
| Shelter Rock Public Library | NY | WordPress-NY | 1 |
| Sherburne Public Library | NY | WordPress-NY | 2 |
| Sidney Memorial Public Library | NY | WordPress-NY | 0 |
| Sinclairville Free Library | NY | WordPress-NY | 5 |
| Sloatsburg Public Library | NY | WordPress-NY | 1 |
| Smyrna Public Library | NY | WordPress-NY | 0 |
| Sodus Free Library | NY | WordPress-NY | 0 |
| Solvay Public Library | NY | WordPress-NY | 0 |
| Somers Library | NY | WordPress-NY | 14 |
| Southold Free Library | NY | WordPress-NY | 0 |
| Staatsburg Library | NY | WordPress-NY | 13 |
| Stamford Village Library | NY | WordPress-NY | 0 |
| Stephentown Memorial Library | NY | WordPress-NY | 1 |
| Stillwater Free Library | NY | WordPress-NY | 30 |
| Stone Ridge Public Library | NY | WordPress-NY | 0 |
| Suffern Free Library | NY | WordPress-NY | 3 |
| Sullivan Free Library Of Bridgeport | NY | WordPress-NY | 0 |
| Swan Library | NY | WordPress-NY | 0 |
| Syosset Public Library | NY | WordPress-NY | 0 |
| Syracuse Public Library | NY | WordPress-NY | 69 |
| Tappan Library | NY | WordPress-NY | 0 |
| The Jervis Public Library Association, Inc. | NY | WordPress-NY | 0 |
| Tivoli Free Library | NY | WordPress-NY | 0 |
| Tomkins Cove Public Library | NY | WordPress-NY | 2 |
| Town Of Pelham Public Library | NY | WordPress-NY | 46 |
| Town Of Westerlo Public Library | NY | WordPress-NY | 16 |
| Tuckahoe Public Library | NY | WordPress-NY | 0 |
| Tuxedo Park Library | NY | WordPress-NY | 0 |
| Ulysses Philomathic Library | NY | WordPress-NY | 2 |
| Unadilla Public Library | NY | WordPress-NY | 1 |
| Utica Public Library | NY | WordPress-NY | 9 |
| Valley Cottage Free Library | NY | WordPress-NY | 0 |
| Valley Falls Free Library | NY | WordPress-NY | 2 |
| Vernon Public Library | NY | WordPress-NY | 0 |
| Village Library Of Cooperstown | NY | WordPress-NY | 0 |
| Voorheesville Public Library | NY | WordPress-NY | 0 |
| Wadsworth Library | NY | WordPress-NY | 0 |
| Walworth-Seely Public Library | NY | WordPress-NY | 0 |
| Wantagh Public Library | NY | WordPress-NY | 0 |
| Warner Library | NY | WordPress-NY | 0 |
| Warsaw Public Library | NY | WordPress-NY | 0 |
| Waterford Public Library | NY | WordPress-NY | 0 |
| Waterloo Library And Historical Society | NY | WordPress-NY | 0 |
| Watkins Glen Cen Sch Dis Free Pub Lib | NY | WordPress-NY | 150 |
| Waverly Free Library | NY | WordPress-NY | 2 |
| Wayland Free Library | NY | WordPress-NY | 0 |
| Webster Public Library | NY | WordPress-NY | 16 |
| Weedsport Free Library | NY | WordPress-NY | 19 |
| West Hurley Public Library | NY | WordPress-NY | 5 |
| West Islip Public Library | NY | WordPress-NY | 0 |
| West Nyack Free Library | NY | WordPress-NY | 0 |
| West Winfield Library | NY | WordPress-NY | 0 |
| Westbury Memorial Public Library | NY | WordPress-NY | 2 |
| Westchester Library System | NY | WordPress-NY | 0 |
| Westport Library Association | NY | WordPress-NY | 0 |
| White Plains Public Library | NY | WordPress-NY | 0 |
| Whitesville Public Library | NY | WordPress-NY | 0 |
| Wide Awake Club Library | NY | WordPress-NY | 0 |
| William H. Bush Memorial Library | NY | WordPress-NY | 0 |
| William K Sanford Town Library | NY | WordPress-NY | 1 |
| Williamson Free Public Library | NY | WordPress-NY | 0 |
| Williamstown Library | NY | WordPress-NY | 150 |
| Williston Park Public Library | NY | WordPress-NY | 60 |
| Wilmington E.M. Cooper Memorial Public Library | NY | WordPress-NY | 10 |
| Wilson Free Library | NY | WordPress-NY | 0 |
| Windham Public Library | NY | WordPress-NY | 2 |
| Wolcott Civic Free Library | NY | WordPress-NY | 2 |
| Womens Round Lake Improvement Society Lib | NY | WordPress-NY | 3 |
| Woodgate Free Library | NY | WordPress-NY | 0 |
| Woodward Memorial Library | NY | WordPress-NY | 8 |
| Worcester Free Library | NY | WordPress-NY | 0 |
| Wyandanch Public Library | NY | WordPress-NY | 0 |
| Yonkers Public Library | NY | WordPress-NY | 42 |
| Your Home Public Library | NY | WordPress-NY | 0 |
## 2026-08-28

Group 1 rotation, started 07:00:01Z. 616 per-site rows from 34 library scrapers with per-site log output; 310 zero-event sites. This section opens a fresh cycle - the previous Group 1 pass was `## 2026-08-25`. The rotation was still running when this section was built (MacaroniKid Group 1 started 18:02:02Z), so its sites land in the next section.

**Correction applied this run:** `Clay County Public Library` was listed under LibCal-**KY** pointing at `claycountygov.libcal.com`, which is Clay County **FLORIDA** - branch list Fleming Island, Green Cove Springs, Keystone Heights, Middleburg-Clay Hill, Orange Park, contact domain claycountygov.com. The entry has been moved to the FL section and the 14 Florida events it had filed under Manchester, KY were purged. It appears in today's table under LibCal-KY because that is what actually ran this morning; from the next Group 3 rotation it reports as LibCal-FL. Clay County **Kentucky** is now an explicit open coverage gap.

| Library Website | State | Scraper | Events Found |
|---|---|---|---|
| Anne Arundel County Library events | — | AACPL | 23 |
| Kenton County Public Library | KY | BiblioCommons-KY | 500 |
| Laurel County Public Library | KY | BiblioCommons-KY | 205 |
| Burlington County Library System | NJ | BiblioCommons-NJ | 485 |
| Central Rappahannock Regional Library | VA | BiblioCommons-VA | 499 |
| Colonial Heights Public Library | VA | CivicEngage-Libraries | 0 |
| Williamson County Public Library | TN | CivicEngage-Libraries | 0 |
| Hartford Public Library | CT | Communico-CT | 12 |
| DC Public Library | DC | Communico-DC | 25 |
| Worcester Public Library | MA | Communico-MA | 5 |
| Forsyth County Public Library | NC | Communico-NC | 3 |
| Loudoun County Public Library | VA | Communico-VA | 8 |
| Prince William Public Library | VA | Communico-VA | 3 |
| Library System of Lancaster County | PA | Drupal-Pennsylvania | 1234 |
| York County Libraries | PA | Drupal-Pennsylvania | 646 |
| Lexington County Public Library | SC | EventON-Lexington | 1000 |
| Coverage: Fairfax County, Virginia | — | Fairfax-Parks | 20 |
| Alabama | AL | FairsFestivals-Eastern | 56 |
| Connecticut | CT | FairsFestivals-Eastern | 193 |
| Delaware | DE | FairsFestivals-Eastern | 29 |
| District of Columbia | DC | FairsFestivals-Eastern | 5 |
| Florida | FL | FairsFestivals-Eastern | 560 |
| Georgia | GA | FairsFestivals-Eastern | 187 |
| Illinois | IL | FairsFestivals-Eastern | 369 |
| Indiana | IN | FairsFestivals-Eastern | 175 |
| Kentucky | KY | FairsFestivals-Eastern | 82 |
| Maine | ME | FairsFestivals-Eastern | 106 |
| Maryland | MD | FairsFestivals-Eastern | 153 |
| Massachusetts | MA | FairsFestivals-Eastern | 194 |
| Michigan | MI | FairsFestivals-Eastern | 371 |
| Mississippi | MS | FairsFestivals-Eastern | 26 |
| New Hampshire | NH | FairsFestivals-Eastern | 69 |
| New Jersey | NJ | FairsFestivals-Eastern | 177 |
| New York | NY | FairsFestivals-Eastern | 407 |
| North Carolina | NC | FairsFestivals-Eastern | 421 |
| Ohio | OH | FairsFestivals-Eastern | 470 |
| Pennsylvania | PA | FairsFestivals-Eastern | 387 |
| Rhode Island | RI | FairsFestivals-Eastern | 53 |
| South Carolina | SC | FairsFestivals-Eastern | 102 |
| Tennessee | TN | FairsFestivals-Eastern | 180 |
| Vermont | VT | FairsFestivals-Eastern | 45 |
| Virginia | VA | FairsFestivals-Eastern | 261 |
| West Virginia | WV | FairsFestivals-Eastern | 21 |
| Wisconsin | WI | FairsFestivals-Eastern | 322 |
| Blue Ridge Regional Library | VA | FullCalendar-Libraries | 293 |
| Appoquinimink Public Library | DE | LibCal-DE | 105 |
| Bear Library | DE | LibCal-DE | 183 |
| Brandywine Hundred Library | DE | LibCal-DE | 19 |
| Bridgeville Public Library | DE | LibCal-DE | 68 |
| Claymont Library | DE | LibCal-DE | 18 |
| Delaware Libraries | DE | LibCal-DE | 20 |
| Dover Public Library | DE | LibCal-DE | 27 |
| Elsmere Library | DE | LibCal-DE | 9 |
| Hockessin Library | DE | LibCal-DE | 17 |
| Kirkwood Library | DE | LibCal-DE | 64 |
| Newark Free Library | DE | LibCal-DE | 29 |
| Woodlawn Library | DE | LibCal-DE | 8 |
| Boone County Public Library | KY | LibCal-KY | 0 |
| Clay County Public Library | KY | LibCal-KY | 20 |
| Kenton County Public Library | KY | LibCal-KY | 0 |
| Warren County Public Library | KY | LibCal-KY | 0 |
| Alamance County Library | NC | LibCal-NC | 48 |
| Brunswick County Public Library | NC | LibCal-NC | 10 |
| Craven-Pamlico Regional Library | NC | LibCal-NC | 0 |
| Durham County Library | NC | LibCal-NC | 20 |
| Gaston County Public Library | NC | LibCal-NC | 20 |
| Henderson County Public Library | NC | LibCal-NC | 5 |
| Iredell County Public Library | NC | LibCal-NC | 48 |
| New Hanover County Public Library | NC | LibCal-NC | 20 |
| Union County Public Library | NC | LibCal-NC | 25 |
| Concord Public Library | — | LibCal-NH | 48 |
| Hollis Social Library | — | LibCal-NH | 48 |
| Hooksett Public Library | — | LibCal-NH | 48 |
| Keene Public Library | — | LibCal-NH | 48 |
| Lebanon Public Libraries | — | LibCal-NH | 48 |
| Manchester City Library | — | LibCal-NH | 48 |
| Merrimack Public Library | — | LibCal-NH | 48 |
| Nashua Public Library | — | LibCal-NH | 48 |
| Pelham Public Library | — | LibCal-NH | 48 |
| Baldwin Public Library | NY | LibCal-NY2 | 0 |
| Dansville Public Library | NY | LibCal-NY2 | 20 |
| East Meadow Public Library | NY | LibCal-NY2 | 20 |
| Gardiner Library | NY | LibCal-NY2 | 20 |
| Highland Public Library | NY | LibCal-NY2 | 20 |
| Levittown Public Library | NY | LibCal-NY2 | 173 |
| Marcellus Free Library | NY | LibCal-NY2 | 20 |
| North Bellmore Public Library | NY | LibCal-NY2 | 20 |
| North Merrick Public Library | NY | LibCal-NY2 | 20 |
| Oceanside Public Library | NY | LibCal-NY2 | 20 |
| Plainview-Old Bethpage Public Library | NY | LibCal-NY2 | 154 |
| Rockville Centre Public Library | NY | LibCal-NY2 | 20 |
| Wantagh Public Library | NY | LibCal-NY2 | 20 |
| Barrington Public Library | RI | LibCal-RI | 20 |
| Coventry Public Library | RI | LibCal-RI | 20 |
| Cranston Public Library | RI | LibCal-RI | 20 |
| Cumberland Public Library | RI | LibCal-RI | 25 |
| East Providence Public Library | RI | LibCal-RI | 20 |
| Newport Public Library | RI | LibCal-RI | 20 |
| North Kingstown Free Library | RI | LibCal-RI | 0 |
| Pawtucket Public Library | RI | LibCal-RI | 10 |
| Rogers Free Library | RI | LibCal-RI | 20 |
| Warwick Public Library | RI | LibCal-RI | 20 |
| West Warwick Public Library | RI | LibCal-RI | 20 |
| Amherst County Public Library | VA | LibraryCalendar-Libraries | 22 |
| Appomattox Regional Library | VA | LibraryCalendar-Libraries | 14 |
| Atlantic County Library System | NJ | LibraryCalendar-Libraries | 23 |
| Bedford Public Library System | VA | LibraryCalendar-Libraries | 18 |
| Bloomingdale Public Library | IL | LibraryCalendar-Libraries | 20 |
| Carnegie Library of McKeesport | PA | LibraryCalendar-Libraries | 14 |
| Caroline County Public Library | MD | LibraryCalendar-Libraries | 18 |
| Cumberland County Public Library | NC | LibraryCalendar-Libraries | 23 |
| Essex Public Library | VA | LibraryCalendar-Libraries | 17 |
| Forsyth County Public Library | NC | LibraryCalendar-Libraries | 24 |
| Frederick County Public Libraries | MD | LibraryCalendar-Libraries | 21 |
| Gloucester County Library System | NJ | LibraryCalendar-Libraries | 20 |
| Grant County Public Library | KY | LibraryCalendar-Libraries | 13 |
| Haverstraw King's Daughters Public Library | NY | LibraryCalendar-Libraries | 18 |
| Howard County Library System | MD | LibraryCalendar-Libraries | 19 |
| Jessamine County Public Library | KY | LibraryCalendar-Libraries | 18 |
| Lynchburg Public Library | VA | LibraryCalendar-Libraries | 15 |
| Monroeville Public Library | PA | LibraryCalendar-Libraries | 14 |
| Petersburg Public Library | VA | LibraryCalendar-Libraries | 8 |
| Poquoson Public Library | VA | LibraryCalendar-Libraries | 18 |
| Portsmouth Public Library | VA | LibraryCalendar-Libraries | 18 |
| Powhatan County Public Library | VA | LibraryCalendar-Libraries | 15 |
| Rensselaerville Public Library | NY | LibraryCalendar-Libraries | 1 |
| Schenectady County Public Library | NY | LibraryCalendar-Libraries | 16 |
| Talbot County Free Library | MD | LibraryCalendar-Libraries | 22 |
| Waynesboro Public Library | VA | LibraryCalendar-Libraries | 17 |
| Wilkinsburg Public Library | PA | LibraryCalendar-Libraries | 10 |
| Wyandanch Public Library | NY | LibraryCalendar-Libraries | 18 |
| York County Library | SC | LibraryCalendar-Libraries | 20 |
| York County Public Library | VA | LibraryCalendar-Libraries | 20 |
| Fairfield Public Library | — | LibraryMarket-CT | 112 |
| Ferguson Library | — | LibraryMarket-CT | 24 |
| Meriden Public Library | — | LibraryMarket-CT | 6 |
| New Britain Public Library | — | LibraryMarket-CT | 23 |
| West Hartford Public Library | — | LibraryMarket-CT | 34 |
| Beaufort County Library | — | LibraryMarket-SC | 34 |
| Sumter County Library | — | LibraryMarket-SC | 8 |
| Spartanburg County Public Libraries | SC | Trumba-Spartanburg | 573 |
| Academy of Natural Sciences | PA | Venue-Events-ScienceArts | 10 |
| Adler Planetarium | IL | Venue-Events-ScienceArts | 7 |
| American Museum of Natural History | NY | Venue-Events-ScienceArts | 13 |
| Art Institute of Chicago | IL | Venue-Events-ScienceArts | 0 |
| Bishop Museum of Science & Nature | FL | Venue-Events-ScienceArts | 21 |
| Connecticut Science Center | CT | Venue-Events-ScienceArts | 19 |
| Conner Prairie Living History | IN | Venue-Events-ScienceArts | 8 |
| Corning Museum of Glass | NY | Venue-Events-ScienceArts | 77 |
| EcoTarium | MA | Venue-Events-ScienceArts | 0 |
| Fernbank Museum of Natural History | GA | Venue-Events-ScienceArts | 0 |
| Field Museum | IL | Venue-Events-ScienceArts | 1 |
| Franklin Institute | PA | Venue-Events-ScienceArts | 0 |
| Frost Science Museum | FL | Venue-Events-ScienceArts | 46 |
| Great Lakes Science Center | OH | Venue-Events-ScienceArts | 6 |
| Griffin Museum of Science and Industry | IL | Venue-Events-ScienceArts | 0 |
| Henry Ford Museum | MI | Venue-Events-ScienceArts | 1 |
| Imagination Station | OH | Venue-Events-ScienceArts | 0 |
| Impression 5 Science Center | MI | Venue-Events-ScienceArts | 1 |
| Indiana State Museum | IN | Venue-Events-ScienceArts | 14 |
| Intrepid Sea Air & Space Museum | NY | Venue-Events-ScienceArts | 0 |
| Kamin Science Center | PA | Venue-Events-ScienceArts | 0 |
| Kennedy Space Center Visitor Complex | FL | Venue-Events-ScienceArts | 62 |
| Maryland Science Center | MD | Venue-Events-ScienceArts | 8 |
| McAuliffe-Shepard Discovery Center | NH | Venue-Events-ScienceArts | 1 |
| Michigan Science Center | MI | Venue-Events-ScienceArts | 13 |
| Milwaukee Art Museum | WI | Venue-Events-ScienceArts | 20 |
| Museum of Science & Industry | FL | Venue-Events-ScienceArts | 1 |
| Museum of Science Boston | MA | Venue-Events-ScienceArts | 1 |
| National Building Museum | DC | Venue-Events-ScienceArts | 0 |
| NC Museum of Natural Sciences | NC | Venue-Events-ScienceArts | 20 |
| New York Hall of Science | NY | Venue-Events-ScienceArts | 1 |
| Science Museum of Virginia | VA | Venue-Events-ScienceArts | 8 |
| Smithsonian Air & Space Museum | DC | Venue-Events-ScienceArts | 10 |
| Smithsonian Natural History Museum | DC | Venue-Events-ScienceArts | 28 |
| Tellus Science Museum | GA | Venue-Events-ScienceArts | 14 |
| Tennessee State Museum | TN | Venue-Events-ScienceArts | 1 |
| Virginia Museum of Natural History | VA | Venue-Events-ScienceArts | 6 |
| Yale Peabody Museum | CT | Venue-Events-ScienceArts | 1 |
| ABBE Regional Library System | SC | WordPress-Abbe-Regional | 20 |
| Abbeville Memorial Library | — | WordPress-AL | 7 |
| Akron Public Library | AL | WordPress-AL | 0 |
| Andalusia Public Library | — | WordPress-AL | 0 |
| Athens-Limestone Public Library | — | WordPress-AL | 0 |
| Auburn Public Library | — | WordPress-AL | 1 |
| Birmingham Public Library | — | WordPress-AL | 1 |
| Blanche R. Solomon Memorial Library | — | WordPress-AL | 0 |
| Bridgeport - Lena Cagle Public Library | AL | WordPress-AL | 0 |
| Burchell Campbell Memorial Library | AL | WordPress-AL | 0 |
| Butler County Public Library | AL | WordPress-AL | 0 |
| Chelsea Public Library | AL | WordPress-AL | 0 |
| Choctaw County Public Library | AL | WordPress-AL | 0 |
| City Of Bayou La Batre Public Library | — | WordPress-AL | 0 |
| Clay Public Library | — | WordPress-AL | 0 |
| Collinsville Public Library | — | WordPress-AL | 0 |
| Daleville Public Library | — | WordPress-AL | 1 |
| Daphne Public Library | — | WordPress-AL | 0 |
| Decatur Public Library | — | WordPress-AL | 35 |
| Doris Stanley Memorial Library | — | WordPress-AL | 1 |
| Dothan Houston County Library System | — | WordPress-AL | 76 |
| Evergreen Public Library | — | WordPress-AL | 0 |
| Fairhope Public Library | — | WordPress-AL | 150 |
| Florence-Lauderdale Public Library | — | WordPress-AL | 0 |
| Foley Public Library | — | WordPress-AL | 0 |
| Gardendale Public Library | — | WordPress-AL | 1 |
| Grant Public Library | — | WordPress-AL | 0 |
| Guntersville Public Library | — | WordPress-AL | 0 |
| H. Grady Bradshaw - Chambers County Library | — | WordPress-AL | 1 |
| Hale County Library | AL | WordPress-AL | 0 |
| Hartford - Mcgregor-Mckinney Public Library | AL | WordPress-AL | 0 |
| Hoover Public Library | — | WordPress-AL | 4 |
| Houston-Love Memorial Library - Columbia | AL | WordPress-AL | 0 |
| Hueytown Public Library | — | WordPress-AL | 0 |
| Huntsville-Madison County Public Library | — | WordPress-AL | 12 |
| Irondale Public Library | — | WordPress-AL | 0 |
| Jane B. Holmes Public Library | — | WordPress-AL | 0 |
| Jane Culbreth Library | — | WordPress-AL | 0 |
| Jefferson County Library Cooperative | — | WordPress-AL | 0 |
| Kennedy Public Library | AL | WordPress-AL | 0 |
| Lafayette Pilot Public Library | — | WordPress-AL | 0 |
| Leighton Public Library | — | WordPress-AL | 21 |
| Madison Public Library | AL | WordPress-AL | 0 |
| Marion-Perry County Library | AL | WordPress-AL | 0 |
| Millbrook Public Library | AL | WordPress-AL | 0 |
| Mobile Public Library | — | WordPress-AL | 33 |
| Montgomery City-County Public Library | — | WordPress-AL | 42 |
| Newton Public Library | AL | WordPress-AL | 0 |
| Northwest Regional Library | — | WordPress-AL | 0 |
| Opp Public Library | — | WordPress-AL | 0 |
| Orange Beach Public Library | — | WordPress-AL | 0 |
| Piedmont Public Library | AL | WordPress-AL | 0 |
| Ruby Pickens Tartt Public Library | AL | WordPress-AL | 0 |
| Satsuma Public Library | — | WordPress-AL | 0 |
| Scottsboro Public Library | — | WordPress-AL | 0 |
| Selma-Dallas County Public Library | — | WordPress-AL | 1 |
| Sheffield Public Library | AL | WordPress-AL | 0 |
| Stevenson Public Library | — | WordPress-AL | 0 |
| Trussville Public Library | — | WordPress-AL | 4 |
| Tuscaloosa Public Library | — | WordPress-AL | 150 |
| Vernon - Mary Wallace Cobb Memorial Library | AL | WordPress-AL | 0 |
| Vestavia Hills Library | — | WordPress-AL | 150 |
| Walter J. Hanna Memorial Library | — | WordPress-AL | 0 |
| Warrior Public Library | — | WordPress-AL | 0 |
| Wilcox County Library | AL | WordPress-AL | 0 |
| Wilsonville - Vernice Stoudenmire Library | AL | WordPress-AL | 0 |
| Andover Public Library | CT | WordPress-CT | 0 |
| Ansonia Public Library | CT | WordPress-CT | 0 |
| Beacon Falls Public Library | CT | WordPress-CT | 0 |
| Beardsley Memorial Library | CT | WordPress-CT | 0 |
| Bethel Public Library | CT | WordPress-CT | 0 |
| Bethlehem Public Library | CT | WordPress-CT | 0 |
| Bill Library | CT | WordPress-CT | 1 |
| Bridgeport Public Library | CT | WordPress-CT | 0 |
| Bristol Public Library | CT | WordPress-CT | 222 |
| Brookfield Library | CT | WordPress-CT | 93 |
| Canterbury Public Library | CT | WordPress-CT | 0 |
| Cheshire Public Library | CT | WordPress-CT | 2 |
| Chester Public Library | CT | WordPress-CT | 0 |
| Clark Memorial Library | CT | WordPress-CT | 10 |
| Community Branch Library | CT | WordPress-CT | 1 |
| Cornwall Library Association | CT | WordPress-CT | 18 |
| Cyrenius H. Booth Library | CT | WordPress-CT | 0 |
| Danbury Public Library | CT | WordPress-CT | 0 |
| Darien Library | CT | WordPress-CT | 20 |
| Douglas Library Of Hebron | CT | WordPress-CT | 0 |
| Durham Public Library | CT | WordPress-CT | 48 |
| E.C. Scranton Memorial Library | CT | WordPress-CT | 0 |
| East Hampton Public Library | CT | WordPress-CT | 0 |
| East Hartford Public Library | CT | WordPress-CT | 0 |
| Easton Public Library | CT | WordPress-CT | 0 |
| Edith Wheeler Memorial Library | CT | WordPress-CT | 0 |
| Enfield Public Library | CT | WordPress-CT | 6 |
| Essex Library Association | CT | WordPress-CT | 0 |
| Fairfield Public Library | CT | WordPress-CT | 0 |
| Farmington Library | CT | WordPress-CT | 0 |
| Frederick H. Cossitt Library | CT | WordPress-CT | 0 |
| Goshen Public Library | CT | WordPress-CT | 0 |
| Greenwich Library | CT | WordPress-CT | 0 |
| Hartford Public Library | CT | WordPress-CT | 0 |
| Hartland Public Library | CT | WordPress-CT | 0 |
| Harwinton Public Library | CT | WordPress-CT | 105 |
| Henry Carter Hull Library | CT | WordPress-CT | 0 |
| Ivoryton Library Association | CT | WordPress-CT | 0 |
| Janet Carlson Calvert Library | CT | WordPress-CT | 0 |
| Jonathan Trumbull Library | CT | WordPress-CT | 0 |
| Kent Library Association | CT | WordPress-CT | 65 |
| Kent Memorial Library | CT | WordPress-CT | 0 |
| Killingworth Library | CT | WordPress-CT | 0 |
| Louis Piantino Branch Library | CT | WordPress-CT | 0 |
| Manchester Public Library | CT | WordPress-CT | 9 |
| Middlebury Public Library | CT | WordPress-CT | 24 |
| Middletown Public Library | CT | WordPress-CT | 1 |
| Milford Public Library | CT | WordPress-CT | 0 |
| Minor Memorial Library | CT | WordPress-CT | 46 |
| Mystic Noank Library | CT | WordPress-CT | 0 |
| New Britain Public Library | CT | WordPress-CT | 58 |
| New Canaan Library | CT | WordPress-CT | 80 |
| New Fairfield Free Public Library | CT | WordPress-CT | 5 |
| New Haven Free Public Library | CT | WordPress-CT | 1 |
| New Milford Public Library | CT | WordPress-CT | 1 |
| Norfolk Library | CT | WordPress-CT | 12 |
| North Haven Memorial Library | CT | WordPress-CT | 0 |
| Norwalk Public Library | CT | WordPress-CT | 3 |
| Oakville Branch Library | CT | WordPress-CT | 0 |
| Old Lyme - Phoebe Griffin Noyes Library | CT | WordPress-CT | 0 |
| Otis Library | CT | WordPress-CT | 40 |
| Pequot Library Association | CT | WordPress-CT | 0 |
| Plainville Public Library | CT | WordPress-CT | 0 |
| Pomfret Public Library | CT | WordPress-CT | 0 |
| Preston Public Library | CT | WordPress-CT | 1 |
| Public Library Of New London | CT | WordPress-CT | 0 |
| Ridgefield Library | CT | WordPress-CT | 10 |
| Salem Free Public Library | CT | WordPress-CT | 0 |
| Saxton B. Little Free Library | CT | WordPress-CT | 0 |
| Scoville Memorial Library | CT | WordPress-CT | 0 |
| Shelton Public Library | CT | WordPress-CT | 34 |
| Sherman Library Assn. | CT | WordPress-CT | 1 |
| South Windsor Public Library | CT | WordPress-CT | 67 |
| Southbury Public Library | CT | WordPress-CT | 62 |
| Southington Public Library | CT | WordPress-CT | 0 |
| Stafford Library Association | CT | WordPress-CT | 1 |
| Stonington Free Library | CT | WordPress-CT | 0 |
| Stratford Library | CT | WordPress-CT | 1 |
| Thomaston Public Library | CT | WordPress-CT | 0 |
| Torrington Library | CT | WordPress-CT | 0 |
| Trumbull Library | CT | WordPress-CT | 0 |
| Union Free Public Library | CT | WordPress-CT | 0 |
| Vernon Public Library | CT | WordPress-CT | 0 |
| Wallingford Public Library | CT | WordPress-CT | 30 |
| Warren Public Library | CT | WordPress-CT | 0 |
| Waterbury Public Library | CT | WordPress-CT | 0 |
| Waterford Public Library | CT | WordPress-CT | 0 |
| West Hartford Public Library | CT | WordPress-CT | 76 |
| Westbrook Public Library | CT | WordPress-CT | 125 |
| Westport Library | CT | WordPress-CT | 15 |
| Willimantic Public Library | CT | WordPress-CT | 20 |
| Wilson Branch Library | CT | WordPress-CT | 0 |
| Wilton Library Association | CT | WordPress-CT | 1 |
| Windham Free Library | CT | WordPress-CT | 10 |
| Windsor Locks Public Library | CT | WordPress-CT | 0 |
| Wolcott Public Library | CT | WordPress-CT | 1 |
| Woodbury Public Library | CT | WordPress-CT | 0 |
| Alma-Bacon County Public Library | GA | WordPress-GA | 4 |
| Appleby Branch | GA | WordPress-GA | 1 |
| Athens Regional Library System | GA | WordPress-GA | 38 |
| Baker County | GA | WordPress-GA | 0 |
| Boston Carnegie Library | GA | WordPress-GA | 20 |
| Bowman Branch | GA | WordPress-GA | 34 |
| Brooks County Public Library System | GA | WordPress-GA | 0 |
| Brunswick Glynn County Regional Library | GA | WordPress-GA | 1 |
| Butler Public Library | GA | WordPress-GA | 0 |
| Byron Public Library | GA | WordPress-GA | 75 |
| Cedartown Library | GA | WordPress-GA | 10 |
| Centerville Branch Library | GA | WordPress-GA | 0 |
| Chattahoochee Valley Regional Library System | GA | WordPress-GA | 0 |
| Chattooga County Library System | GA | WordPress-GA | 0 |
| Cherokee Regional Library System | GA | WordPress-GA | 1 |
| Clarkesville-Habersham Co. Lib. | GA | WordPress-GA | 0 |
| Clarkston Branch | GA | WordPress-GA | 1 |
| Clermont Library | GA | WordPress-GA | 0 |
| Commerce Public Library | GA | WordPress-GA | 0 |
| Coolidge Public Library | GA | WordPress-GA | 0 |
| Cornelia-Habersham Co. Lib. | GA | WordPress-GA | 0 |
| Covington Branch | GA | WordPress-GA | 2 |
| Dalton-Whitfield County Public Library | GA | WordPress-GA | 0 |
| Douglas-Coffee County Public Library | GA | WordPress-GA | 0 |
| Duluth | GA | WordPress-GA | 0 |
| Effingham | GA | WordPress-GA | 0 |
| Elizabeth Harris Library | GA | WordPress-GA | 0 |
| Gibbs Memorial Library | GA | WordPress-GA | 0 |
| Gordon Public Library | GA | WordPress-GA | 0 |
| Grantville Public Library | GA | WordPress-GA | 5 |
| Greene County Library | GA | WordPress-GA | 0 |
| Greenville Area Public Library | GA | WordPress-GA | 0 |
| Hancock County Library | GA | WordPress-GA | 0 |
| Harlie Fulford Memorial Library | GA | WordPress-GA | 1 |
| Heard County Public Library | GA | WordPress-GA | 0 |
| Hickory Flat Public Library | GA | WordPress-GA | 0 |
| Hightower Memorial Library | GA | WordPress-GA | 0 |
| Houston County Public Libraries System | GA | WordPress-GA | 0 |
| Ida Hilton Public Library | GA | WordPress-GA | 0 |
| Jefferson County Library System | GA | WordPress-GA | 1 |
| Lagrange Memorial Library | GA | WordPress-GA | 0 |
| Lake Sinclair Library | GA | WordPress-GA | 0 |
| Laurens County Library | GA | WordPress-GA | 0 |
| Lewis A. Ray Library | GA | WordPress-GA | 0 |
| Marion County Library | GA | WordPress-GA | 0 |
| Meigs Public Library | GA | WordPress-GA | 4 |
| Middle Georgia Regional Library System | GA | WordPress-GA | 0 |
| Miller Lakeland Library | GA | WordPress-GA | 1 |
| Monroe County Library | GA | WordPress-GA | 0 |
| Monroe-Walton County Library | GA | WordPress-GA | 0 |
| Morgan County Library | GA | WordPress-GA | 0 |
| Nelle Brown Memorial Public Library | GA | WordPress-GA | 0 |
| New Georgia Public Library | GA | WordPress-GA | 2 |
| Oglethorpe County Library | GA | WordPress-GA | 0 |
| Parks Memorial Library | GA | WordPress-GA | 0 |
| Riverdale Branch Library | GA | WordPress-GA | 0 |
| Rockmart Library | GA | WordPress-GA | 0 |
| Rossville Public Library | GA | WordPress-GA | 0 |
| Scottdale-Tobie Grant Branch | GA | WordPress-GA | 0 |
| Senoia Area Public Library | GA | WordPress-GA | 5 |
| Thomson-Mcduffie County Library | GA | WordPress-GA | 0 |
| Warren P. Sewell Memorial Library-Bremen | GA | WordPress-GA | 14 |
| Wayne County Library | GA | WordPress-GA | 1 |
| Wheeler County Library | GA | WordPress-GA | 0 |
| White County Public Library-Cleveland Branch | GA | WordPress-GA | 0 |
| Wilcox County Public Library | GA | WordPress-GA | 8 |
| Alleghany County Public Library | NC | WordPress-NC | 0 |
| Bath Community Library | NC | WordPress-NC | 0 |
| Beatties Ford Road Branch Library | NC | WordPress-NC | 1 |
| Belmont Branch Library | NC | WordPress-NC | 9 |
| Black Creek Branch Library | NC | WordPress-NC | 50 |
| Blanche Benjamin Branch Library | NC | WordPress-NC | 0 |
| Boonville Community Public Library | NC | WordPress-NC | 0 |
| Brunswick County Library | NC | WordPress-NC | 0 |
| Bunn Branch Library | NC | WordPress-NC | 0 |
| Carver Branch Library | NC | WordPress-NC | 0 |
| Cary Branch Library | NC | WordPress-NC | 4 |
| Catawba County Library | NC | WordPress-NC | 2 |
| Claremont Branch Library | NC | WordPress-NC | 2 |
| Cleveland County Memorial Library | NC | WordPress-NC | 0 |
| Craven-Pamlico-Carteret Regional Library | NC | WordPress-NC | 0 |
| Dallas Branch Library | NC | WordPress-NC | 9 |
| Danbury Public Library | NC | WordPress-NC | 0 |
| Davidson County Public Library System | NC | WordPress-NC | 0 |
| Dobson Community Library | NC | WordPress-NC | 0 |
| East Branch Library | NC | WordPress-NC | 50 |
| Farmville Public Library | NC | WordPress-NC | 0 |
| Florence S. Shanklin Branch Library | NC | WordPress-NC | 28 |
| Franklin County Library | NC | WordPress-NC | 5 |
| Graham Public Library | NC | WordPress-NC | 0 |
| Harmony Branch Library | NC | WordPress-NC | 0 |
| Havelock-Craven County Public | NC | WordPress-NC | 0 |
| Hazel W. Guilford Memorial Library | NC | WordPress-NC | 0 |
| Hickory Public Library | NC | WordPress-NC | 0 |
| Hudson Branch Library | NC | WordPress-NC | 0 |
| J.C. Holliday Library | NC | WordPress-NC | 0 |
| John W. Clark Public Library | NC | WordPress-NC | 0 |
| King Public Library | NC | WordPress-NC | 0 |
| La Grange Branch Library | NC | WordPress-NC | 0 |
| Lawrence Memorial Library | NC | WordPress-NC | 0 |
| Leland Branch Library | NC | WordPress-NC | 0 |
| Littleton Public Library (Wc Jones Memorial) | NC | WordPress-NC | 0 |
| Lowell Branch Library | NC | WordPress-NC | 9 |
| Macon County Public Library | NC | WordPress-NC | 0 |
| Madison Branch Library | NC | WordPress-NC | 0 |
| Madison County Public Library | NC | WordPress-NC | 0 |
| Margaret Little Blount Library | NC | WordPress-NC | 0 |
| Mary Duncan Public Library | NC | WordPress-NC | 0 |
| Mcdowell County Law Library | NC | WordPress-NC | 0 |
| Mooresville Public Library | NC | WordPress-NC | 1 |
| Myrtle Grove Branch | NC | WordPress-NC | 9 |
| Norwood Branch Library | NC | WordPress-NC | 0 |
| Pettigrew Regional Library | NC | WordPress-NC | 0 |
| Polk County Public Library | NC | WordPress-NC | 0 |
| Princeton Public Library | NC | WordPress-NC | 0 |
| Public Library Of Johnston County Smithfield | NC | WordPress-NC | 0 |
| Roanoke Rapids Public Library | NC | WordPress-NC | 4 |
| Rowan Public Library | NC | WordPress-NC | 0 |
| Selma Public Library | NC | WordPress-NC | 0 |
| Spring Lake Branch | NC | WordPress-NC | 0 |
| Stanley Branch Library | NC | WordPress-NC | 9 |
| Star Branch | NC | WordPress-NC | 0 |
| Tyrrell County Library | NC | WordPress-NC | 0 |
| Union County Public Library | NC | WordPress-NC | 0 |
| Union West Branch Library | NC | WordPress-NC | 0 |
| Warsaw-Kornegay Public Library | NC | WordPress-NC | 0 |
| Watauga County Public Library | NC | WordPress-NC | 0 |
| Wayne County Public Library, Fremont | NC | WordPress-NC | 2 |
| Adams Memorial Library | — | WordPress-TN | 1 |
| Alexandria Branch Library | — | WordPress-TN | 0 |
| Athens Public Library | — | WordPress-TN | 1 |
| Auburntown Public Library | — | WordPress-TN | 1 |
| Audrey Pack Memorial Library | TN | WordPress-TN | 0 |
| Bartlett Library | — | WordPress-TN | 0 |
| Baxter Branch Library | TN | WordPress-TN | 0 |
| Benton County Library | TN | WordPress-TN | 0 |
| Blount County Public Library | — | WordPress-TN | 0 |
| Carroll County Library | TN | WordPress-TN | 0 |
| Chattanooga Public Library | — | WordPress-TN | 150 |
| Clarksville-Montgomery County Public Library | — | WordPress-TN | 0 |
| Cleveland-Bradley County Public Library | — | WordPress-TN | 1 |
| Clinton Public Library | TN | WordPress-TN | 0 |
| Coffee County Lannom Memorial Public Library | — | WordPress-TN | 0 |
| Collierville Burch Library | — | WordPress-TN | 0 |
| Crockett County Library | — | WordPress-TN | 0 |
| Crossville-Cumberland County Public Library | — | WordPress-TN | 0 |
| Franklin County Public Library | TN | WordPress-TN | 0 |
| Franklin Public Library | — | WordPress-TN | 0 |
| Germantown Community Library | TN | WordPress-TN | 0 |
| Gleason Memorial Library | — | WordPress-TN | 0 |
| Hamilton Parks Public Library | — | WordPress-TN | 1 |
| Harriman Public Library | — | WordPress-TN | 0 |
| Hendersonville Public Library | — | WordPress-TN | 0 |
| Hickman County Public Library | — | WordPress-TN | 0 |
| Humphreys County Public Library | — | WordPress-TN | 0 |
| Johnson City Public Library | — | WordPress-TN | 20 |
| Kingsport Public Library | — | WordPress-TN | 0 |
| Kingston Public Library | TN | WordPress-TN | 0 |
| Knox County Public Library | — | WordPress-TN | 26 |
| Lauderdale County Library | — | WordPress-TN | 52 |
| Madisonville Public Library | — | WordPress-TN | 0 |
| Mary E. Tippitt Memorial Library | TN | WordPress-TN | 0 |
| Meigs-Decatur Public Library | — | WordPress-TN | 1 |
| Memphis Public Libraries | — | WordPress-TN | 30 |
| Middleton Community Library | — | WordPress-TN | 0 |
| Mildred G. Fields Memorial Library | TN | WordPress-TN | 0 |
| Millard Oakley Public Library | TN | WordPress-TN | 0 |
| Monterey Branch Library | TN | WordPress-TN | 0 |
| Morristown-Hamblen Library | — | WordPress-TN | 0 |
| Mt. Juliet-Harvey Freeman Public Library | — | WordPress-TN | 0 |
| Nashville Public Library | — | WordPress-TN | 1 |
| Nashville Talking Library | TN | WordPress-TN | 0 |
| Newbern City Library | — | WordPress-TN | 0 |
| Parsons Public Library | — | WordPress-TN | 0 |
| Rogersville Public Library | — | WordPress-TN | 0 |
| Rutherford County Library System | — | WordPress-TN | 0 |
| Sam T. Wilson Public Library | TN | WordPress-TN | 0 |
| Savannah-Hardin County Library | — | WordPress-TN | 1 |
| Sequatchie County Public Library | TN | WordPress-TN | 0 |
| Sevier County Public Library System | — | WordPress-TN | 0 |
| Smyrna Public Library | TN | WordPress-TN | 0 |
| Southeast Branch Library | — | WordPress-TN | 0 |
| Spring Hill Public Library | — | WordPress-TN | 0 |
| Sweetwater Public Library | — | WordPress-TN | 1 |
| The Brentwood Library | TN | WordPress-TN | 0 |
| Tipton County Public Library | — | WordPress-TN | 0 |
| Washburn Public Library | — | WordPress-TN | 1 |
| Westmoreland Public Library | — | WordPress-TN | 0 |
| White County Public Library | TN | WordPress-TN | 0 |
| White Pine Public Library | — | WordPress-TN | 1 |
| Winfield Public Library | — | WordPress-TN | 0 |
| Alexandria Library | — | WordPress-VA | 0 |
| Chesapeake Public Library | — | WordPress-VA | 0 |
| Culpeper County Library | — | WordPress-VA | 22 |
| Jefferson-Madison Regional Library | — | WordPress-VA | 0 |
| Manassas Park City Library | — | WordPress-VA | 10 |
| Ainsworth Public | VT | WordPress-VT | 0 |
| Aldrich Public Library | VT | WordPress-VT | 0 |
| Barton Public | VT | WordPress-VT | 0 |
| Bennington Free | VT | WordPress-VT | 1 |
| Benson Public | VT | WordPress-VT | 0 |
| Bent Northrup Memorial | VT | WordPress-VT | 1 |
| Bethel Public | VT | WordPress-VT | 0 |
| Bradford Public | VT | WordPress-VT | 0 |
| Brandon Free Public | VT | WordPress-VT | 0 |
| Brooks Memorial Library | VT | WordPress-VT | 150 |
| Brownell Library | VT | WordPress-VT | 150 |
| Butterfield | VT | WordPress-VT | 0 |
| Cabot Public | VT | WordPress-VT | 0 |
| Charlotte | VT | WordPress-VT | 70 |
| Chelsea Public | VT | WordPress-VT | 0 |
| Cobleigh Public Library | VT | WordPress-VT | 0 |
| Cornwall Free Public | VT | WordPress-VT | 0 |
| Cutler Memorial | VT | WordPress-VT | 0 |
| Deborah Rawson Memorial Library | VT | WordPress-VT | 18 |
| Essex Free | VT | WordPress-VT | 0 |
| Fair Haven Free | VT | WordPress-VT | 0 |
| Fairfax Community | VT | WordPress-VT | 0 |
| Fletcher Free Library | VT | WordPress-VT | 5 |
| Franklin-Grand Isle Bookmobile | VT | WordPress-VT | 121 |
| G. M. Kelley Community | VT | WordPress-VT | 0 |
| Gilman Public Library | VT | WordPress-VT | 0 |
| Glover Public | VT | WordPress-VT | 0 |
| Greensboro Free | VT | WordPress-VT | 0 |
| Hancock Free Public | VT | WordPress-VT | 1 |
| Hartford | VT | WordPress-VT | 0 |
| Hartland Public Library | VT | WordPress-VT | 0 |
| Haskell Free Library | VT | WordPress-VT | 0 |
| Haston | VT | WordPress-VT | 0 |
| Hitchcock Museum | VT | WordPress-VT | 0 |
| Huntington Public | VT | WordPress-VT | 0 |
| Ilsley Public Library | VT | WordPress-VT | 17 |
| Jaquith Public | VT | WordPress-VT | 0 |
| Kellogg-Hubbard Library | VT | WordPress-VT | 150 |
| Lanpher Memorial | VT | WordPress-VT | 1 |
| Latham Memorial | VT | WordPress-VT | 1 |
| Martha Canfield Memorial | VT | WordPress-VT | 0 |
| Moore Free | VT | WordPress-VT | 0 |
| Morrill Mem. Harris | VT | WordPress-VT | 0 |
| Morristown Centennial Library | VT | WordPress-VT | 0 |
| Mount Holly | VT | WordPress-VT | 0 |
| Norman Williams Public Library | VT | WordPress-VT | 150 |
| North Hero Public | VT | WordPress-VT | 1 |
| Norwich Public | VT | WordPress-VT | 1 |
| Peacham | VT | WordPress-VT | 2 |
| Pettee Memorial | VT | WordPress-VT | 1 |
| Pierson Library | VT | WordPress-VT | 2 |
| Pope Memorial | VT | WordPress-VT | 0 |
| Proctor Free | VT | WordPress-VT | 0 |
| Putney Public | VT | WordPress-VT | 41 |
| Quechee | VT | WordPress-VT | 6 |
| Reading Public | VT | WordPress-VT | 1 |
| Readsboro Community | VT | WordPress-VT | 0 |
| Rochester Public | VT | WordPress-VT | 0 |
| Rockingham Free Public Library | VT | WordPress-VT | 12 |
| Roxbury Free | VT | WordPress-VT | 0 |
| Russell Memorial | VT | WordPress-VT | 1 |
| Salisbury Free Public | VT | WordPress-VT | 0 |
| Sheldon Public | VT | WordPress-VT | 0 |
| Shrewsbury | VT | WordPress-VT | 0 |
| Springfield Town Library | VT | WordPress-VT | 2 |
| St. Johnsbury Athenaeum | VT | WordPress-VT | 3 |
| Stamford Community | VT | WordPress-VT | 0 |
| Stowe Free | VT | WordPress-VT | 0 |
| Tenney Memorial | VT | WordPress-VT | 0 |
| Tunbridge Public | VT | WordPress-VT | 34 |
| Vernon Free | VT | WordPress-VT | 0 |
| Warren Public | VT | WordPress-VT | 0 |
| West Hartford | VT | WordPress-VT | 0 |
| Westminster West Public | VT | WordPress-VT | 0 |
| Whiting | VT | WordPress-VT | 0 |
| Windham Town | VT | WordPress-VT | 2 |
| Windsor Public | VT | WordPress-VT | 0 |
| Woodbury Community | VT | WordPress-VT | 1 |

## 2026-08-29

Tail of the Group 1 rotation that started 2026-08-28T10:59:22Z and finished 08-29T08:43:31Z, plus five hand-run recoveries. **The rotation's own per-site output for this window was never captured**: `scraper-stdout.log` stops at 08:43 because that is where `run-scrapers.bat`'s redirection ends, and the four scrapers re-run by hand this morning (LibCal-CT, Communico-VA, LibraryCalendar-Libraries, LibCal-TN) printed to their own consoles. That is the documented `--log` gap in `build-library-site-audit.js`, and it is why a `--since` build over this window returns zero rows rather than an error.

Rather than fall back to aggregates, **LibCal-CT and LibCal-TN were re-run with output captured** and contribute real per-site rows below. Communico-VA and LibraryCalendar-Libraries already have rows earlier in this cycle and are skipped per the one-inventory-per-cycle rule — except for Knox County, which is a genuinely new site (see below).

**Knox County Public Library recovered and relocated.** The LibCal-TN re-run logged `ERR_NAME_NOT_RESOLVED` for `knoxlib.libcal.com`; that host has no DNS record, and the entry's own `website` field (`knoxlibrary.org`) times out. The library is not gone — `knoxlib.org` 301s to `knoxcountylibrary.org`, whose `/events` renders 45 `.lc-event` cards titled "Upcoming Events | Knox County Public Library". That is LibraryCalendar, not LibCal. The entry was **moved** to `scraper-librarycalendar-libraries-MD-VA.js` and the replacement was run before this was written: **16 events, in real age brackets** (Baby Bookworms, Ready Set K Storytime, Toddler Storytime). Note the URL is the library's own domain, not a `{slug}.librarycalendar.com` subdomain — it is a self-hosted instance and must not be "normalized" to the neighbours' pattern.

**Four single-system scrapers still get aggregate rows, not per-site rows.** Assabet-NH-MA, Pratt-Library, FreeLibrary-Philadelphia and Westmoreland-Library ran in this rotation but emit neither the `📍 name … Found N events` nor the `📚 Scraping name…` shape the builder recognises. Assabet is the worst of these: it declares **41 sites** and reports one number for all of them, which is also why `check-scraper-names.js` lists it as COLLAPSED. Their rows below are labelled as scraper aggregates and are **not** per-site counts.

| Library Website | State | Scraper | Events Found |
|---|---|---|---|
| Bridgeport Public Library | CT | LibCal-CT | 10 |
| C.H. Booth Library | CT | LibCal-CT | 20 |
| East Hartford Public Library | CT | LibCal-CT | 20 |
| Greenwich Library | CT | LibCal-CT | 48 |
| Hamden Public Library | CT | LibCal-CT | 48 |
| Killingworth Library Association | CT | LibCal-CT | 48 |
| New Haven Free Public Library | CT | LibCal-CT | 20 |
| Silas Bronson Library | CT | LibCal-CT | 0 |
| Stratford Library | CT | LibCal-CT | 20 |
| Trumbull Library | CT | LibCal-CT | 48 |
| Wethersfield Public Library | CT | LibCal-CT | 17 |
| Clarksville-Montgomery County Public Library | TN | LibCal-TN | 48 |
| Rutherford County Library System | TN | LibCal-TN | 20 |
| Knox County Public Library | TN | LibraryCalendar-Libraries | 16 |
| Assabet Interactive libraries (scraper aggregate, 41 sites) | NH/MA | Assabet-NH-MA | 1716 |
| Enoch Pratt Free Library (scraper aggregate) | MD | Pratt-Library | 2310 |
| Free Library of Philadelphia (scraper aggregate) | PA | FreeLibrary-Philadelphia | 1000 |
| Westmoreland County Libraries (scraper aggregate) | PA | Westmoreland-Library | 24 |

**Zero-event sites this run:** 1 — Silas Bronson Library (CT). Verified: its live LibCal page states no events are scheduled, so the 0 is correct and not an extraction failure.

## 2026-08-30

Group 3 rotation, started 2026-08-30T07:00:01Z. 754 per-site rows from 33 library scrapers with per-site log output; 459 zero-event sites. Third day of the cycle opened by `## 2026-08-28` (Group 1) and continued by `## 2026-08-29` (Group 1 tail + hand-run recoveries). No scraper in today's table already had a row this cycle, so nothing was skipped as a duplicate. The rotation was still running when this section was built — MacaroniKid Group 3 started 11:21:33Z and had completed NJ and VA at that point — so the remaining MacaroniKid states land in the next section.

**Zero-event concentration is entirely the WordPress-{state} family**: 453 of the 459 zeroes come from eight WordPress state files (PA 145/177, MA 136/201, NH 67/105, KY 31/53, SC 25/37, WV 21/37, RI 15/34, DE 13/14). That is the known platform-heterogeneity gap, not a new regression. The other six zeroes are single sites: Peterborough Town Library (Communico-NH), one Communico-NY branch, one LibCal-VA2 branch, two WordPress-Events-Calendar sites, and Berkeley County Library - Sangaree (GoogleCalendar-SC), whose Google calendar is abandoned as recorded on 2026-08-18.

**Eight single-system scrapers ran today and get aggregate rows, not per-site rows** — they emit neither the `📍 name … Found N events` nor the `📚 Scraping name…` shape the builder recognises. Assabet-NH-MA remains the worst: it declares 41 sites and reports one number for all of them, which is also why `check-scraper-names.js` lists it as COLLAPSED.

| Library Website | State | Scraper | Events Found |
|---|---|---|---|
| Boston Public Library | MA | BiblioCommons-MA | 497 |
| Lawrence Public Library | MA | BiblioCommons-MA | 497 |
| Alachua County Library District | FL | Communico-FL | 2 |
| Broward County Library | FL | Communico-FL | 11 |
| Hernando County Public Library | FL | Communico-FL | 105 |
| Hillsborough County Public Library Cooperative | FL | Communico-FL | 36 |
| Jacksonville Public Library | FL | Communico-FL | 21 |
| Largo Public Library | FL | Communico-FL | 2 |
| Martin County Library System | FL | Communico-FL | 3 |
| Miami-Dade Public Library | FL | Communico-FL | 92 |
| Pasco County Libraries | FL | Communico-FL | 8 |
| Anne Arundel County Public Library | MD | Communico-MD | 24 |
| Baltimore County Public Library | MD | Communico-MD | 13 |
| Calvert Library | MD | Communico-MD | 6 |
| Charles County Public Library | MD | Communico-MD | 4 |
| Harford County Public Library | MD | Communico-MD | 9 |
| Montgomery County Public Library | MD | Communico-MD | 12 |
| Prince George's County Memorial Library System | MD | Communico-MD | 19 |
| St. Mary's County Library | MD | Communico-MD | 1 |
| Peterborough Town Library | NH | Communico-NH | 0 |
| Hauppauge Public Library | NY | Communico-NY | 4 |
| Huntington Public Library | NY | Communico-NY | 8 |
| Massapequa Public Library | NY | Communico-NY | 193 |
| Mid-York Library System | NY | Communico-NY | 2 |
| Patchogue-Medford Library | NY | Communico-NY | 3 |
| Poughkeepsie Public Library District | NY | Communico-NY | 24 |
| Richmond Memorial Library | NY | Communico-NY | 2 |
| West Islip Public Library | NY | Communico-NY | 0 |
| Reading Public Library | PA | Communico-PA | 1 |
| Collierville Burch Library | TN | Communico-TN | 2 |
| Bridgeport Public Library | WV | Communico-WV | 2 |
| Handley Regional Library | VA | Drupal-Virginia | 24 |
| Ashby Free Public Library | — | GoogleCalendar-MA | 45 |
| Somerset County Library | — | GoogleCalendar-MD | 165 |
| Berkeley County Library - Sangaree Library | — | GoogleCalendar-SC | 0 |
| Roger Clark Memorial Library | — | GoogleCalendar-VT | 42 |
| Camden County Library System | NJ | Intercept-Camden | 10 |
| Clay County Public Library | FL | LibCal-FL | 20 |
| Lakeland Public Library | FL | LibCal-FL | 20 |
| Marion County Public Library System | FL | LibCal-FL | 10 |
| Palm Beach County Library System | FL | LibCal-FL | 1 |
| Bangor Public Library | ME | LibCal-ME | 12 |
| BCCLS - Bergen County Cooperative Library System | NJ | LibCal-NJ | 3005 |
| Franklin Lakes Public Library | NJ | LibCal-NJ | 20 |
| Glen Ridge Public Library | NJ | LibCal-NJ | 20 |
| Hunterdon County Library | NJ | LibCal-NJ | 48 |
| Jersey City Free Public Library | NJ | LibCal-NJ | 20 |
| Lambertville Free Public Library | NJ | LibCal-NJ | 20 |
| Mercer County Library System | NJ | LibCal-NJ | 20 |
| Monmouth County Library System | NJ | LibCal-NJ | 20 |
| Montclair Public Library | NJ | LibCal-NJ | 20 |
| Newark Public Library | NJ | LibCal-NJ | 20 |
| Ramsey Free Public Library | NJ | LibCal-NJ | 20 |
| Ridgefield Public Library | NJ | LibCal-NJ | 20 |
| Summit Public Library | NJ | LibCal-NJ | 20 |
| Sussex County Library | NJ | LibCal-NJ | 10 |
| Union County Libraries | NJ | LibCal-NJ | 20 |
| West Orange Public Library | NJ | LibCal-NJ | 20 |
| Berkeley County Library System | SC | LibCal-SC | 20 |
| Charleston County Public Library | SC | LibCal-SC | 20 |
| Dorchester County Library | SC | LibCal-SC | 10 |
| Lexington County Public Library | SC | LibCal-SC | 10 |
| South Carolina State Library | SC | LibCal-SC | 20 |
| Arlington County Public Library | VA | LibCal-VA | 20 |
| Fairfax County Public Library | VA | LibCal-VA | 20 |
| Henrico County Public Library | VA | LibCal-VA | 20 |
| Massanutten Regional Library | VA | LibCal-VA | 20 |
| Arlington Public Library | — | LibCal-VA2 | 14 |
| Fairfax County Public Library | — | LibCal-VA2 | 10 |
| Library of Virginia | — | LibCal-VA2 | 20 |
| Norfolk Public Library | — | LibCal-VA2 | 48 |
| Prince William Public Library System | — | LibCal-VA2 | 0 |
| Richmond Public Library | — | LibCal-VA2 | 20 |
| Roanoke Public Libraries | — | LibCal-VA2 | 48 |
| Suffolk Public Library | — | LibCal-VA2 | 20 |
| Williamsburg Regional Library | — | LibCal-VA2 | 5 |
| Buncombe County Libraries | — | LibraryMarket-NC | 6 |
| Hickory Public Library | — | LibraryMarket-NC | 6 |
| Bethlehem Area Public Library | — | LibraryMarket-PA | 24 |
| Lancaster Public Library | — | LibraryMarket-PA | 23 |
| York County Libraries | — | LibraryMarket-PA | 23 |
| Queen Anne's County Library | MD | Squarespace-Libraries | 74 |
| Hampton Public Library | VA | WithApps-Libraries | 8 |
| Dover Public Library | DE | WordPress-DE | 0 |
| Elsmere Library | DE | WordPress-DE | 0 |
| Frankford Public Library | DE | WordPress-DE | 0 |
| Garfield Park Library | DE | WordPress-DE | 0 |
| Georgetown Public Library | DE | WordPress-DE | 0 |
| Hockessin Library | DE | WordPress-DE | 0 |
| Kent County Library | DE | WordPress-DE | 0 |
| Kirkwood Library | DE | WordPress-DE | 0 |
| Laurel Public Library | DE | WordPress-DE | 0 |
| Lewes Public Library | DE | WordPress-DE | 0 |
| Newark Free Library | DE | WordPress-DE | 0 |
| Rehoboth Beach Public Library | DE | WordPress-DE | 96 |
| Wilmington Public Library | DE | WordPress-DE | 0 |
| Woodlawn Library | DE | WordPress-DE | 0 |
| Alleghany Highlands Regional Library | VA | WordPress-Events-Calendar | 7 |
| Blackwater Regional Library | VA | WordPress-Events-Calendar | 50 |
| Bristol Public Library | VA | WordPress-Events-Calendar | 0 |
| Carnegie Library of Pittsburgh | PA | WordPress-Events-Calendar | 10 |
| Charlotte County Library | VA | WordPress-Events-Calendar | 50 |
| Galax-Carroll Regional Library | VA | WordPress-Events-Calendar | 50 |
| Halifax County-South Boston Library | VA | WordPress-Events-Calendar | 3 |
| Heritage Public Library | VA | WordPress-Events-Calendar | 0 |
| Osterhout Free Library | PA | WordPress-Events-Calendar | 19 |
| Pittsylvania County Public Library | VA | WordPress-Events-Calendar | 50 |
| Rappahannock County Library | VA | WordPress-Events-Calendar | 50 |
| Washington County Public Library | VA | WordPress-Events-Calendar | 12 |
| Wythe-Grayson Regional Library | VA | WordPress-Events-Calendar | 50 |
| Adair County Public Library | KY | WordPress-KY | 0 |
| Allen County Public Library | — | WordPress-KY | 1 |
| Auburn Branch | — | WordPress-KY | 0 |
| Boone County Public Library | — | WordPress-KY | 4 |
| Bullitt County Public Library | — | WordPress-KY | 0 |
| Calloway County Public Library | — | WordPress-KY | 0 |
| Campbell County Public Library | — | WordPress-KY | 4 |
| Casey County Public Library | — | WordPress-KY | 12 |
| Christian County Public Library | — | WordPress-KY | 1 |
| Clark County Public Library | — | WordPress-KY | 0 |
| Crittenden County Public Library | KY | WordPress-KY | 0 |
| Cynthiana-Harrison County Public Library | — | WordPress-KY | 0 |
| Daviess County Public Library | — | WordPress-KY | 12 |
| Estill County Public Library | — | WordPress-KY | 0 |
| Florence Branch | KY | WordPress-KY | 0 |
| Floyd County Public Library | — | WordPress-KY | 1 |
| Fulton Public Library | — | WordPress-KY | 0 |
| Gallatin County Public Library | KY | WordPress-KY | 0 |
| Goodnight Memorial Library | KY | WordPress-KY | 0 |
| Grant County Public Library | KY | WordPress-KY | 0 |
| Graves County Public Library | — | WordPress-KY | 55 |
| Greenup County Public Library | — | WordPress-KY | 0 |
| Hardin County Public Library | — | WordPress-KY | 0 |
| Harlan County Public Library | — | WordPress-KY | 0 |
| Henderson County Public Library | — | WordPress-KY | 80 |
| Hickman County Memorial Library | KY | WordPress-KY | 0 |
| Irvington Branch | — | WordPress-KY | 0 |
| Laurel County Public Library | KY | WordPress-KY | 0 |
| Lents Branch | KY | WordPress-KY | 0 |
| Lexington Public Library | — | WordPress-KY | 11 |
| Louisville Free Public Library | — | WordPress-KY | 23 |
| Madison County Public Library | — | WordPress-KY | 0 |
| Mahan-Oldham County Library | KY | WordPress-KY | 0 |
| Marion County Public Library | KY | WordPress-KY | 0 |
| Mary Wood Weldon Memorial Public Library | — | WordPress-KY | 24 |
| Mason County Public Library | — | WordPress-KY | 11 |
| McCracken County Public Library | — | WordPress-KY | 86 |
| Montgomery County Public Library | — | WordPress-KY | 2 |
| Nicholas County Public Library | KY | WordPress-KY | 0 |
| Ohio County Public Library | KY | WordPress-KY | 0 |
| Oldham County Public Library | — | WordPress-KY | 8 |
| Perry County Public Library | — | WordPress-KY | 9 |
| Pike County Public Library | — | WordPress-KY | 0 |
| Rebecca Caudill Public Library | — | WordPress-KY | 1 |
| Rowan County Public Library | — | WordPress-KY | 105 |
| Scott County Public Library | — | WordPress-KY | 1 |
| South Branch | — | WordPress-KY | 10 |
| Trimble County Public Library | KY | WordPress-KY | 0 |
| Warren County Public Library | — | WordPress-KY | 10 |
| Washington County Public Library | KY | WordPress-KY | 0 |
| Wayne County Public Library | KY | WordPress-KY | 0 |
| Whitley County Public Library | — | WordPress-KY | 0 |
| Woodford County Library | — | WordPress-KY | 0 |
| Acton Memorial Library | MA | WordPress-MA | 0 |
| Agawam Public Library | MA | WordPress-MA | 5 |
| Aldenville Branch Library | MA | WordPress-MA | 2 |
| Amesbury Public Library | MA | WordPress-MA | 0 |
| Andrews Branch Library | MA | WordPress-MA | 0 |
| Aquinnah Public Library | MA | WordPress-MA | 3 |
| Athol Public Library | MA | WordPress-MA | 0 |
| Attleboro Public Library | MA | WordPress-MA | 1 |
| Auburn Free Public Library | MA | WordPress-MA | 1 |
| Auburndale Branch Library | MA | WordPress-MA | 11 |
| Ayer Public Library | MA | WordPress-MA | 1 |
| Beals Memorial Library | MA | WordPress-MA | 0 |
| Bedford Free Public Library | MA | WordPress-MA | 0 |
| Bellingham Public Library | MA | WordPress-MA | 0 |
| Belmont Public Library | MA | WordPress-MA | 0 |
| Berkley Public Library | MA | WordPress-MA | 0 |
| Berkshire Athenaeum | MA | WordPress-MA | 5 |
| Bigelow Free Public Library | MA | WordPress-MA | 0 |
| Billerica Public Library | MA | WordPress-MA | 0 |
| Blackstone Free Public Library | MA | WordPress-MA | 0 |
| Blanding Public Library | MA | WordPress-MA | 0 |
| Boxford Town Library | MA | WordPress-MA | 0 |
| Boylston Public Library | MA | WordPress-MA | 0 |
| Boynton Public Library | MA | WordPress-MA | 0 |
| Brewster Ladies Library Assoc. | MA | WordPress-MA | 0 |
| Brighton Branch Library | MA | WordPress-MA | 0 |
| Brightwood Branch Library | MA | WordPress-MA | 1 |
| Brimfield Public Library | MA | WordPress-MA | 2 |
| Brookline Public Library | MA | WordPress-MA | 0 |
| Bushnell-Sage Library | MA | WordPress-MA | 0 |
| Cambridge Public Library | MA | WordPress-MA | 11 |
| Carver Public Library | MA | WordPress-MA | 0 |
| Cary Memorial Library | MA | WordPress-MA | 0 |
| Casa Da Saudade | MA | WordPress-MA | 0 |
| Centerville Public Library | MA | WordPress-MA | 60 |
| Chelmsford Public Library | MA | WordPress-MA | 0 |
| Chelsea Public Library | MA | WordPress-MA | 0 |
| Chester C. Corbin Public Library | MA | WordPress-MA | 0 |
| Chesterfield Public Library | MA | WordPress-MA | 1 |
| Chilmark Free Public Library | MA | WordPress-MA | 2 |
| Clarksburg Town Library | MA | WordPress-MA | 0 |
| Conant Free Public Library | MA | WordPress-MA | 0 |
| Concord Free Public Library | MA | WordPress-MA | 1 |
| Cotuit Library | MA | WordPress-MA | 1 |
| Dalton Free Public Library | MA | WordPress-MA | 24 |
| David Joyce Milne Public Library | MA | WordPress-MA | 0 |
| Dighton Public Library | MA | WordPress-MA | 0 |
| Dover Town Library | MA | WordPress-MA | 0 |
| Dudley Branch Library | MA | WordPress-MA | 0 |
| East Bridgewater Public Library | MA | WordPress-MA | 0 |
| East End Branch Library | MA | WordPress-MA | 1 |
| East Milton Branch Library | MA | WordPress-MA | 0 |
| Eastham Public Library | MA | WordPress-MA | 2 |
| Edgartown Free Public Library | MA | WordPress-MA | 0 |
| Edith M. Fox Library | MA | WordPress-MA | 0 |
| Edwards Public Library | MA | WordPress-MA | 4 |
| Eldredge Public Library | MA | WordPress-MA | 1 |
| Elizabeth Taber Memorial Library | MA | WordPress-MA | 0 |
| Emily Williston Memorial Library | MA | WordPress-MA | 0 |
| Fitchburg Public Library | MA | WordPress-MA | 1 |
| Five Corners Library | MA | WordPress-MA | 0 |
| Flint Public Library | MA | WordPress-MA | 0 |
| Forbush Memorial Library | MA | WordPress-MA | 0 |
| Framingham Public Library | MA | WordPress-MA | 62 |
| Frances Perkins Branch Library At Greendale | MA | WordPress-MA | 0 |
| Franklin Public Library | MA | WordPress-MA | 0 |
| G. A. R. Memorial Library | MA | WordPress-MA | 0 |
| Gleason Public Library | MA | WordPress-MA | 0 |
| Gloucester Lyceum Sawyer Free Lib | MA | WordPress-MA | 0 |
| Goshen Free Public Library | MA | WordPress-MA | 0 |
| Grace Hall Memorial Library | MA | WordPress-MA | 0 |
| Grafton Public Library | MA | WordPress-MA | 0 |
| Granby Free Public Library | MA | WordPress-MA | 1 |
| Granville Public Library | MA | WordPress-MA | 0 |
| Hamilton Memorial Library | MA | WordPress-MA | 0 |
| Hanson Public Library | MA | WordPress-MA | 0 |
| Harvard Public Library | MA | WordPress-MA | 14 |
| Harwich Port Library Assoc. | MA | WordPress-MA | 1 |
| Haston Free Public Library | MA | WordPress-MA | 0 |
| Haverhill Public Library | MA | WordPress-MA | 0 |
| Hazen Memorial Library | MA | WordPress-MA | 1 |
| Heath Free Public Library | MA | WordPress-MA | 0 |
| Hingham Public Library | MA | WordPress-MA | 1 |
| Holbrook Public Library | MA | WordPress-MA | 0 |
| Holland Public Library | MA | WordPress-MA | 0 |
| Holliston Public Library | MA | WordPress-MA | 0 |
| Holyoke Public Library | MA | WordPress-MA | 87 |
| Hopkinton Public Library | MA | WordPress-MA | 0 |
| Hubbardston Public Library | MA | WordPress-MA | 7 |
| Hudson Public Library | MA | WordPress-MA | 0 |
| Huntington Public Library | MA | WordPress-MA | 0 |
| Hyannis Public Library Assoc. | MA | WordPress-MA | 133 |
| Hyde Park Branch Library | MA | WordPress-MA | 0 |
| Ipswich Public Library | MA | WordPress-MA | 0 |
| Islington Branch Library | MA | WordPress-MA | 0 |
| J. V. Fletcher Library | MA | WordPress-MA | 1 |
| Jonathan Bourne Public Library | MA | WordPress-MA | 0 |
| Jones Library, Inc. | MA | WordPress-MA | 6 |
| Joseph H. Plumb Memorial Library | MA | WordPress-MA | 0 |
| Joshua Hyde Public Library | MA | WordPress-MA | 77 |
| Kingston Public Library | MA | WordPress-MA | 0 |
| Lakeville Free Public Library | MA | WordPress-MA | 0 |
| Lawrence Public Library | MA | WordPress-MA | 4 |
| Leicester Public Library | MA | WordPress-MA | 0 |
| Lenox Library Association | MA | WordPress-MA | 0 |
| Leominster Public Library | MA | WordPress-MA | 0 |
| Leverett Library | MA | WordPress-MA | 0 |
| Levi Heywood Memorial Library | MA | WordPress-MA | 7 |
| Lilly Library | MA | WordPress-MA | 0 |
| Lucius Beebe Memorial Library | MA | WordPress-MA | 3 |
| Lunenburg Public Library | MA | WordPress-MA | 0 |
| Lynnfield Public Library | MA | WordPress-MA | 0 |
| Mashpee Public Library | MA | WordPress-MA | 19 |
| Mattapoisett Public Library | MA | WordPress-MA | 0 |
| Medfield Memorial Library | MA | WordPress-MA | 0 |
| Medford Public Library | MA | WordPress-MA | 0 |
| Memorial Hall Library | MA | WordPress-MA | 0 |
| Merriam-Gilbert Public Library | MA | WordPress-MA | 0 |
| Merrimac Public Library | MA | WordPress-MA | 0 |
| Middlefield Public Library | MA | WordPress-MA | 0 |
| Millbury Public Library | MA | WordPress-MA | 0 |
| Millicent Library | MA | WordPress-MA | 0 |
| Millis Public Library | MA | WordPress-MA | 1 |
| Millville Free Public Library | MA | WordPress-MA | 1 |
| Monterey Public Library | MA | WordPress-MA | 0 |
| Morrill Memorial Library | MA | WordPress-MA | 1 |
| Moses Greeley Parker Memorial Lib. | MA | WordPress-MA | 0 |
| Nahant Public Library | MA | WordPress-MA | 35 |
| Nantucket Atheneum | MA | WordPress-MA | 0 |
| Needham Free Public Library | MA | WordPress-MA | 0 |
| Newton Free Library | MA | WordPress-MA | 0 |
| North Adams Public Library | MA | WordPress-MA | 0 |
| Northborough Free Library | MA | WordPress-MA | 0 |
| Norton Public Library | MA | WordPress-MA | 42 |
| Oak Bluffs Public Library | MA | WordPress-MA | 0 |
| Oxford Free Public Library | MA | WordPress-MA | 0 |
| Palmer Public Library | MA | WordPress-MA | 0 |
| Paul Pratt Memorial Library | MA | WordPress-MA | 0 |
| Peabody Institute Library | MA | WordPress-MA | 1 |
| Peru Library | MA | WordPress-MA | 0 |
| Petersham Memorial Library | MA | WordPress-MA | 0 |
| Phinehas S. Newton Library | MA | WordPress-MA | 0 |
| Plainville Public Library | MA | WordPress-MA | 0 |
| Plympton Public Library | MA | WordPress-MA | 30 |
| Pollard Memorial Library | MA | WordPress-MA | 0 |
| Provincetown Public Library | MA | WordPress-MA | 41 |
| Reading Public Library | MA | WordPress-MA | 0 |
| Reuben Hoar Library | MA | WordPress-MA | 0 |
| Revere Public Library | MA | WordPress-MA | 1 |
| Richard Salter Storrs Library | MA | WordPress-MA | 0 |
| Richards Memorial Library | MA | WordPress-MA | 1 |
| Rockport Public Library | MA | WordPress-MA | 1 |
| Rowley Public Library | MA | WordPress-MA | 0 |
| Russell Public Library | MA | WordPress-MA | 0 |
| Rutland Free Public Library | MA | WordPress-MA | 0 |
| Salem Public Library | MA | WordPress-MA | 0 |
| Salisbury Public Library | MA | WordPress-MA | 0 |
| Sandisfield Public Library | MA | WordPress-MA | 13 |
| Scituate Town Library | MA | WordPress-MA | 0 |
| Seekonk Public Library | MA | WordPress-MA | 0 |
| Shaw Memorial Library | MA | WordPress-MA | 1 |
| Sherborn Library | MA | WordPress-MA | 0 |
| Shrewsbury Free Public Library | MA | WordPress-MA | 0 |
| Simon Fairfield Public Library | MA | WordPress-MA | 4 |
| Somerset Public Library | MA | WordPress-MA | 0 |
| South Dennis Free Public Library | MA | WordPress-MA | 0 |
| Stevens Memorial Library | MA | WordPress-MA | 0 |
| Stockbridge Library Association | MA | WordPress-MA | 12 |
| Stoneham Public Library | MA | WordPress-MA | 4 |
| Stoughton Public Library | MA | WordPress-MA | 1 |
| Swampscott Public Library | MA | WordPress-MA | 0 |
| Swansea Free Public Library | MA | WordPress-MA | 0 |
| T.O.H.P. Burnham Free Library | MA | WordPress-MA | 0 |
| Taft Public Library | MA | WordPress-MA | 18 |
| Taunton Public Library | MA | WordPress-MA | 0 |
| Taylor Memorial Library | MA | WordPress-MA | 0 |
| Tewksbury Public Library | MA | WordPress-MA | 1 |
| Topsfield Town Library | MA | WordPress-MA | 0 |
| Townsend Public Library | MA | WordPress-MA | 0 |
| Tyler Memorial Library | MA | WordPress-MA | 0 |
| Uxbridge Free Public Library | MA | WordPress-MA | 0 |
| Ventress Memorial Library | MA | WordPress-MA | 0 |
| Waban Branch Library | MA | WordPress-MA | 4 |
| Walpole Public Library | MA | WordPress-MA | 50 |
| Warren Public Library | MA | WordPress-MA | 0 |
| Wayland Free Public Library | MA | WordPress-MA | 0 |
| Wellfleet Public Library | MA | WordPress-MA | 31 |
| West Dennis Free Public Library | MA | WordPress-MA | 0 |
| West Falmouth Library, Inc. | MA | WordPress-MA | 12 |
| Westborough Public Library | MA | WordPress-MA | 2 |
| Westfield Athenaeum | MA | WordPress-MA | 27 |
| Westhampton Memorial Library | MA | WordPress-MA | 0 |
| Weston Public Library | MA | WordPress-MA | 0 |
| Westport Free Public Library | MA | WordPress-MA | 0 |
| Whitinsville Social Library | MA | WordPress-MA | 0 |
| Wilbraham Public Library | MA | WordPress-MA | 0 |
| Wilmington Memorial Library | MA | WordPress-MA | 4 |
| Winchester Public Library | MA | WordPress-MA | 0 |
| Windsor Free Public Library | MA | WordPress-MA | 0 |
| Woods Memorial Library | MA | WordPress-MA | 1 |
| Young Mens Library Association | MA | WordPress-MA | 0 |
| Amherst Town Library | NH | WordPress-NH | 1 |
| Andover Public Library | NH | WordPress-NH | 0 |
| Barrington Public Library | NH | WordPress-NH | 2 |
| Bartlett Public Library | NH | WordPress-NH | 69 |
| Bath Public Library | NH | WordPress-NH | 0 |
| Bedford Public Library | NH | WordPress-NH | 2 |
| Belmont Public Library | NH | WordPress-NH | 0 |
| Bethlehem Public Library | NH | WordPress-NH | 0 |
| Blaisdell Memorial Library | NH | WordPress-NH | 1 |
| Bremer Pond Memorial Library | NH | WordPress-NH | 2 |
| Brown Memorial Library | NH | WordPress-NH | 0 |
| Byron G. Merrill Library | NH | WordPress-NH | 0 |
| Canaan Town Library | NH | WordPress-NH | 12 |
| Chamberlin Free Public Library | NH | WordPress-NH | 0 |
| Chester Public Library | NH | WordPress-NH | 0 |
| Chesterfield Public Library | NH | WordPress-NH | 1 |
| Chocorua Public Library | NH | WordPress-NH | 2 |
| Conant Public Library | NH | WordPress-NH | 0 |
| Concord Public Library | NH | WordPress-NH | 0 |
| Cook Memorial Library | NH | WordPress-NH | 10 |
| Dalton Public Library | NH | WordPress-NH | 0 |
| Derry Public Library | NH | WordPress-NH | 0 |
| Dover Public Library | NH | WordPress-NH | 0 |
| Dublin Public Library | NH | WordPress-NH | 0 |
| Dunbarton Public Library | NH | WordPress-NH | 0 |
| East Kingston Public Library | NH | WordPress-NH | 0 |
| East Rochester Public Library | NH | WordPress-NH | 0 |
| Effingham Free Public Library | NH | WordPress-NH | 0 |
| Elkins Library | NH | WordPress-NH | 0 |
| Exeter Public Library | NH | WordPress-NH | 0 |
| Fiske Free Library | NH | WordPress-NH | 0 |
| Franklin Public Library | NH | WordPress-NH | 0 |
| Fremont Public Library | NH | WordPress-NH | 0 |
| G. E.P. Dodge Library | NH | WordPress-NH | 12 |
| Gale Library | NH | WordPress-NH | 0 |
| George Gamble Library | NH | WordPress-NH | 1 |
| George Holmes Bixby Memorial Library | NH | WordPress-NH | 0 |
| Gilford Public Library | NH | WordPress-NH | 1 |
| Goffstown Public Library | NH | WordPress-NH | 0 |
| Goodwin Library | NH | WordPress-NH | 0 |
| Gorham Public Library | NH | WordPress-NH | 1 |
| Griffin Free Public Library | NH | WordPress-NH | 33 |
| Hampstead Public Library | NH | WordPress-NH | 0 |
| Hampton Falls Free Library | NH | WordPress-NH | 45 |
| Hampton Lane Memorial Library | NH | WordPress-NH | 0 |
| Hancock Town Library | NH | WordPress-NH | 1 |
| Harvey-Mitchell Memorial Library | NH | WordPress-NH | 1 |
| Haverhill Library Association | NH | WordPress-NH | 0 |
| Hebron Public Library | NH | WordPress-NH | 0 |
| Hill Public Library | NH | WordPress-NH | 7 |
| Holderness Library | NH | WordPress-NH | 0 |
| Hollis Social Library | NH | WordPress-NH | 0 |
| Hooksett Public Library | NH | WordPress-NH | 1 |
| Hudson Rodgers Memorial Library | NH | WordPress-NH | 1 |
| James E. Nichols Memorial Library | NH | WordPress-NH | 4 |
| Joseph Patch Library | NH | WordPress-NH | 0 |
| Josiah Carpenter Library | NH | WordPress-NH | 0 |
| Laconia Public Library | NH | WordPress-NH | 0 |
| Laura Johnson Memorial Library | NH | WordPress-NH | 0 |
| Lebanon Public Libraries | NH | WordPress-NH | 3 |
| Libbie A. Cass Memorial Library | NH | WordPress-NH | 0 |
| Littleton Public Library | NH | WordPress-NH | 0 |
| Londonderry Leach Library | NH | WordPress-NH | 0 |
| Madbury Public Library | NH | WordPress-NH | 1 |
| Madison Library | NH | WordPress-NH | 0 |
| Manchester City Library | NH | WordPress-NH | 1 |
| Mansfield Public Library | NH | WordPress-NH | 0 |
| Mary E. Bartlett Library | NH | WordPress-NH | 0 |
| Mason Public Library | NH | WordPress-NH | 0 |
| Meredith Public Library | NH | WordPress-NH | 2 |
| Merrimack Public Library | NH | WordPress-NH | 0 |
| Milan Public Library | NH | WordPress-NH | 0 |
| Milford Wadleigh Memorial Library | NH | WordPress-NH | 1 |
| Monroe Public Library | NH | WordPress-NH | 0 |
| Moultonborough Public Library | NH | WordPress-NH | 1 |
| Nashua Public Library | NH | WordPress-NH | 0 |
| New Durham Public Library | NH | WordPress-NH | 15 |
| New Ipswich Library | NH | WordPress-NH | 0 |
| Newbury Public Library | NH | WordPress-NH | 0 |
| Newfields Public Library | NH | WordPress-NH | 10 |
| Newmarket Public Library | NH | WordPress-NH | 0 |
| Nichols Memorial Library | NH | WordPress-NH | 0 |
| Olive G. Pettis Library | NH | WordPress-NH | 0 |
| Olivia Rodham Memorial Library | NH | WordPress-NH | 27 |
| Pembroke Town Library | NH | WordPress-NH | 0 |
| Philbrick-James Library | NH | WordPress-NH | 1 |
| Philip Read Memorial Library | NH | WordPress-NH | 0 |
| Pike Library | NH | WordPress-NH | 0 |
| Pillsbury Free Library | NH | WordPress-NH | 8 |
| Rollinsford Public Library | NH | WordPress-NH | 23 |
| Rye Public Library | NH | WordPress-NH | 0 |
| Salem Kelley Library | NH | WordPress-NH | 0 |
| Salisbury Free Library | NH | WordPress-NH | 0 |
| Stark Public Library | NH | WordPress-NH | 0 |
| Sullivan Public Library | NH | WordPress-NH | 0 |
| Tracy Memorial Library | NH | WordPress-NH | 0 |
| Wakefield Public Library | NH | WordPress-NH | 0 |
| Walpole Town Library | NH | WordPress-NH | 0 |
| Webster Free Public Library | NH | WordPress-NH | 0 |
| Westmoreland Public Library | NH | WordPress-NH | 0 |
| Whitefield Public Library | NH | WordPress-NH | 8 |
| Wilmot Public Library | NH | WordPress-NH | 5 |
| Wilton Public Gregg Free Library | NH | WordPress-NH | 0 |
| Windham Nesmith Library | NH | WordPress-NH | 1 |
| Wolfeboro Public Library | NH | WordPress-NH | 1 |
| Adams Memorial Library | — | WordPress-PA | 41 |
| Albright Memorial Library | — | WordPress-PA | 150 |
| Altoona Area Public Library | — | WordPress-PA | 65 |
| Andrew Carnegie Free Library | — | WordPress-PA | 10 |
| Aston Public Library | — | WordPress-PA | 0 |
| Avalon Public Library | — | WordPress-PA | 0 |
| Avella Area Library Center | — | WordPress-PA | 0 |
| Avonmore Public Library | — | WordPress-PA | 0 |
| Back Mountain Memorial Library | PA | WordPress-PA | 0 |
| Bangor Public Library | — | WordPress-PA | 0 |
| Barbara Moscato Brown Memorial Library | — | WordPress-PA | 0 |
| Beaver County Bookmobile Schedule | PA | WordPress-PA | 0 |
| Belle Vernon Public Library | — | WordPress-PA | 0 |
| Bellwood Antis Public Library | — | WordPress-PA | 10 |
| Berks County Public Libraries | PA | WordPress-PA | 0 |
| Bernville Area Community Library | — | WordPress-PA | 0 |
| Bethel Park Public Library | — | WordPress-PA | 0 |
| Bethel-Tulpehocken Public Library | PA | WordPress-PA | 0 |
| Bethlehem Area Public Library | PA | WordPress-PA | 0 |
| Borough Of Folcroft Public Library | — | WordPress-PA | 0 |
| Bosler Free Library | PA | WordPress-PA | 0 |
| Boyertown Community Library | — | WordPress-PA | 0 |
| Bradford Area Public Library | — | WordPress-PA | 0 |
| Bridgeville Public Library | — | WordPress-PA | 0 |
| Bucks County Free Library - Fallsington Library | — | WordPress-PA | 0 |
| Bucks County Free Library - Pipersville Free Library | — | WordPress-PA | 0 |
| Bucks County Free Library - Village Library Of Wrightstown | — | WordPress-PA | 0 |
| Butler Area Public Library | PA | WordPress-PA | 0 |
| Carbondale Public Library | — | WordPress-PA | 0 |
| Carnegie Free Library Of Swissvale | — | WordPress-PA | 0 |
| Carnegie Library Of Mckeesport | PA | WordPress-PA | 0 |
| Carnegie Library Of Mckeesport - White Oak | PA | WordPress-PA | 0 |
| Carnegie Library of Pittsburgh | — | WordPress-PA | 10 |
| Carnegie Library, Midland | — | WordPress-PA | 0 |
| Chester Springs Library | — | WordPress-PA | 0 |
| Clairton Public Library | — | WordPress-PA | 0 |
| Claysburg Area Public Library Inc | — | WordPress-PA | 0 |
| Coatesville Area Public Library | — | WordPress-PA | 0 |
| Community College Of Beaver County | — | WordPress-PA | 0 |
| Community Library Of Castle Shannon | — | WordPress-PA | 0 |
| Cooperstown Public Library | PA | WordPress-PA | 0 |
| Coraopolis Memorial Library | — | WordPress-PA | 0 |
| Corry Public Library | — | WordPress-PA | 5 |
| Coudersport Public Library | — | WordPress-PA | 4 |
| Dalton Community Library | PA | WordPress-PA | 0 |
| Darby Library | — | WordPress-PA | 0 |
| Degenstein Community Library | — | WordPress-PA | 4 |
| Delmont Public Library | — | WordPress-PA | 12 |
| Downingtown Library Company | — | WordPress-PA | 0 |
| East Berlin Community Library | — | WordPress-PA | 0 |
| Ellwood City Area Pub Library | — | WordPress-PA | 0 |
| Emmaus Public Library | — | WordPress-PA | 0 |
| Erie County Public Library | — | WordPress-PA | 0 |
| Evans City Public Library | — | WordPress-PA | 0 |
| Everett Free Library | — | WordPress-PA | 0 |
| Fleetwood Area Public Library | — | WordPress-PA | 0 |
| Foxburg Free Library Association | — | WordPress-PA | 0 |
| Francis J. Catania Law Library | — | WordPress-PA | 0 |
| Free Library of Philadelphia | — | WordPress-PA | 0 |
| Genesee Area Library | — | WordPress-PA | 0 |
| Glenolden Library | — | WordPress-PA | 0 |
| Green Free Library | — | WordPress-PA | 0 |
| Hamlin Memorial Library | — | WordPress-PA | 0 |
| Hawley Library | — | WordPress-PA | 0 |
| Hazleton Area Public Library | — | WordPress-PA | 0 |
| Hellertown Area Library | — | WordPress-PA | 0 |
| Hershey Public Library | — | WordPress-PA | 0 |
| Hollidaysburg Area Public Library | — | WordPress-PA | 0 |
| Honey Brook Community Library | — | WordPress-PA | 0 |
| Horsham Township Library | — | WordPress-PA | 0 |
| Hoyt Library | PA | WordPress-PA | 0 |
| Hughesville Area Public Library | — | WordPress-PA | 33 |
| Huntingdon County Library | — | WordPress-PA | 0 |
| Hyndman-Londonderry Public Library | — | WordPress-PA | 0 |
| Jefferson Hills Public Library | — | WordPress-PA | 0 |
| Jefferson Resource Center And Computer Lab | PA | WordPress-PA | 0 |
| Jenkintown Library | — | WordPress-PA | 2 |
| Johnsonburg Public Library | — | WordPress-PA | 0 |
| Joseph T. Simpson Public Library | — | WordPress-PA | 0 |
| Lansdale Public Library | — | WordPress-PA | 135 |
| Lansdowne Public Library | — | WordPress-PA | 1 |
| Lebanon Community Library | PA | WordPress-PA | 0 |
| Ligonier Valley Library | — | WordPress-PA | 150 |
| Lilly Washington Pub Library | — | WordPress-PA | 0 |
| Lititz Public Library | — | WordPress-PA | 0 |
| Louisa Gonser Community Library Inc | — | WordPress-PA | 2 |
| Malvern Public Library | — | WordPress-PA | 0 |
| Manheim Community Library | — | WordPress-PA | 0 |
| Marian Sutherland Kirby Library | — | WordPress-PA | 28 |
| Marienville Area Library | — | WordPress-PA | 0 |
| Mars Area Public Library | — | WordPress-PA | 0 |
| Martinsburg Community Library | PA | WordPress-PA | 0 |
| Mary S Biesecker Public Library | — | WordPress-PA | 0 |
| Meadville Public Library | — | WordPress-PA | 0 |
| Memorial Library Of Nazareth Vicinity | — | WordPress-PA | 5 |
| Mengle Memorial Library | — | WordPress-PA | 0 |
| Mercer Area Library | PA | WordPress-PA | 0 |
| Meyersdale Public Library | — | WordPress-PA | 0 |
| Middletown Public Library | PA | WordPress-PA | 0 |
| Mifflin County Library | — | WordPress-PA | 44 |
| Minersville Public Library | — | WordPress-PA | 0 |
| Monessen Public Library District Center | — | WordPress-PA | 0 |
| Monroeton Public Library | — | WordPress-PA | 4 |
| Monroeville Public Library | PA | WordPress-PA | 0 |
| Montgomery Area Public Library | — | WordPress-PA | 0 |
| Moores Memorial Library | — | WordPress-PA | 0 |
| Mount Pleasant Free Public Library Association | — | WordPress-PA | 0 |
| Murrysville Community Library | — | WordPress-PA | 0 |
| Narberth Community Library | — | WordPress-PA | 10 |
| New Cumberland Public Library | — | WordPress-PA | 0 |
| New Florence Community Library | — | WordPress-PA | 8 |
| North Versailles Public Library | — | WordPress-PA | 0 |
| North Wales Library | — | WordPress-PA | 0 |
| Northern Wayne Community Library | PA | WordPress-PA | 0 |
| Norwood Public Library | PA | WordPress-PA | 0 |
| Oakmont Carnegie Library | — | WordPress-PA | 5 |
| Oil City Library | — | WordPress-PA | 0 |
| Orwigsburg Area Fr Pub Library | — | WordPress-PA | 0 |
| Parkesburg Free Library | — | WordPress-PA | 1 |
| Paul Smith Library Of Southern York County | PA | WordPress-PA | 0 |
| Pequea Valley Public Library | — | WordPress-PA | 0 |
| Pequea Valley Public Library - Gap Branch | — | WordPress-PA | 0 |
| Phoenixville Public Library | — | WordPress-PA | 1 |
| Portage Public Library | — | WordPress-PA | 2 |
| Pottsville Free Public Library | — | WordPress-PA | 89 |
| Pratt Memorial Library | PA | WordPress-PA | 0 |
| Priestley Forsyth Memorial Library | — | WordPress-PA | 0 |
| Prospect Community Library | — | WordPress-PA | 0 |
| Prospect Park Free Library | — | WordPress-PA | 0 |
| Punxsutawney Memorial Library | — | WordPress-PA | 0 |
| Quarryville Library Center | — | WordPress-PA | 0 |
| Ralston Link | — | WordPress-PA | 0 |
| Reynoldsville Public Library | — | WordPress-PA | 0 |
| Richland Community Library | PA | WordPress-PA | 0 |
| Ridgway Public Library | — | WordPress-PA | 0 |
| Ridley Park Public Library | — | WordPress-PA | 0 |
| Ringtown Area Library | — | WordPress-PA | 0 |
| Roaring Spring Comm Library | — | WordPress-PA | 0 |
| Robesonia Community Library | — | WordPress-PA | 0 |
| Rochester Public Library | PA | WordPress-PA | 0 |
| Sarah S Bovard Memorial Library | — | WordPress-PA | 0 |
| Saxonburg Area Library | — | WordPress-PA | 0 |
| Saxton Community Library | — | WordPress-PA | 0 |
| Scottdale Public Library | — | WordPress-PA | 0 |
| Sewickley Public Library | — | WordPress-PA | 4 |
| Sheffield Township Library | — | WordPress-PA | 0 |
| Shippensburg Public Library | — | WordPress-PA | 0 |
| Sinking Spring Public Library | — | WordPress-PA | 0 |
| Slatington Library Inc | — | WordPress-PA | 0 |
| Smithfield Library | — | WordPress-PA | 0 |
| South Fayette Township Library | — | WordPress-PA | 0 |
| South Park Township Library | — | WordPress-PA | 0 |
| Spalding Memorial Library | — | WordPress-PA | 0 |
| Spring City Free Public Library | — | WordPress-PA | 0 |
| Springdale Free Public Library | — | WordPress-PA | 0 |
| Springfield Township Library | PA | WordPress-PA | 0 |
| Strasburg-Heisler Library | — | WordPress-PA | 0 |
| Summerville Public Library | — | WordPress-PA | 0 |
| Sykesville Public Library | — | WordPress-PA | 0 |
| Taylor Community Library | — | WordPress-PA | 76 |
| Towanda Public Library | — | WordPress-PA | 5 |
| Trafford Community Public Library | — | WordPress-PA | 0 |
| Tunkhannock Public Library | — | WordPress-PA | 0 |
| Tyrone-Snyder Township Public Library | — | WordPress-PA | 0 |
| Union Library Company Of Hatborough | — | WordPress-PA | 0 |
| Warren Library Association | — | WordPress-PA | 0 |
| Waterford Public Library | PA | WordPress-PA | 0 |
| West Chester Public Library | — | WordPress-PA | 0 |
| West Newton Public Library | — | WordPress-PA | 0 |
| West Pittston Library | — | WordPress-PA | 0 |
| Westfield Public Library | — | WordPress-PA | 0 |
| Wilcox Public Library | — | WordPress-PA | 0 |
| Wilkinsburg Public Library | PA | WordPress-PA | 0 |
| Windber Public Library Association | — | WordPress-PA | 0 |
| Wyalusing Public Library | — | WordPress-PA | 33 |
| Yeadon Public Library | — | WordPress-PA | 0 |
| Zelienople Public Library | — | WordPress-PA | 34 |
| Ashaway Free Library | RI | WordPress-RI | 0 |
| Brownell Library, Home Of Little Compton | RI | WordPress-RI | 0 |
| Central Falls Free Public Library | RI | WordPress-RI | 0 |
| Coventry Public Library | RI | WordPress-RI | 0 |
| East Greenwich Free Library | RI | WordPress-RI | 1 |
| Essex Public Library | RI | WordPress-RI | 1 |
| Exeter Public Library | RI | WordPress-RI | 0 |
| Fairmount Branch | RI | WordPress-RI | 16 |
| Fox Point Library | RI | WordPress-RI | 1 |
| George Hail Free Library | RI | WordPress-RI | 0 |
| Greene Public Library | RI | WordPress-RI | 0 |
| Greenville Public Library | RI | WordPress-RI | 0 |
| Harmony Library | RI | WordPress-RI | 0 |
| Island Free Library | RI | WordPress-RI | 138 |
| Knight Memorial Library | RI | WordPress-RI | 1 |
| Langworthy Public Library | RI | WordPress-RI | 4 |
| Louttit Memorial Library | RI | WordPress-RI | 32 |
| Marian J. Mohr Memorial Library | RI | WordPress-RI | 0 |
| Middletown Public Library | RI | WordPress-RI | 0 |
| Mount Pleasant Library | RI | WordPress-RI | 1 |
| North Smithfield Public Library | RI | WordPress-RI | 0 |
| Olneyville Library | RI | WordPress-RI | 1 |
| Pascoag Free Public Library | RI | WordPress-RI | 10 |
| Portsmouth Free Public Library | RI | WordPress-RI | 0 |
| Providence Public Library | RI | WordPress-RI | 1 |
| Rochambeau Library | RI | WordPress-RI | 1 |
| Rogers Free Library | RI | WordPress-RI | 0 |
| Rumford Branch | RI | WordPress-RI | 0 |
| Smith Hill Library | RI | WordPress-RI | 1 |
| South Providence Library | RI | WordPress-RI | 1 |
| Wanskuck Library | RI | WordPress-RI | 1 |
| Washington Park Library | RI | WordPress-RI | 1 |
| Westerly Public Library | RI | WordPress-RI | 4 |
| Woonsocket Harris Public Library | RI | WordPress-RI | 16 |
| Abbeville County Library System | SC | WordPress-SC | 0 |
| Aiken County Library - Midland Valley Branch Library | SC | WordPress-SC | 1 |
| Anderson County Library | SC | WordPress-SC | 101 |
| Anderson County Library - Piedmont Branch Library | SC | WordPress-SC | 0 |
| Chester County Library | SC | WordPress-SC | 0 |
| Chesterfield County Library System | SC | WordPress-SC | 0 |
| Clinton Public Library | SC | WordPress-SC | 0 |
| Dillon County Library System | SC | WordPress-SC | 1 |
| Edgefield County Public Library - Johnston Branch (Mobley Library) | SC | WordPress-SC | 0 |
| Florence County Library System | SC | WordPress-SC | 72 |
| Great Falls Library | SC | WordPress-SC | 56 |
| Greenville County Library - Anderson Road (West) Branch | SC | WordPress-SC | 12 |
| Hal Kohn Memorial Library | SC | WordPress-SC | 0 |
| Hampton County Library - Estill Branch Library | SC | WordPress-SC | 0 |
| Horry County Memorial Library - Loris Library | SC | WordPress-SC | 0 |
| Kershaw County Library - Camden Branch Library | SC | WordPress-SC | 0 |
| Kershaw County Library - Elgin Branch Library | SC | WordPress-SC | 0 |
| Lake View Library | SC | WordPress-SC | 1 |
| Lamar District Library | SC | WordPress-SC | 0 |
| Lexington County Library - Chapin | SC | WordPress-SC | 3 |
| Lexington County Library - Gilbert-Summit | SC | WordPress-SC | 0 |
| Lexington County Library - Irmo | SC | WordPress-SC | 0 |
| Lexington County Library - Swansea | SC | WordPress-SC | 0 |
| Lexington County Public Library System - Main | SC | WordPress-SC | 0 |
| Marion County Library System | SC | WordPress-SC | 0 |
| Mccormick County Library System | SC | WordPress-SC | 4 |
| Oconee County Public Library - Salem Branch Library | SC | WordPress-SC | 0 |
| Oconee County Public Library - Seneca Branch Library | SC | WordPress-SC | 0 |
| Oconee County Public Library - Westminster Branch Library | SC | WordPress-SC | 0 |
| Orangeburg County Library - Springfield Branch Library | SC | WordPress-SC | 0 |
| Orangeburg County Library Commission | SC | WordPress-SC | 0 |
| Pickens County Library - Central-Clemson Branch Library | SC | WordPress-SC | 0 |
| Pickens County Library - Sarlin Branch Library | SC | WordPress-SC | 4 |
| Saluda County Library System | SC | WordPress-SC | 25 |
| Spartanburg County Public Library - H. Carlisle Bean Law Library | SC | WordPress-SC | 0 |
| Union County Library System | SC | WordPress-SC | 3 |
| York Public Library | SC | WordPress-SC | 0 |
| Barrett-Wharton Public Library | WV | WordPress-WV | 35 |
| Berkeley County Public Library | WV | WordPress-WV | 0 |
| Boone-Madison Public Library | WV | WordPress-WV | 0 |
| Bridgeport Public Library | WV | WordPress-WV | 0 |
| Cameron Public Library | WV | WordPress-WV | 0 |
| Center Point Public Library | WV | WordPress-WV | 10 |
| Clay County Public Library | WV | WordPress-WV | 2 |
| Dunbar Branch Library | WV | WordPress-WV | 1 |
| East Hardy Branch Public Library | WV | WordPress-WV | 0 |
| Gilbert Public Library | WV | WordPress-WV | 0 |
| Glasgow Branch Library | WV | WordPress-WV | 29 |
| Hamlin-Lincoln County Public Library | WV | WordPress-WV | 0 |
| Harrison County Public Library | WV | WordPress-WV | 15 |
| Hillsboro Public Library | WV | WordPress-WV | 1 |
| Jackson County Public Library | WV | WordPress-WV | 1 |
| Kanawha County Public Library | WV | WordPress-WV | 24 |
| Lynn Murray Memorial Library | WV | WordPress-WV | 0 |
| Marion County Public Library | WV | WordPress-WV | 0 |
| Mercer County Public Library | WV | WordPress-WV | 1 |
| Monroe County Public Library | WV | WordPress-WV | 0 |
| Montgomery Public Library | WV | WordPress-WV | 0 |
| Ohio County Public Library | WV | WordPress-WV | 0 |
| Paden City Public Library | WV | WordPress-WV | 3 |
| Paw Paw Public Library | WV | WordPress-WV | 1 |
| Pendleton County Public Library | WV | WordPress-WV | 0 |
| Piedmont Public Library | WV | WordPress-WV | 0 |
| Pleasants County Public Library | WV | WordPress-WV | 0 |
| Putnam County Public Library | WV | WordPress-WV | 0 |
| Richwood Public Library | WV | WordPress-WV | 9 |
| Ronceverte Public Library | WV | WordPress-WV | 0 |
| Sand Hill Public Library | WV | WordPress-WV | 0 |
| South Charleston Public Library | WV | WordPress-WV | 8 |
| Summers County Public Library | WV | WordPress-WV | 51 |
| Swaney Memorial Library | WV | WordPress-WV | 0 |
| Waverly Library | WV | WordPress-WV | 2 |
| Whitesville Public Library | WV | WordPress-WV | 0 |
| Williamstown Library | WV | WordPress-WV | 0 |
| Sandhill Regional Library System (scraper aggregate) | NC | SandhillRegional-NC | 28 |
| Dorchester County Public Library (scraper aggregate) | MD | Dorchester-County | 3 |
| Wicomico Public Libraries (scraper aggregate) | MD | Wicomico-Public | 21 |
| Allentown Public Library (scraper aggregate) | PA | Allentown-Public | 1 |
| Orange County Library System (scraper aggregate) | FL | Orange-County-Library-FL | 847 |
| Nashville Public Library (scraper aggregate) | TN | Nashville-Library-TN | 182 |
| Assabet Interactive libraries (scraper aggregate, 41 sites) | NH/MA | Assabet-NH-MA | 1717 |

**Zero-event sites this run:** 459 of 754. 453 are WordPress-{state} entries (the known platform-heterogeneity gap); the six others are named in the paragraph above.

**Cycle-completion check: not complete.** Across the current cycle (`## 2026-08-28`, `## 2026-08-29`, plus today) **73 of 101** active library-family scrapers have at least one row and **28** do not. All 28 are Group 2 — `group-last-run.json` records Group 2's last completion as 2026-08-28T05:05:47Z, which is the run that closed the *previous* cycle, so Group 2 has not yet had its turn in this one. This is a rotation gap, not a bug: LibCal-GA, LibCal-MA, LibCal-NY1, LibCal-PA, LibCal-WV, LibCal-VT, Communico-GA, Communico-NJ, Communico-KY, Communico-SC, Communico-AL, BiblioCommons-GA, BiblioCommons-NC, LibraryMarket, LibraryMarket-GA, LibraryMarket-ME-NH-MA, Brooklyn-Library, Louisville-Library, EventActions-Libraries, CustomDrupal-Libraries, Tockify-Horry, Graniculator-Morris, WordPress-MD, WordPress-NY, WordPress-FL, WordPress-NJ, WordPress-MS, WordPress-ME. No `Cycle complete` marker is added.

## 2026-08-31

Group 1 rotation, started 2026-08-31T07:00:01Z. 617 per-site rows from 34 library scrapers with per-site log output; 307 zero-event sites. The rotation was still running when this section was built (50 of 51 scrapers done, `ChildrensTheater-Eastern` in flight), so anything after it lands in the next section.

**Zero-event concentration is again almost entirely the WordPress-{state} family**: 290 of the 307 zeroes come from six WordPress state files (CT 57/97, VT 49/78, TN 47/63, NC 46/62, AL 46/65, GA 45/66). That is the known platform-heterogeneity gap, not a new regression. The remaining 17 are 6 Venue-Events-ScienceArts sites, 3 WordPress-VA, all 3 LibCal-KY entries, 2 CivicEngage-Libraries and one branch each from LibCal-NC, LibCal-NY2 and LibCal-RI.

**LibCal-KY is 0/3 and every one of the three is explained, not silent.** Kenton and Boone both carry `urlCollision` markers (Kenton is covered by BiblioCommons-KY; Boone runs LibraryMarket at `boone.libnet.info` and is an open gap for want of a `LibraryMarket-KY` scraper). The third, **Warren County Public Library** (`warrenpl.libcal.com`), returned `Found 0 events` and carries a settled `MATCHES` verdict from an earlier cycle — its LibCal root states "No calendars have been defined yet" and the scraped `/calendar` path 404s, so the zero is the real state of the site, not an extraction failure. Carried forward per the don't-re-verify rule rather than re-fetched.

**Three single-system scrapers ran today and get aggregate rows, not per-site rows** — they emit neither the `📍 name … Found N events` nor the `📚 Scraping name…` shape the builder recognises, so their numbers below are the run table's FOUND column for the whole scraper and are labelled as such.

| Library Website | State | Scraper | Events Found |
|---|---|---|---|
| Anne Arundel County Library events | — | AACPL | 23 |
| Kenton County Public Library | KY | BiblioCommons-KY | 499 |
| Laurel County Public Library | KY | BiblioCommons-KY | 202 |
| Burlington County Library System | NJ | BiblioCommons-NJ | 485 |
| Central Rappahannock Regional Library | VA | BiblioCommons-VA | 499 |
| Colonial Heights Public Library | VA | CivicEngage-Libraries | 0 |
| Williamson County Public Library | TN | CivicEngage-Libraries | 0 |
| Hartford Public Library | CT | Communico-CT | 17 |
| DC Public Library | DC | Communico-DC | 30 |
| Worcester Public Library | MA | Communico-MA | 3 |
| Forsyth County Public Library | NC | Communico-NC | 6 |
| Chesapeake Public Library | VA | Communico-VA | 5 |
| Loudoun County Public Library | VA | Communico-VA | 21 |
| Prince William Public Library | VA | Communico-VA | 3 |
| Library System of Lancaster County | PA | Drupal-Pennsylvania | 1314 |
| York County Libraries | PA | Drupal-Pennsylvania | 734 |
| Lexington County Public Library | SC | EventON-Lexington | 1000 |
| Coverage: Fairfax County, Virginia | — | Fairfax-Parks | 20 |
| Alabama | AL | FairsFestivals-Eastern | 54 |
| Connecticut | CT | FairsFestivals-Eastern | 183 |
| Delaware | DE | FairsFestivals-Eastern | 27 |
| District of Columbia | DC | FairsFestivals-Eastern | 5 |
| Florida | FL | FairsFestivals-Eastern | 547 |
| Georgia | GA | FairsFestivals-Eastern | 186 |
| Illinois | IL | FairsFestivals-Eastern | 350 |
| Indiana | IN | FairsFestivals-Eastern | 169 |
| Kentucky | KY | FairsFestivals-Eastern | 79 |
| Maine | ME | FairsFestivals-Eastern | 102 |
| Maryland | MD | FairsFestivals-Eastern | 150 |
| Massachusetts | MA | FairsFestivals-Eastern | 185 |
| Michigan | MI | FairsFestivals-Eastern | 356 |
| Mississippi | MS | FairsFestivals-Eastern | 25 |
| New Hampshire | NH | FairsFestivals-Eastern | 67 |
| New Jersey | NJ | FairsFestivals-Eastern | 175 |
| New York | NY | FairsFestivals-Eastern | 391 |
| North Carolina | NC | FairsFestivals-Eastern | 411 |
| Ohio | OH | FairsFestivals-Eastern | 452 |
| Pennsylvania | PA | FairsFestivals-Eastern | 372 |
| Rhode Island | RI | FairsFestivals-Eastern | 50 |
| South Carolina | SC | FairsFestivals-Eastern | 99 |
| Tennessee | TN | FairsFestivals-Eastern | 174 |
| Vermont | VT | FairsFestivals-Eastern | 43 |
| Virginia | VA | FairsFestivals-Eastern | 251 |
| West Virginia | WV | FairsFestivals-Eastern | 21 |
| Wisconsin | WI | FairsFestivals-Eastern | 307 |
| Blue Ridge Regional Library | VA | FullCalendar-Libraries | 303 |
| Appoquinimink Public Library | DE | LibCal-DE | 104 |
| Bear Library | DE | LibCal-DE | 183 |
| Brandywine Hundred Library | DE | LibCal-DE | 14 |
| Bridgeville Public Library | DE | LibCal-DE | 67 |
| Claymont Library | DE | LibCal-DE | 17 |
| Delaware Libraries | DE | LibCal-DE | 20 |
| Dover Public Library | DE | LibCal-DE | 22 |
| Elsmere Library | DE | LibCal-DE | 7 |
| Hockessin Library | DE | LibCal-DE | 13 |
| Kirkwood Library | DE | LibCal-DE | 64 |
| Newark Free Library | DE | LibCal-DE | 29 |
| Woodlawn Library | DE | LibCal-DE | 8 |
| Boone County Public Library | KY | LibCal-KY | 0 |
| Kenton County Public Library | KY | LibCal-KY | 0 |
| Warren County Public Library | KY | LibCal-KY | 0 |
| Alamance County Library | NC | LibCal-NC | 48 |
| Brunswick County Public Library | NC | LibCal-NC | 10 |
| Craven-Pamlico Regional Library | NC | LibCal-NC | 0 |
| Durham County Library | NC | LibCal-NC | 20 |
| Gaston County Public Library | NC | LibCal-NC | 20 |
| Henderson County Public Library | NC | LibCal-NC | 5 |
| Iredell County Public Library | NC | LibCal-NC | 48 |
| New Hanover County Public Library | NC | LibCal-NC | 20 |
| Union County Public Library | NC | LibCal-NC | 25 |
| Concord Public Library | — | LibCal-NH | 47 |
| Hollis Social Library | — | LibCal-NH | 48 |
| Hooksett Public Library | — | LibCal-NH | 48 |
| Keene Public Library | — | LibCal-NH | 48 |
| Lebanon Public Libraries | — | LibCal-NH | 48 |
| Manchester City Library | — | LibCal-NH | 48 |
| Merrimack Public Library | — | LibCal-NH | 48 |
| Nashua Public Library | — | LibCal-NH | 48 |
| Pelham Public Library | — | LibCal-NH | 48 |
| Baldwin Public Library | NY | LibCal-NY2 | 0 |
| Dansville Public Library | NY | LibCal-NY2 | 20 |
| East Meadow Public Library | NY | LibCal-NY2 | 20 |
| Gardiner Library | NY | LibCal-NY2 | 20 |
| Highland Public Library | NY | LibCal-NY2 | 20 |
| Levittown Public Library | NY | LibCal-NY2 | 173 |
| Marcellus Free Library | NY | LibCal-NY2 | 20 |
| North Bellmore Public Library | NY | LibCal-NY2 | 20 |
| North Merrick Public Library | NY | LibCal-NY2 | 20 |
| Oceanside Public Library | NY | LibCal-NY2 | 20 |
| Plainview-Old Bethpage Public Library | NY | LibCal-NY2 | 154 |
| Rockville Centre Public Library | NY | LibCal-NY2 | 20 |
| Wantagh Public Library | NY | LibCal-NY2 | 20 |
| Barrington Public Library | RI | LibCal-RI | 20 |
| Coventry Public Library | RI | LibCal-RI | 20 |
| Cranston Public Library | RI | LibCal-RI | 20 |
| Cumberland Public Library | RI | LibCal-RI | 25 |
| East Providence Public Library | RI | LibCal-RI | 20 |
| George Hail Free Library | RI | LibCal-RI | 20 |
| Newport Public Library | RI | LibCal-RI | 20 |
| North Kingstown Free Library | RI | LibCal-RI | 0 |
| Pawtucket Public Library | RI | LibCal-RI | 10 |
| Rogers Free Library | RI | LibCal-RI | 20 |
| Warwick Public Library | RI | LibCal-RI | 20 |
| West Warwick Public Library | RI | LibCal-RI | 20 |
| Amherst County Public Library | VA | LibraryCalendar-Libraries | 22 |
| Appomattox Regional Library | VA | LibraryCalendar-Libraries | 14 |
| Atlantic County Library System | NJ | LibraryCalendar-Libraries | 24 |
| Bedford Public Library System | VA | LibraryCalendar-Libraries | 19 |
| Bloomingdale Public Library | IL | LibraryCalendar-Libraries | 20 |
| Carnegie Library of McKeesport | PA | LibraryCalendar-Libraries | 17 |
| Caroline County Public Library | MD | LibraryCalendar-Libraries | 18 |
| Cumberland County Public Library | NC | LibraryCalendar-Libraries | 23 |
| Essex Public Library | VA | LibraryCalendar-Libraries | 17 |
| Forsyth County Public Library | NC | LibraryCalendar-Libraries | 19 |
| Frederick County Public Libraries | MD | LibraryCalendar-Libraries | 15 |
| Gloucester County Library System | NJ | LibraryCalendar-Libraries | 21 |
| Grant County Public Library | KY | LibraryCalendar-Libraries | 13 |
| Haverstraw King's Daughters Public Library | NY | LibraryCalendar-Libraries | 20 |
| Howard County Library System | MD | LibraryCalendar-Libraries | 18 |
| Jessamine County Public Library | KY | LibraryCalendar-Libraries | 18 |
| Knox County Public Library | TN | LibraryCalendar-Libraries | 12 |
| Lynchburg Public Library | VA | LibraryCalendar-Libraries | 15 |
| Memphis Public Libraries | TN | LibraryCalendar-Libraries | 21 |
| Monroeville Public Library | PA | LibraryCalendar-Libraries | 11 |
| Petersburg Public Library | VA | LibraryCalendar-Libraries | 8 |
| Poquoson Public Library | VA | LibraryCalendar-Libraries | 18 |
| Portsmouth Public Library | VA | LibraryCalendar-Libraries | 18 |
| Powhatan County Public Library | VA | LibraryCalendar-Libraries | 14 |
| Rensselaerville Public Library | NY | LibraryCalendar-Libraries | 1 |
| Schenectady County Public Library | NY | LibraryCalendar-Libraries | 16 |
| Talbot County Free Library | MD | LibraryCalendar-Libraries | 22 |
| Waynesboro Public Library | VA | LibraryCalendar-Libraries | 17 |
| Wilkinsburg Public Library | PA | LibraryCalendar-Libraries | 7 |
| Wyandanch Public Library | NY | LibraryCalendar-Libraries | 17 |
| York County Library | SC | LibraryCalendar-Libraries | 19 |
| York County Public Library | VA | LibraryCalendar-Libraries | 21 |
| Fairfield Public Library | — | LibraryMarket-CT | 112 |
| Ferguson Library | — | LibraryMarket-CT | 24 |
| Meriden Public Library | — | LibraryMarket-CT | 7 |
| New Britain Public Library | — | LibraryMarket-CT | 23 |
| West Hartford Public Library | — | LibraryMarket-CT | 34 |
| Beaufort County Library | — | LibraryMarket-SC | 33 |
| Sumter County Library | — | LibraryMarket-SC | 7 |
| Spartanburg County Public Libraries | SC | Trumba-Spartanburg | 568 |
| Academy of Natural Sciences | PA | Venue-Events-ScienceArts | 10 |
| Adler Planetarium | IL | Venue-Events-ScienceArts | 7 |
| American Museum of Natural History | NY | Venue-Events-ScienceArts | 13 |
| Art Institute of Chicago | IL | Venue-Events-ScienceArts | 0 |
| Bishop Museum of Science & Nature | FL | Venue-Events-ScienceArts | 21 |
| Connecticut Science Center | CT | Venue-Events-ScienceArts | 18 |
| Conner Prairie Living History | IN | Venue-Events-ScienceArts | 7 |
| Corning Museum of Glass | NY | Venue-Events-ScienceArts | 75 |
| Fernbank Museum of Natural History | GA | Venue-Events-ScienceArts | 0 |
| Field Museum | IL | Venue-Events-ScienceArts | 1 |
| Franklin Institute | PA | Venue-Events-ScienceArts | 1 |
| Frost Science Museum | FL | Venue-Events-ScienceArts | 46 |
| Great Lakes Science Center | OH | Venue-Events-ScienceArts | 6 |
| Griffin Museum of Science and Industry | IL | Venue-Events-ScienceArts | 0 |
| Henry Ford Museum | MI | Venue-Events-ScienceArts | 1 |
| Imagination Station | OH | Venue-Events-ScienceArts | 0 |
| Impression 5 Science Center | MI | Venue-Events-ScienceArts | 1 |
| Indiana State Museum | IN | Venue-Events-ScienceArts | 14 |
| Intrepid Sea Air & Space Museum | NY | Venue-Events-ScienceArts | 0 |
| Kennedy Space Center Visitor Complex | FL | Venue-Events-ScienceArts | 62 |
| Maryland Science Center | MD | Venue-Events-ScienceArts | 8 |
| McAuliffe-Shepard Discovery Center | NH | Venue-Events-ScienceArts | 1 |
| Michigan Science Center | MI | Venue-Events-ScienceArts | 13 |
| Milwaukee Art Museum | WI | Venue-Events-ScienceArts | 20 |
| Museum of Science & Industry | FL | Venue-Events-ScienceArts | 1 |
| Museum of Science Boston | MA | Venue-Events-ScienceArts | 1 |
| National Building Museum | DC | Venue-Events-ScienceArts | 0 |
| NC Museum of Natural Sciences | NC | Venue-Events-ScienceArts | 20 |
| New York Hall of Science | NY | Venue-Events-ScienceArts | 1 |
| Science Museum of Virginia | VA | Venue-Events-ScienceArts | 9 |
| Smithsonian Air & Space Museum | DC | Venue-Events-ScienceArts | 10 |
| Smithsonian Natural History Museum | DC | Venue-Events-ScienceArts | 40 |
| Tellus Science Museum | GA | Venue-Events-ScienceArts | 14 |
| Tennessee State Museum | TN | Venue-Events-ScienceArts | 1 |
| Virginia Museum of Natural History | VA | Venue-Events-ScienceArts | 6 |
| Yale Peabody Museum | CT | Venue-Events-ScienceArts | 1 |
| ABBE Regional Library System | SC | WordPress-Abbe-Regional | 20 |
| Abbeville Memorial Library | — | WordPress-AL | 7 |
| Akron Public Library | AL | WordPress-AL | 0 |
| Andalusia Public Library | — | WordPress-AL | 0 |
| Athens-Limestone Public Library | — | WordPress-AL | 0 |
| Auburn Public Library | — | WordPress-AL | 1 |
| Birmingham Public Library | — | WordPress-AL | 1 |
| Blanche R. Solomon Memorial Library | — | WordPress-AL | 0 |
| Bridgeport - Lena Cagle Public Library | AL | WordPress-AL | 0 |
| Burchell Campbell Memorial Library | AL | WordPress-AL | 0 |
| Butler County Public Library | AL | WordPress-AL | 0 |
| Chelsea Public Library | AL | WordPress-AL | 0 |
| Choctaw County Public Library | AL | WordPress-AL | 0 |
| City Of Bayou La Batre Public Library | — | WordPress-AL | 0 |
| Clay Public Library | — | WordPress-AL | 0 |
| Collinsville Public Library | — | WordPress-AL | 0 |
| Daleville Public Library | — | WordPress-AL | 1 |
| Daphne Public Library | — | WordPress-AL | 0 |
| Decatur Public Library | — | WordPress-AL | 34 |
| Doris Stanley Memorial Library | — | WordPress-AL | 1 |
| Dothan Houston County Library System | — | WordPress-AL | 76 |
| Evergreen Public Library | — | WordPress-AL | 0 |
| Fairhope Public Library | — | WordPress-AL | 150 |
| Florence-Lauderdale Public Library | — | WordPress-AL | 0 |
| Foley Public Library | — | WordPress-AL | 0 |
| Gardendale Public Library | — | WordPress-AL | 1 |
| Grant Public Library | — | WordPress-AL | 0 |
| Guntersville Public Library | — | WordPress-AL | 0 |
| H. Grady Bradshaw - Chambers County Library | — | WordPress-AL | 1 |
| Hale County Library | AL | WordPress-AL | 0 |
| Hartford - Mcgregor-Mckinney Public Library | AL | WordPress-AL | 0 |
| Hoover Public Library | — | WordPress-AL | 4 |
| Houston-Love Memorial Library - Columbia | AL | WordPress-AL | 0 |
| Hueytown Public Library | — | WordPress-AL | 0 |
| Huntsville-Madison County Public Library | — | WordPress-AL | 11 |
| Irondale Public Library | — | WordPress-AL | 0 |
| Jane B. Holmes Public Library | — | WordPress-AL | 0 |
| Jane Culbreth Library | — | WordPress-AL | 0 |
| Jefferson County Library Cooperative | — | WordPress-AL | 0 |
| Kennedy Public Library | AL | WordPress-AL | 0 |
| Lafayette Pilot Public Library | — | WordPress-AL | 0 |
| Leighton Public Library | — | WordPress-AL | 21 |
| Madison Public Library | AL | WordPress-AL | 0 |
| Marion-Perry County Library | AL | WordPress-AL | 0 |
| Millbrook Public Library | AL | WordPress-AL | 0 |
| Mobile Public Library | — | WordPress-AL | 33 |
| Montgomery City-County Public Library | — | WordPress-AL | 83 |
| Newton Public Library | AL | WordPress-AL | 0 |
| Northwest Regional Library | — | WordPress-AL | 0 |
| Opp Public Library | — | WordPress-AL | 0 |
| Orange Beach Public Library | — | WordPress-AL | 0 |
| Piedmont Public Library | AL | WordPress-AL | 0 |
| Ruby Pickens Tartt Public Library | AL | WordPress-AL | 0 |
| Satsuma Public Library | — | WordPress-AL | 0 |
| Scottsboro Public Library | — | WordPress-AL | 0 |
| Selma-Dallas County Public Library | — | WordPress-AL | 1 |
| Sheffield Public Library | AL | WordPress-AL | 0 |
| Stevenson Public Library | — | WordPress-AL | 0 |
| Trussville Public Library | — | WordPress-AL | 4 |
| Tuscaloosa Public Library | — | WordPress-AL | 150 |
| Vernon - Mary Wallace Cobb Memorial Library | AL | WordPress-AL | 0 |
| Vestavia Hills Library | — | WordPress-AL | 150 |
| Walter J. Hanna Memorial Library | — | WordPress-AL | 0 |
| Warrior Public Library | — | WordPress-AL | 0 |
| Wilcox County Library | AL | WordPress-AL | 0 |
| Wilsonville - Vernice Stoudenmire Library | AL | WordPress-AL | 0 |
| Andover Public Library | CT | WordPress-CT | 0 |
| Ansonia Public Library | CT | WordPress-CT | 0 |
| Beacon Falls Public Library | CT | WordPress-CT | 0 |
| Beardsley Memorial Library | CT | WordPress-CT | 0 |
| Bethel Public Library | CT | WordPress-CT | 0 |
| Bethlehem Public Library | CT | WordPress-CT | 0 |
| Bill Library | CT | WordPress-CT | 1 |
| Bridgeport Public Library | CT | WordPress-CT | 0 |
| Bristol Public Library | CT | WordPress-CT | 220 |
| Brookfield Library | CT | WordPress-CT | 93 |
| Canterbury Public Library | CT | WordPress-CT | 0 |
| Cheshire Public Library | CT | WordPress-CT | 2 |
| Chester Public Library | CT | WordPress-CT | 0 |
| Clark Memorial Library | CT | WordPress-CT | 10 |
| Community Branch Library | CT | WordPress-CT | 1 |
| Cornwall Library Association | CT | WordPress-CT | 17 |
| Cyrenius H. Booth Library | CT | WordPress-CT | 0 |
| Danbury Public Library | CT | WordPress-CT | 0 |
| Darien Library | CT | WordPress-CT | 20 |
| Douglas Library Of Hebron | CT | WordPress-CT | 0 |
| Durham Public Library | CT | WordPress-CT | 48 |
| E.C. Scranton Memorial Library | CT | WordPress-CT | 0 |
| East Hampton Public Library | CT | WordPress-CT | 0 |
| East Hartford Public Library | CT | WordPress-CT | 0 |
| Easton Public Library | CT | WordPress-CT | 0 |
| Edith Wheeler Memorial Library | CT | WordPress-CT | 0 |
| Enfield Public Library | CT | WordPress-CT | 6 |
| Essex Library Association | CT | WordPress-CT | 0 |
| Fairfield Public Library | CT | WordPress-CT | 0 |
| Farmington Library | CT | WordPress-CT | 0 |
| Frederick H. Cossitt Library | CT | WordPress-CT | 0 |
| Goshen Public Library | CT | WordPress-CT | 0 |
| Greenwich Library | CT | WordPress-CT | 0 |
| Hartford Public Library | CT | WordPress-CT | 0 |
| Hartland Public Library | CT | WordPress-CT | 0 |
| Harwinton Public Library | CT | WordPress-CT | 106 |
| Henry Carter Hull Library | CT | WordPress-CT | 0 |
| Ivoryton Library Association | CT | WordPress-CT | 0 |
| Janet Carlson Calvert Library | CT | WordPress-CT | 0 |
| Jonathan Trumbull Library | CT | WordPress-CT | 0 |
| Kent Library Association | CT | WordPress-CT | 65 |
| Kent Memorial Library | CT | WordPress-CT | 0 |
| Killingworth Library | CT | WordPress-CT | 0 |
| Louis Piantino Branch Library | CT | WordPress-CT | 0 |
| Manchester Public Library | CT | WordPress-CT | 9 |
| Middlebury Public Library | CT | WordPress-CT | 24 |
| Middletown Public Library | CT | WordPress-CT | 1 |
| Milford Public Library | CT | WordPress-CT | 0 |
| Minor Memorial Library | CT | WordPress-CT | 45 |
| Mystic Noank Library | CT | WordPress-CT | 0 |
| New Britain Public Library | CT | WordPress-CT | 58 |
| New Canaan Library | CT | WordPress-CT | 80 |
| New Fairfield Free Public Library | CT | WordPress-CT | 6 |
| New Haven Free Public Library | CT | WordPress-CT | 1 |
| New Milford Public Library | CT | WordPress-CT | 1 |
| Norfolk Library | CT | WordPress-CT | 12 |
| North Haven Memorial Library | CT | WordPress-CT | 0 |
| Norwalk Public Library | CT | WordPress-CT | 3 |
| Oakville Branch Library | CT | WordPress-CT | 0 |
| Old Lyme - Phoebe Griffin Noyes Library | CT | WordPress-CT | 0 |
| Otis Library | CT | WordPress-CT | 40 |
| Pequot Library Association | CT | WordPress-CT | 0 |
| Plainville Public Library | CT | WordPress-CT | 0 |
| Pomfret Public Library | CT | WordPress-CT | 0 |
| Preston Public Library | CT | WordPress-CT | 1 |
| Public Library Of New London | CT | WordPress-CT | 0 |
| Ridgefield Library | CT | WordPress-CT | 10 |
| Salem Free Public Library | CT | WordPress-CT | 0 |
| Saxton B. Little Free Library | CT | WordPress-CT | 0 |
| Scoville Memorial Library | CT | WordPress-CT | 0 |
| Shelton Public Library | CT | WordPress-CT | 34 |
| Sherman Library Assn. | CT | WordPress-CT | 1 |
| South Windsor Public Library | CT | WordPress-CT | 67 |
| Southbury Public Library | CT | WordPress-CT | 62 |
| Southington Public Library | CT | WordPress-CT | 0 |
| Stafford Library Association | CT | WordPress-CT | 1 |
| Stonington Free Library | CT | WordPress-CT | 0 |
| Stratford Library | CT | WordPress-CT | 1 |
| Thomaston Public Library | CT | WordPress-CT | 0 |
| Torrington Library | CT | WordPress-CT | 0 |
| Trumbull Library | CT | WordPress-CT | 0 |
| Union Free Public Library | CT | WordPress-CT | 0 |
| Vernon Public Library | CT | WordPress-CT | 0 |
| Wallingford Public Library | CT | WordPress-CT | 30 |
| Warren Public Library | CT | WordPress-CT | 0 |
| Waterbury Public Library | CT | WordPress-CT | 0 |
| Waterford Public Library | CT | WordPress-CT | 0 |
| West Hartford Public Library | CT | WordPress-CT | 76 |
| Westbrook Public Library | CT | WordPress-CT | 25 |
| Westport Library | CT | WordPress-CT | 15 |
| Willimantic Public Library | CT | WordPress-CT | 20 |
| Wilson Branch Library | CT | WordPress-CT | 0 |
| Wilton Library Association | CT | WordPress-CT | 1 |
| Windham Free Library | CT | WordPress-CT | 10 |
| Windsor Locks Public Library | CT | WordPress-CT | 0 |
| Wolcott Public Library | CT | WordPress-CT | 1 |
| Woodbury Public Library | CT | WordPress-CT | 0 |
| Alma-Bacon County Public Library | GA | WordPress-GA | 4 |
| Appleby Branch | GA | WordPress-GA | 1 |
| Athens Regional Library System | GA | WordPress-GA | 40 |
| Baker County | GA | WordPress-GA | 0 |
| Boston Carnegie Library | GA | WordPress-GA | 20 |
| Bowman Branch | GA | WordPress-GA | 34 |
| Brooks County Public Library System | GA | WordPress-GA | 0 |
| Brunswick Glynn County Regional Library | GA | WordPress-GA | 1 |
| Butler Public Library | GA | WordPress-GA | 0 |
| Byron Public Library | GA | WordPress-GA | 77 |
| Cedartown Library | GA | WordPress-GA | 10 |
| Centerville Branch Library | GA | WordPress-GA | 0 |
| Chattahoochee Valley Regional Library System | GA | WordPress-GA | 0 |
| Chattooga County Library System | GA | WordPress-GA | 0 |
| Cherokee Regional Library System | GA | WordPress-GA | 1 |
| Clarkesville-Habersham Co. Lib. | GA | WordPress-GA | 0 |
| Clarkston Branch | GA | WordPress-GA | 1 |
| Clermont Library | GA | WordPress-GA | 0 |
| Commerce Public Library | GA | WordPress-GA | 0 |
| Coolidge Public Library | GA | WordPress-GA | 0 |
| Cornelia-Habersham Co. Lib. | GA | WordPress-GA | 1 |
| Covington Branch | GA | WordPress-GA | 2 |
| Dalton-Whitfield County Public Library | GA | WordPress-GA | 0 |
| Douglas-Coffee County Public Library | GA | WordPress-GA | 0 |
| Duluth | GA | WordPress-GA | 0 |
| Effingham | GA | WordPress-GA | 0 |
| Elizabeth Harris Library | GA | WordPress-GA | 0 |
| Gibbs Memorial Library | GA | WordPress-GA | 0 |
| Gordon Public Library | GA | WordPress-GA | 0 |
| Grantville Public Library | GA | WordPress-GA | 5 |
| Greene County Library | GA | WordPress-GA | 0 |
| Greenville Area Public Library | GA | WordPress-GA | 0 |
| Hancock County Library | GA | WordPress-GA | 0 |
| Harlie Fulford Memorial Library | GA | WordPress-GA | 0 |
| Heard County Public Library | GA | WordPress-GA | 0 |
| Hickory Flat Public Library | GA | WordPress-GA | 0 |
| Hightower Memorial Library | GA | WordPress-GA | 0 |
| Houston County Public Libraries System | GA | WordPress-GA | 0 |
| Ida Hilton Public Library | GA | WordPress-GA | 0 |
| Jefferson County Library System | GA | WordPress-GA | 1 |
| Lagrange Memorial Library | GA | WordPress-GA | 0 |
| Lake Sinclair Library | GA | WordPress-GA | 0 |
| Laurens County Library | GA | WordPress-GA | 0 |
| Lewis A. Ray Library | GA | WordPress-GA | 0 |
| Marion County Library | GA | WordPress-GA | 0 |
| Meigs Public Library | GA | WordPress-GA | 4 |
| Middle Georgia Regional Library System | GA | WordPress-GA | 0 |
| Miller Lakeland Library | GA | WordPress-GA | 1 |
| Monroe County Library | GA | WordPress-GA | 0 |
| Monroe-Walton County Library | GA | WordPress-GA | 0 |
| Morgan County Library | GA | WordPress-GA | 0 |
| Nelle Brown Memorial Public Library | GA | WordPress-GA | 0 |
| New Georgia Public Library | GA | WordPress-GA | 10 |
| Oglethorpe County Library | GA | WordPress-GA | 0 |
| Parks Memorial Library | GA | WordPress-GA | 0 |
| Riverdale Branch Library | GA | WordPress-GA | 0 |
| Rockmart Library | GA | WordPress-GA | 0 |
| Rossville Public Library | GA | WordPress-GA | 0 |
| Scottdale-Tobie Grant Branch | GA | WordPress-GA | 0 |
| Senoia Area Public Library | GA | WordPress-GA | 5 |
| Thomson-Mcduffie County Library | GA | WordPress-GA | 0 |
| Warren P. Sewell Memorial Library-Bremen | GA | WordPress-GA | 14 |
| Wayne County Library | GA | WordPress-GA | 1 |
| Wheeler County Library | GA | WordPress-GA | 0 |
| White County Public Library-Cleveland Branch | GA | WordPress-GA | 0 |
| Wilcox County Public Library | GA | WordPress-GA | 4 |
| Alleghany County Public Library | NC | WordPress-NC | 0 |
| Bath Community Library | NC | WordPress-NC | 0 |
| Beatties Ford Road Branch Library | NC | WordPress-NC | 1 |
| Belmont Branch Library | NC | WordPress-NC | 6 |
| Black Creek Branch Library | NC | WordPress-NC | 50 |
| Blanche Benjamin Branch Library | NC | WordPress-NC | 0 |
| Boonville Community Public Library | NC | WordPress-NC | 0 |
| Brunswick County Library | NC | WordPress-NC | 0 |
| Bunn Branch Library | NC | WordPress-NC | 0 |
| Carver Branch Library | NC | WordPress-NC | 0 |
| Cary Branch Library | NC | WordPress-NC | 4 |
| Catawba County Library | NC | WordPress-NC | 2 |
| Claremont Branch Library | NC | WordPress-NC | 0 |
| Cleveland County Memorial Library | NC | WordPress-NC | 0 |
| Craven-Pamlico-Carteret Regional Library | NC | WordPress-NC | 4 |
| Dallas Branch Library | NC | WordPress-NC | 6 |
| Danbury Public Library | NC | WordPress-NC | 0 |
| Davidson County Public Library System | NC | WordPress-NC | 0 |
| Dobson Community Library | NC | WordPress-NC | 0 |
| East Branch Library | NC | WordPress-NC | 50 |
| Farmville Public Library | NC | WordPress-NC | 0 |
| Florence S. Shanklin Branch Library | NC | WordPress-NC | 27 |
| Franklin County Library | NC | WordPress-NC | 4 |
| Graham Public Library | NC | WordPress-NC | 0 |
| Harmony Branch Library | NC | WordPress-NC | 0 |
| Havelock-Craven County Public | NC | WordPress-NC | 0 |
| Hazel W. Guilford Memorial Library | NC | WordPress-NC | 0 |
| Hickory Public Library | NC | WordPress-NC | 0 |
| Hudson Branch Library | NC | WordPress-NC | 0 |
| J.C. Holliday Library | NC | WordPress-NC | 0 |
| John W. Clark Public Library | NC | WordPress-NC | 0 |
| King Public Library | NC | WordPress-NC | 1 |
| La Grange Branch Library | NC | WordPress-NC | 0 |
| Lawrence Memorial Library | NC | WordPress-NC | 0 |
| Leland Branch Library | NC | WordPress-NC | 0 |
| Littleton Public Library (Wc Jones Memorial) | NC | WordPress-NC | 0 |
| Lowell Branch Library | NC | WordPress-NC | 6 |
| Macon County Public Library | NC | WordPress-NC | 0 |
| Madison Branch Library | NC | WordPress-NC | 0 |
| Madison County Public Library | NC | WordPress-NC | 0 |
| Margaret Little Blount Library | NC | WordPress-NC | 0 |
| Mary Duncan Public Library | NC | WordPress-NC | 0 |
| Mcdowell County Law Library | NC | WordPress-NC | 0 |
| Mooresville Public Library | NC | WordPress-NC | 1 |
| Myrtle Grove Branch | NC | WordPress-NC | 9 |
| Norwood Branch Library | NC | WordPress-NC | 0 |
| Pettigrew Regional Library | NC | WordPress-NC | 0 |
| Polk County Public Library | NC | WordPress-NC | 0 |
| Princeton Public Library | NC | WordPress-NC | 0 |
| Public Library Of Johnston County Smithfield | NC | WordPress-NC | 0 |
| Roanoke Rapids Public Library | NC | WordPress-NC | 4 |
| Rowan Public Library | NC | WordPress-NC | 0 |
| Selma Public Library | NC | WordPress-NC | 0 |
| Spring Lake Branch | NC | WordPress-NC | 0 |
| Stanley Branch Library | NC | WordPress-NC | 6 |
| Star Branch | NC | WordPress-NC | 0 |
| Tyrrell County Library | NC | WordPress-NC | 0 |
| Union County Public Library | NC | WordPress-NC | 0 |
| Union West Branch Library | NC | WordPress-NC | 0 |
| Warsaw-Kornegay Public Library | NC | WordPress-NC | 0 |
| Watauga County Public Library | NC | WordPress-NC | 0 |
| Wayne County Public Library, Fremont | NC | WordPress-NC | 0 |
| Adams Memorial Library | — | WordPress-TN | 1 |
| Alexandria Branch Library | — | WordPress-TN | 0 |
| Athens Public Library | — | WordPress-TN | 1 |
| Auburntown Public Library | — | WordPress-TN | 1 |
| Audrey Pack Memorial Library | TN | WordPress-TN | 0 |
| Bartlett Library | — | WordPress-TN | 0 |
| Baxter Branch Library | TN | WordPress-TN | 0 |
| Benton County Library | TN | WordPress-TN | 0 |
| Blount County Public Library | — | WordPress-TN | 0 |
| Carroll County Library | TN | WordPress-TN | 0 |
| Chattanooga Public Library | — | WordPress-TN | 150 |
| Clarksville-Montgomery County Public Library | — | WordPress-TN | 0 |
| Cleveland-Bradley County Public Library | — | WordPress-TN | 1 |
| Clinton Public Library | TN | WordPress-TN | 0 |
| Coffee County Lannom Memorial Public Library | — | WordPress-TN | 0 |
| Collierville Burch Library | — | WordPress-TN | 0 |
| Crockett County Library | — | WordPress-TN | 0 |
| Crossville-Cumberland County Public Library | — | WordPress-TN | 0 |
| Franklin County Public Library | TN | WordPress-TN | 0 |
| Franklin Public Library | — | WordPress-TN | 0 |
| Germantown Community Library | TN | WordPress-TN | 0 |
| Gleason Memorial Library | TN | WordPress-TN | 0 |
| Hamilton Parks Public Library | — | WordPress-TN | 1 |
| Harriman Public Library | — | WordPress-TN | 0 |
| Hendersonville Public Library | — | WordPress-TN | 0 |
| Hickman County Public Library | — | WordPress-TN | 0 |
| Humphreys County Public Library | — | WordPress-TN | 0 |
| Johnson City Public Library | — | WordPress-TN | 19 |
| Kingsport Public Library | — | WordPress-TN | 0 |
| Kingston Public Library | TN | WordPress-TN | 0 |
| Knox County Public Library | — | WordPress-TN | 24 |
| Lauderdale County Library | — | WordPress-TN | 52 |
| Madisonville Public Library | — | WordPress-TN | 0 |
| Mary E. Tippitt Memorial Library | TN | WordPress-TN | 0 |
| Meigs-Decatur Public Library | — | WordPress-TN | 1 |
| Memphis Public Libraries | — | WordPress-TN | 30 |
| Middleton Community Library | — | WordPress-TN | 0 |
| Mildred G. Fields Memorial Library | TN | WordPress-TN | 0 |
| Millard Oakley Public Library | TN | WordPress-TN | 0 |
| Monterey Branch Library | TN | WordPress-TN | 0 |
| Morristown-Hamblen Library | — | WordPress-TN | 1 |
| Mt. Juliet-Harvey Freeman Public Library | — | WordPress-TN | 0 |
| Nashville Public Library | — | WordPress-TN | 1 |
| Nashville Talking Library | TN | WordPress-TN | 0 |
| Newbern City Library | — | WordPress-TN | 0 |
| Parsons Public Library | — | WordPress-TN | 0 |
| Rogersville Public Library | — | WordPress-TN | 0 |
| Rutherford County Library System | TN | WordPress-TN | 0 |
| Sam T. Wilson Public Library | TN | WordPress-TN | 0 |
| Savannah-Hardin County Library | — | WordPress-TN | 1 |
| Sequatchie County Public Library | TN | WordPress-TN | 0 |
| Sevier County Public Library System | — | WordPress-TN | 0 |
| Smyrna Public Library | TN | WordPress-TN | 0 |
| Southeast Branch Library | — | WordPress-TN | 0 |
| Spring Hill Public Library | — | WordPress-TN | 0 |
| Sweetwater Public Library | — | WordPress-TN | 1 |
| The Brentwood Library | TN | WordPress-TN | 0 |
| Tipton County Public Library | TN | WordPress-TN | 0 |
| Washburn Public Library | — | WordPress-TN | 0 |
| Westmoreland Public Library | — | WordPress-TN | 0 |
| White County Public Library | TN | WordPress-TN | 0 |
| White Pine Public Library | — | WordPress-TN | 1 |
| Winfield Public Library | — | WordPress-TN | 0 |
| Alexandria Library | — | WordPress-VA | 0 |
| Chesapeake Public Library | VA | WordPress-VA | 0 |
| Culpeper County Library | — | WordPress-VA | 21 |
| Jefferson-Madison Regional Library | — | WordPress-VA | 0 |
| Manassas Park City Library | — | WordPress-VA | 10 |
| Ainsworth Public | VT | WordPress-VT | 0 |
| Aldrich Public Library | VT | WordPress-VT | 0 |
| Barton Public | VT | WordPress-VT | 0 |
| Bennington Free | VT | WordPress-VT | 1 |
| Benson Public | VT | WordPress-VT | 0 |
| Bent Northrup Memorial | VT | WordPress-VT | 1 |
| Bethel Public | VT | WordPress-VT | 0 |
| Bradford Public | VT | WordPress-VT | 0 |
| Brandon Free Public | VT | WordPress-VT | 0 |
| Brooks Memorial Library | VT | WordPress-VT | 150 |
| Brownell Library | VT | WordPress-VT | 150 |
| Butterfield | VT | WordPress-VT | 0 |
| Cabot Public | VT | WordPress-VT | 0 |
| Charlotte | VT | WordPress-VT | 70 |
| Chelsea Public | VT | WordPress-VT | 0 |
| Cobleigh Public Library | VT | WordPress-VT | 0 |
| Cornwall Free Public | VT | WordPress-VT | 0 |
| Cutler Memorial | VT | WordPress-VT | 0 |
| Deborah Rawson Memorial Library | VT | WordPress-VT | 17 |
| Essex Free | VT | WordPress-VT | 0 |
| Fair Haven Free | VT | WordPress-VT | 0 |
| Fairfax Community | VT | WordPress-VT | 0 |
| Fletcher Free Library | VT | WordPress-VT | 4 |
| Franklin-Grand Isle Bookmobile | VT | WordPress-VT | 117 |
| G. M. Kelley Community | VT | WordPress-VT | 0 |
| Gilman Public Library | VT | WordPress-VT | 0 |
| Glover Public | VT | WordPress-VT | 0 |
| Greensboro Free | VT | WordPress-VT | 0 |
| Hancock Free Public | VT | WordPress-VT | 1 |
| Hartford | VT | WordPress-VT | 0 |
| Hartland Public Library | VT | WordPress-VT | 0 |
| Haskell Free Library | VT | WordPress-VT | 0 |
| Haston | VT | WordPress-VT | 0 |
| Hitchcock Museum | VT | WordPress-VT | 0 |
| Huntington Public | VT | WordPress-VT | 0 |
| Ilsley Public Library | VT | WordPress-VT | 16 |
| Jaquith Public | VT | WordPress-VT | 0 |
| Kellogg-Hubbard Library | VT | WordPress-VT | 150 |
| Lanpher Memorial | VT | WordPress-VT | 1 |
| Latham Memorial | VT | WordPress-VT | 1 |
| Martha Canfield Memorial | VT | WordPress-VT | 0 |
| Moore Free | VT | WordPress-VT | 0 |
| Morrill Mem. Harris | VT | WordPress-VT | 0 |
| Morristown Centennial Library | VT | WordPress-VT | 0 |
| Mount Holly | VT | WordPress-VT | 0 |
| Norman Williams Public Library | VT | WordPress-VT | 150 |
| North Hero Public | VT | WordPress-VT | 1 |
| Norwich Public | VT | WordPress-VT | 1 |
| Peacham | VT | WordPress-VT | 2 |
| Pettee Memorial | VT | WordPress-VT | 1 |
| Pierson Library | VT | WordPress-VT | 24 |
| Pope Memorial | VT | WordPress-VT | 0 |
| Proctor Free | VT | WordPress-VT | 0 |
| Putney Public | VT | WordPress-VT | 41 |
| Quechee | VT | WordPress-VT | 6 |
| Reading Public | VT | WordPress-VT | 1 |
| Readsboro Community | VT | WordPress-VT | 0 |
| Rochester Public | VT | WordPress-VT | 0 |
| Rockingham Free Public Library | VT | WordPress-VT | 12 |
| Roxbury Free | VT | WordPress-VT | 0 |
| Russell Memorial | VT | WordPress-VT | 1 |
| Salisbury Free Public | VT | WordPress-VT | 0 |
| Sheldon Public | VT | WordPress-VT | 0 |
| Shrewsbury | VT | WordPress-VT | 0 |
| Springfield Town Library | VT | WordPress-VT | 2 |
| St. Johnsbury Athenaeum | VT | WordPress-VT | 3 |
| Stamford Community | VT | WordPress-VT | 0 |
| Stowe Free | VT | WordPress-VT | 0 |
| Tenney Memorial | VT | WordPress-VT | 0 |
| Tunbridge Public | VT | WordPress-VT | 34 |
| Vernon Free | VT | WordPress-VT | 0 |
| Warren Public | VT | WordPress-VT | 0 |
| West Hartford | VT | WordPress-VT | 0 |
| Westminster West Public | VT | WordPress-VT | 0 |
| Whiting | VT | WordPress-VT | 0 |
| Windham Town | VT | WordPress-VT | 2 |
| Windsor Public | VT | WordPress-VT | 0 |
| Woodbury Community | VT | WordPress-VT | 1 |
| Enoch Pratt Free Library (scraper aggregate — no per-site log shape) | MD | Pratt-Library | 2226 |
| Free Library of Philadelphia (scraper aggregate — no per-site log shape) | PA | FreeLibrary-Philadelphia | 1000 |
| Westmoreland County Federated Library System (scraper aggregate — no per-site log shape) | PA | Westmoreland-Library | 24 |

**Cycle-completion check: not complete.** Across the current cycle (`## 2026-08-28`, `## 2026-08-29`, `## 2026-08-30`, plus today) **69 of 97** active library-family scrapers have at least one row and **28** do not. 27 of the 28 are **Group 2**, which has not completed a rotation since 2026-08-27 (`group-last-run.json` records `"2": "2026-08-28T05:05:47Z"`, the finish time of that run) — its 2026-08-29 turn was dropped because the 2026-08-28 Group 1 run was still executing at the 3:00 AM trigger and the task is registered `MultipleInstances=IgnoreNew`. This is the overrun-drop mechanism `scrapers/helpers/group-catchup.js` was written for, and its `STARVATION_DAYS = 4` threshold did not fire today because Group 2 measured 3.08 days since completion. Missing Group 2: LibCal-GA, LibCal-MA, LibCal-NY1, LibCal-PA, LibCal-WV, LibCal-VT, Communico-GA, Communico-NJ, Communico-KY, Communico-SC, Communico-AL, BiblioCommons-GA, BiblioCommons-NC, LibraryMarket-GA, LibraryMarket-ME-NH-MA, Brooklyn-Library, Louisville-Library, EventActions-Libraries, CustomDrupal-Libraries, Tockify-Horry, Graniculator-Morris, WordPress-MD, WordPress-NY, WordPress-FL, WordPress-NJ, WordPress-MS, WordPress-ME. The 28th is `WordPressTec-Parks` (Group 3), which ran on 2026-08-30 but produced neither a per-site breakdown nor an aggregate row. No `Cycle complete` marker is added.

## 2026-09-01

<!-- NO-ROWS: no library-family scraper ran in this window; the rotation trigger was discarded and only the pre-split MacaroniKid Group 1 tail completed. -->

**No library scrapers ran today, so no new rows.** No rotation started (the 03:00 trigger was discarded while the 2026-08-31 Group 1 run was still executing — `ROTATION-STARVATION-LOG.md`). The only work that completed inside today's window is the pre-split **MacaroniKid Group 1 tail** (PA, NC, MA, TN, AL, KY, RI, DC, WV), which belongs to no library family and is recorded in `AGE-RANGE-AUDIT.md` instead.

**Cycle-completion check: not complete.** Across the current cycle (`## 2026-08-28`, `## 2026-08-29`, `## 2026-08-30`, `## 2026-08-31`, plus today) **74 of 106** active library-family scrapers have at least one row and **32** do not. **All 32 are Group 2**: LibCal-GA, LibCal-MA, LibCal-NY1, LibCal-PA, LibCal-WV, LibCal-VT, Communico-GA, Communico-NJ, Communico-KY, Communico-SC, Communico-AL, BiblioCommons-GA, BiblioCommons-NC, LibraryMarket-GA, LibraryMarket-ME-NH-MA, Howard-County, Brooklyn-Library, Cecil-County, Somerset-County, Berks-County, Rockbridge-Regional, Louisville-Library, EventActions-Libraries, CustomDrupal-Libraries, Tockify-Horry, Graniculator-Morris, WordPress-MD, WordPress-NY, WordPress-FL, WordPress-NJ, WordPress-MS, WordPress-ME.

Group 2 last completed **2026-08-28T05:05:47Z** — 4.6 days ago against a 3-day cadence. Its 08-29 turn was dropped after the 08-28 Group 1 overrun, and its 09-01 turn did not exist (day 1 is Group 1's calendar turn, and that trigger was itself discarded). Its next calendar turn is **2026-09-02**, and nothing is in flight, so it should run. No `Cycle complete` marker is added.

## 2026-09-02

<!-- NO-ROWS: no library-family scraper ran in this window; the rotation task fired but its batch died before launching node, and only the MacaroniKid Group 2 pass completed. -->

**No library scrapers ran today, so no new rows.** Unlike 2026-09-01, the trigger was **not** discarded — it fired (`FunHive-Scrapers LastRunTime = 2026-09-02 03:00:01`) and the batch died on its first line with `LastTaskResult = 1`, no `scraper-run-2026-09-02.log` and no `FunHive scrapers starting` marker. Cause: `run-scrapers.bat` and `run-macaroni.bat` both redirected into `logs\scraper-stdout.log`, and `cmd.exe` will not share a `>>` target between processes, so the rotation could not open its redirect while `FunHive-Macaroni` held it and node never launched. Fixed today by splitting the capture files; `scripts/build-library-site-audit.js` now parses both, so no per-site detail is lost (verified: re-parsing the 08-31 window still yields 617 rows across 34 scrapers). See `ROTATION-STARVATION-LOG.md` intervention #6.

The only work that completed inside today's window is the **MacaroniKid Group 2 pass** (FL, NY, GA, CT, MD, NH, ME), which belongs to no library family and is recorded in `AGE-RANGE-AUDIT.md` instead.

**Cycle-completion check: not complete.** Across the current cycle (`## 2026-08-28`, `## 2026-08-29`, `## 2026-08-30`, `## 2026-08-31`, `## 2026-09-01`, plus today) **74 of 106** active library-family scrapers have at least one row and **32** do not. The missing set is unchanged from 2026-09-01 and is still **entirely Group 2**: LibCal-GA, LibCal-MA, LibCal-NY1, LibCal-PA, LibCal-WV, LibCal-VT, Communico-GA, Communico-NJ, Communico-KY, Communico-SC, Communico-AL, BiblioCommons-GA, BiblioCommons-NC, LibraryMarket-GA, LibraryMarket-ME-NH-MA, Howard-County, Brooklyn-Library, Cecil-County, Somerset-County, Berks-County, Rockbridge-Regional, Louisville-Library, EventActions-Libraries, CustomDrupal-Libraries, Tockify-Horry, Graniculator-Morris, WordPress-MD, WordPress-NY, WordPress-FL, WordPress-NJ, WordPress-MS, WordPress-ME.

**Group 2's regular scrapers have now not run since 2026-08-27** — its 08-29, 09-01 and 09-02 turns were all lost to three different failure modes (overrun-discard, calendar, and today's redirect kill). `group-last-run.json` was reset at 2026-09-02T12:53Z by the group rebalance, and `selectGroup()` treats absent history as "not starved", so no catch-up will fire: the next Group 2 turn is its calendar turn on **2026-09-05** (09-03 = G3, 09-04 = G1). These 32 rows will therefore stay missing for three more days. That gap is bounded and self-correcting within one cycle, and was deliberately not closed by a manual run today — starting a ~7.6h rotation at ~14:30 would have forced the 15:00 MacaroniKid task to wait ~7.2h against its 8h lock bound. No `Cycle complete` marker is added.

## 2026-09-03

Group 3 rotation, started **2026-09-03T10:16:04Z** and finished 17:46:56Z (53 scrapers, 0 failed). The 03:00 trigger did not start on time: `FunHive-Macaroni` held `runner.lock` from 2026-09-02T19:00Z, so the rotation waited 3.25h and acquired at 10:16Z. **That is the lock working as designed — it ran LATE instead of being DROPPED**, which before 2026-08-31 would have been a silently discarded trigger.

**1,153 per-site rows from 32 library scrapers** with per-site log output; **596 zero-event sites**.

**Zero-event concentration is again almost entirely the WordPress-{state} family**: 594 of the 596 zeroes come from nine WordPress files (NY 199/391, MA 130/201, NJ 79/157, NH 66/105, GA 43/66, KY 31/53, SC 26/37, RI 17/34, WordPress-Events-Calendar 2/13, WordPress-Abbe-Regional 1/1). That is the known platform-heterogeneity gap, not a new regression. The remaining two are one LibCal-RI branch and Camden County Library System under Communico-NJ.

**WordPress-Abbe-Regional's zero is a LIBRARY-SIDE OUTAGE, not an extraction bug, and not a recurrence of its two prior defects.** abbe-lib.org currently returns **HTTP 500 with a WordPress "Database Error" page** (2,482 bytes, ~450ms) on every path tried — `/`, `/events/`, and the apex without `www`. The 2026-08-25 navigation-retry fix is present and fired correctly, logging all three attempts before giving up (`retry 1/2` at 30s networkidle2, `retry 2/2` and the final failure at 45s domcontentloaded), which is why the scraper took 131.2s instead of its usual ~30s. Nothing in this repo can fix a database error on the library's own server; the entry is left enabled so the site is re-tried automatically once the library restores it.

**Four single-system library scrapers ran today and get aggregate rows, not per-site rows** — they emit neither the `📍 name … Found N events` nor the `📚 Scraping name…` shape the builder recognises, so their numbers are the run table's FOUND column for the whole scraper and are labelled as such.

| Library Website | State | Scraper | Events Found |
|---|---|---|---|
| Boston Public Library | MA | BiblioCommons-MA | 498 |
| Lawrence Public Library | MA | BiblioCommons-MA | 484 |
| Burlington County Library System | NJ | BiblioCommons-NJ | 487 |
| Central Rappahannock Regional Library | VA | BiblioCommons-VA | 499 |
| Chattahoochee Valley Libraries | GA | Communico-GA | 14 |
| Clayton County Library System | GA | Communico-GA | 9 |
| DeKalb County Public Library | GA | Communico-GA | 12 |
| Forsyth County Public Library | GA | Communico-GA | 15 |
| Gwinnett County Public Library | GA | Communico-GA | 25 |
| Henry County Library System | GA | Communico-GA | 11 |
| Anderson Public Library | KY | Communico-KY | 35 |
| Lexington Public Library | KY | Communico-KY | 11 |
| Muhlenberg County Public Libraries | KY | Communico-KY | 53 |
| Pike County Public Library | KY | Communico-KY | 3 |
| Worcester Public Library | MA | Communico-MA | 9 |
| Camden County Library System | NJ | Communico-NJ | 0 |
| Cape May County Library | NJ | Communico-NJ | 13 |
| Hoboken Public Library | NJ | Communico-NJ | 7 |
| Middlesex County Library | NJ | Communico-NJ | 11 |
| Ocean County Library | NJ | Communico-NJ | 31 |
| Princeton Public Library | NJ | Communico-NJ | 7 |
| Somerset County Library System | NJ | Communico-NJ | 17 |
| Warren County Library | NJ | Communico-NJ | 4 |
| Collierville Burch Library | TN | Communico-TN | 3 |
| Chesapeake Public Library | VA | Communico-VA | 10 |
| Loudoun County Public Library | VA | Communico-VA | 31 |
| Prince William Public Library | VA | Communico-VA | 13 |
| Somerset County Library | — | GoogleCalendar-MD | 169 |
| Morris County Library | NJ | Graniculator-Morris | 12 |
| Camden County Library System | NJ | Intercept-Camden | 10 |
| Clay County Public Library | FL | LibCal-FL | 20 |
| Lakeland Public Library | FL | LibCal-FL | 20 |
| Marion County Public Library System | FL | LibCal-FL | 10 |
| Palm Beach County Library System | FL | LibCal-FL | 1 |
| Concord Public Library | — | LibCal-NH | 42 |
| Hollis Social Library | — | LibCal-NH | 48 |
| Hooksett Public Library | — | LibCal-NH | 48 |
| Keene Public Library | — | LibCal-NH | 48 |
| Lebanon Public Libraries | — | LibCal-NH | 48 |
| Manchester City Library | — | LibCal-NH | 48 |
| Merrimack Public Library | — | LibCal-NH | 48 |
| Nashua Public Library | — | LibCal-NH | 48 |
| Pelham Public Library | — | LibCal-NH | 48 |
| BCCLS - Bergen County Cooperative Library System | NJ | LibCal-NJ | 3010 |
| Franklin Lakes Public Library | NJ | LibCal-NJ | 20 |
| Glen Ridge Public Library | NJ | LibCal-NJ | 20 |
| Hunterdon County Library | NJ | LibCal-NJ | 48 |
| Jersey City Free Public Library | NJ | LibCal-NJ | 20 |
| Lambertville Free Public Library | NJ | LibCal-NJ | 20 |
| Mercer County Library System | NJ | LibCal-NJ | 20 |
| Monmouth County Library System | NJ | LibCal-NJ | 20 |
| Montclair Public Library | NJ | LibCal-NJ | 20 |
| Newark Public Library | NJ | LibCal-NJ | 20 |
| Ramsey Free Public Library | NJ | LibCal-NJ | 20 |
| Ridgefield Public Library | NJ | LibCal-NJ | 20 |
| Summit Public Library | NJ | LibCal-NJ | 20 |
| Sussex County Library | NJ | LibCal-NJ | 10 |
| Union County Libraries | NJ | LibCal-NJ | 20 |
| West Orange Public Library | NJ | LibCal-NJ | 20 |
| Barrington Public Library | RI | LibCal-RI | 20 |
| Coventry Public Library | RI | LibCal-RI | 20 |
| Cranston Public Library | RI | LibCal-RI | 20 |
| Cumberland Public Library | RI | LibCal-RI | 25 |
| East Providence Public Library | RI | LibCal-RI | 20 |
| George Hail Free Library | RI | LibCal-RI | 20 |
| Newport Public Library | RI | LibCal-RI | 20 |
| North Kingstown Free Library | RI | LibCal-RI | 0 |
| Pawtucket Public Library | RI | LibCal-RI | 10 |
| Rogers Free Library | RI | LibCal-RI | 20 |
| Warwick Public Library | RI | LibCal-RI | 20 |
| West Warwick Public Library | RI | LibCal-RI | 20 |
| Morgantown Public Library | WV | LibCal-WV | 10 |
| Auburn Public Library | — | LibraryMarket-ME-NH-MA | 24 |
| Paul Pratt Memorial Library | — | LibraryMarket-ME-NH-MA | 24 |
| Portland Public Library | — | LibraryMarket-ME-NH-MA | 23 |
| Springfield City Library | — | LibraryMarket-ME-NH-MA | 30 |
| West Hartford Library | — | LibraryMarket-ME-NH-MA | 34 |
| Buncombe County Libraries | — | LibraryMarket-NC | 2 |
| Hickory Public Library | — | LibraryMarket-NC | 7 |
| Bethlehem Area Public Library | — | LibraryMarket-PA | 24 |
| Lancaster Public Library | — | LibraryMarket-PA | 23 |
| York County Libraries | — | LibraryMarket-PA | 23 |
| Bath County branch: https://www.rrlib.net/bath-county-ics-calendar/ | — | Rockbridge-Regional | 34 |
| Bookmobile branch: https://www.rrlib.net/bookmobile-ics-calendar/ | — | Rockbridge-Regional | 47 |
| Buena Vista branch: https://www.rrlib.net/buena-vista-ics-calendar/ | — | Rockbridge-Regional | 15 |
| Glasgow branch: https://www.rrlib.net/glasgow-ics-calendar/ | — | Rockbridge-Regional | 21 |
| Goshen branch: https://www.rrlib.net/goshen-ics-calendar/ | — | Rockbridge-Regional | 21 |
| Lexington branch: https://www.rrlib.net/lexington-ics-calendar/ | — | Rockbridge-Regional | 76 |
| ABBE Regional Library System | SC | WordPress-Abbe-Regional | 0 |
| Alleghany Highlands Regional Library | VA | WordPress-Events-Calendar | 8 |
| Blackwater Regional Library | VA | WordPress-Events-Calendar | 50 |
| Bristol Public Library | VA | WordPress-Events-Calendar | 0 |
| Carnegie Library of Pittsburgh | PA | WordPress-Events-Calendar | 9 |
| Charlotte County Library | VA | WordPress-Events-Calendar | 50 |
| Galax-Carroll Regional Library | VA | WordPress-Events-Calendar | 50 |
| Halifax County-South Boston Library | VA | WordPress-Events-Calendar | 3 |
| Heritage Public Library | VA | WordPress-Events-Calendar | 0 |
| Osterhout Free Library | PA | WordPress-Events-Calendar | 33 |
| Pittsylvania County Public Library | VA | WordPress-Events-Calendar | 50 |
| Rappahannock County Library | VA | WordPress-Events-Calendar | 50 |
| Washington County Public Library | VA | WordPress-Events-Calendar | 12 |
| Wythe-Grayson Regional Library | VA | WordPress-Events-Calendar | 50 |
| Alma-Bacon County Public Library | GA | WordPress-GA | 11 |
| Appleby Branch | GA | WordPress-GA | 1 |
| Athens Regional Library System | GA | WordPress-GA | 40 |
| Baker County | GA | WordPress-GA | 0 |
| Boston Carnegie Library | GA | WordPress-GA | 20 |
| Bowman Branch | GA | WordPress-GA | 36 |
| Brooks County Public Library System | GA | WordPress-GA | 0 |
| Brunswick Glynn County Regional Library | GA | WordPress-GA | 1 |
| Butler Public Library | GA | WordPress-GA | 0 |
| Byron Public Library | GA | WordPress-GA | 61 |
| Cedartown Library | GA | WordPress-GA | 10 |
| Centerville Branch Library | GA | WordPress-GA | 0 |
| Chattahoochee Valley Regional Library System | GA | WordPress-GA | 0 |
| Chattooga County Library System | GA | WordPress-GA | 0 |
| Cherokee Regional Library System | GA | WordPress-GA | 1 |
| Clarkesville-Habersham Co. Lib. | GA | WordPress-GA | 0 |
| Clarkston Branch | GA | WordPress-GA | 1 |
| Clermont Library | GA | WordPress-GA | 0 |
| Commerce Public Library | GA | WordPress-GA | 0 |
| Coolidge Public Library | GA | WordPress-GA | 1 |
| Cornelia-Habersham Co. Lib. | GA | WordPress-GA | 1 |
| Covington Branch | GA | WordPress-GA | 42 |
| Dalton-Whitfield County Public Library | GA | WordPress-GA | 0 |
| Douglas-Coffee County Public Library | GA | WordPress-GA | 0 |
| Duluth | GA | WordPress-GA | 0 |
| Effingham | GA | WordPress-GA | 0 |
| Elizabeth Harris Library | GA | WordPress-GA | 0 |
| Gibbs Memorial Library | GA | WordPress-GA | 0 |
| Gordon Public Library | GA | WordPress-GA | 0 |
| Grantville Public Library | GA | WordPress-GA | 5 |
| Greene County Library | GA | WordPress-GA | 0 |
| Greenville Area Public Library | GA | WordPress-GA | 0 |
| Hancock County Library | GA | WordPress-GA | 0 |
| Harlie Fulford Memorial Library | GA | WordPress-GA | 1 |
| Heard County Public Library | GA | WordPress-GA | 0 |
| Hickory Flat Public Library | GA | WordPress-GA | 0 |
| Hightower Memorial Library | GA | WordPress-GA | 0 |
| Houston County Public Libraries System | GA | WordPress-GA | 0 |
| Ida Hilton Public Library | GA | WordPress-GA | 0 |
| Jefferson County Library System | GA | WordPress-GA | 1 |
| Lagrange Memorial Library | GA | WordPress-GA | 0 |
| Lake Sinclair Library | GA | WordPress-GA | 0 |
| Laurens County Library | GA | WordPress-GA | 0 |
| Lewis A. Ray Library | GA | WordPress-GA | 0 |
| Marion County Library | GA | WordPress-GA | 0 |
| Meigs Public Library | GA | WordPress-GA | 4 |
| Middle Georgia Regional Library System | GA | WordPress-GA | 0 |
| Miller Lakeland Library | GA | WordPress-GA | 1 |
| Monroe County Library | GA | WordPress-GA | 0 |
| Monroe-Walton County Library | GA | WordPress-GA | 0 |
| Morgan County Library | GA | WordPress-GA | 0 |
| Nelle Brown Memorial Public Library | GA | WordPress-GA | 0 |
| New Georgia Public Library | GA | WordPress-GA | 10 |
| Oglethorpe County Library | GA | WordPress-GA | 0 |
| Parks Memorial Library | GA | WordPress-GA | 0 |
| Riverdale Branch Library | GA | WordPress-GA | 0 |
| Rockmart Library | GA | WordPress-GA | 0 |
| Rossville Public Library | GA | WordPress-GA | 0 |
| Scottdale-Tobie Grant Branch | GA | WordPress-GA | 0 |
| Senoia Area Public Library | GA | WordPress-GA | 5 |
| Thomson-Mcduffie County Library | GA | WordPress-GA | 0 |
| Warren P. Sewell Memorial Library-Bremen | GA | WordPress-GA | 14 |
| Wayne County Library | GA | WordPress-GA | 1 |
| Wheeler County Library | GA | WordPress-GA | 0 |
| White County Public Library-Cleveland Branch | GA | WordPress-GA | 0 |
| Wilcox County Public Library | GA | WordPress-GA | 1 |
| Adair County Public Library | KY | WordPress-KY | 0 |
| Allen County Public Library | — | WordPress-KY | 1 |
| Auburn Branch | — | WordPress-KY | 0 |
| Boone County Public Library | — | WordPress-KY | 11 |
| Bullitt County Public Library | — | WordPress-KY | 0 |
| Calloway County Public Library | — | WordPress-KY | 0 |
| Campbell County Public Library | — | WordPress-KY | 13 |
| Casey County Public Library | — | WordPress-KY | 12 |
| Christian County Public Library | — | WordPress-KY | 1 |
| Clark County Public Library | — | WordPress-KY | 0 |
| Crittenden County Public Library | KY | WordPress-KY | 0 |
| Cynthiana-Harrison County Public Library | — | WordPress-KY | 0 |
| Daviess County Public Library | — | WordPress-KY | 12 |
| Estill County Public Library | — | WordPress-KY | 0 |
| Florence Branch | KY | WordPress-KY | 0 |
| Floyd County Public Library | — | WordPress-KY | 1 |
| Fulton Public Library | — | WordPress-KY | 0 |
| Gallatin County Public Library | KY | WordPress-KY | 0 |
| Goodnight Memorial Library | KY | WordPress-KY | 0 |
| Grant County Public Library | KY | WordPress-KY | 0 |
| Graves County Public Library | — | WordPress-KY | 41 |
| Greenup County Public Library | — | WordPress-KY | 0 |
| Hardin County Public Library | — | WordPress-KY | 0 |
| Harlan County Public Library | — | WordPress-KY | 0 |
| Henderson County Public Library | — | WordPress-KY | 69 |
| Hickman County Memorial Library | KY | WordPress-KY | 0 |
| Irvington Branch | — | WordPress-KY | 0 |
| Laurel County Public Library | KY | WordPress-KY | 0 |
| Lents Branch | KY | WordPress-KY | 0 |
| Lexington Public Library | — | WordPress-KY | 93 |
| Louisville Free Public Library | — | WordPress-KY | 23 |
| Madison County Public Library | — | WordPress-KY | 0 |
| Mahan-Oldham County Library | KY | WordPress-KY | 0 |
| Marion County Public Library | KY | WordPress-KY | 0 |
| Mary Wood Weldon Memorial Public Library | — | WordPress-KY | 72 |
| Mason County Public Library | — | WordPress-KY | 13 |
| McCracken County Public Library | — | WordPress-KY | 76 |
| Montgomery County Public Library | — | WordPress-KY | 2 |
| Nicholas County Public Library | KY | WordPress-KY | 0 |
| Ohio County Public Library | KY | WordPress-KY | 0 |
| Oldham County Public Library | — | WordPress-KY | 23 |
| Perry County Public Library | — | WordPress-KY | 3 |
| Pike County Public Library | — | WordPress-KY | 0 |
| Rebecca Caudill Public Library | — | WordPress-KY | 1 |
| Rowan County Public Library | — | WordPress-KY | 88 |
| Scott County Public Library | — | WordPress-KY | 1 |
| South Branch | — | WordPress-KY | 10 |
| Trimble County Public Library | KY | WordPress-KY | 0 |
| Warren County Public Library | — | WordPress-KY | 10 |
| Washington County Public Library | KY | WordPress-KY | 0 |
| Wayne County Public Library | KY | WordPress-KY | 0 |
| Whitley County Public Library | — | WordPress-KY | 0 |
| Woodford County Library | — | WordPress-KY | 0 |
| Acton Memorial Library | MA | WordPress-MA | 0 |
| Agawam Public Library | MA | WordPress-MA | 5 |
| Aldenville Branch Library | MA | WordPress-MA | 2 |
| Amesbury Public Library | MA | WordPress-MA | 0 |
| Andrews Branch Library | MA | WordPress-MA | 0 |
| Aquinnah Public Library | MA | WordPress-MA | 3 |
| Athol Public Library | MA | WordPress-MA | 0 |
| Attleboro Public Library | MA | WordPress-MA | 1 |
| Auburn Free Public Library | MA | WordPress-MA | 1 |
| Auburndale Branch Library | MA | WordPress-MA | 6 |
| Ayer Public Library | MA | WordPress-MA | 1 |
| Beals Memorial Library | MA | WordPress-MA | 0 |
| Bedford Free Public Library | MA | WordPress-MA | 0 |
| Bellingham Public Library | MA | WordPress-MA | 0 |
| Belmont Public Library | MA | WordPress-MA | 0 |
| Berkley Public Library | MA | WordPress-MA | 0 |
| Berkshire Athenaeum | MA | WordPress-MA | 5 |
| Bigelow Free Public Library | MA | WordPress-MA | 0 |
| Billerica Public Library | MA | WordPress-MA | 0 |
| Blackstone Free Public Library | MA | WordPress-MA | 0 |
| Blanding Public Library | MA | WordPress-MA | 0 |
| Boxford Town Library | MA | WordPress-MA | 0 |
| Boylston Public Library | MA | WordPress-MA | 0 |
| Boynton Public Library | MA | WordPress-MA | 0 |
| Brewster Ladies Library Assoc. | MA | WordPress-MA | 0 |
| Brighton Branch Library | MA | WordPress-MA | 0 |
| Brightwood Branch Library | MA | WordPress-MA | 1 |
| Brimfield Public Library | MA | WordPress-MA | 2 |
| Brookline Public Library | MA | WordPress-MA | 0 |
| Bushnell-Sage Library | MA | WordPress-MA | 0 |
| Cambridge Public Library | MA | WordPress-MA | 11 |
| Carver Public Library | MA | WordPress-MA | 0 |
| Cary Memorial Library | MA | WordPress-MA | 0 |
| Casa Da Saudade | MA | WordPress-MA | 0 |
| Centerville Public Library | MA | WordPress-MA | 55 |
| Chelmsford Public Library | MA | WordPress-MA | 0 |
| Chelsea Public Library | MA | WordPress-MA | 0 |
| Chester C. Corbin Public Library | MA | WordPress-MA | 0 |
| Chesterfield Public Library | MA | WordPress-MA | 1 |
| Chilmark Free Public Library | MA | WordPress-MA | 2 |
| Clarksburg Town Library | MA | WordPress-MA | 0 |
| Conant Free Public Library | MA | WordPress-MA | 0 |
| Concord Free Public Library | MA | WordPress-MA | 1 |
| Cotuit Library | MA | WordPress-MA | 1 |
| Dalton Free Public Library | MA | WordPress-MA | 28 |
| David Joyce Milne Public Library | MA | WordPress-MA | 0 |
| Dighton Public Library | MA | WordPress-MA | 0 |
| Dover Town Library | MA | WordPress-MA | 0 |
| Dudley Branch Library | MA | WordPress-MA | 0 |
| East Bridgewater Public Library | MA | WordPress-MA | 0 |
| East End Branch Library | MA | WordPress-MA | 1 |
| East Milton Branch Library | MA | WordPress-MA | 0 |
| Eastham Public Library | MA | WordPress-MA | 3 |
| Edgartown Free Public Library | MA | WordPress-MA | 0 |
| Edith M. Fox Library | MA | WordPress-MA | 0 |
| Edwards Public Library | MA | WordPress-MA | 4 |
| Eldredge Public Library | MA | WordPress-MA | 1 |
| Elizabeth Taber Memorial Library | MA | WordPress-MA | 0 |
| Emily Williston Memorial Library | MA | WordPress-MA | 0 |
| Fitchburg Public Library | MA | WordPress-MA | 1 |
| Five Corners Library | MA | WordPress-MA | 0 |
| Flint Public Library | MA | WordPress-MA | 0 |
| Forbush Memorial Library | MA | WordPress-MA | 0 |
| Framingham Public Library | MA | WordPress-MA | 65 |
| Frances Perkins Branch Library At Greendale | MA | WordPress-MA | 0 |
| Franklin Public Library | MA | WordPress-MA | 0 |
| G. A. R. Memorial Library | MA | WordPress-MA | 0 |
| Gleason Public Library | MA | WordPress-MA | 0 |
| Gloucester Lyceum Sawyer Free Lib | MA | WordPress-MA | 0 |
| Goshen Free Public Library | MA | WordPress-MA | 0 |
| Grace Hall Memorial Library | MA | WordPress-MA | 0 |
| Grafton Public Library | MA | WordPress-MA | 0 |
| Granby Free Public Library | MA | WordPress-MA | 1 |
| Granville Public Library | MA | WordPress-MA | 0 |
| Hamilton Memorial Library | MA | WordPress-MA | 0 |
| Hanson Public Library | MA | WordPress-MA | 0 |
| Harvard Public Library | MA | WordPress-MA | 15 |
| Harwich Port Library Assoc. | MA | WordPress-MA | 1 |
| Haston Free Public Library | MA | WordPress-MA | 0 |
| Haverhill Public Library | MA | WordPress-MA | 0 |
| Hazen Memorial Library | MA | WordPress-MA | 1 |
| Heath Free Public Library | MA | WordPress-MA | 0 |
| Hingham Public Library | MA | WordPress-MA | 1 |
| Holbrook Public Library | MA | WordPress-MA | 0 |
| Holland Public Library | MA | WordPress-MA | 0 |
| Holliston Public Library | MA | WordPress-MA | 0 |
| Holyoke Public Library | MA | WordPress-MA | 89 |
| Hopkinton Public Library | MA | WordPress-MA | 0 |
| Hubbardston Public Library | MA | WordPress-MA | 7 |
| Hudson Public Library | MA | WordPress-MA | 0 |
| Huntington Public Library | MA | WordPress-MA | 0 |
| Hyannis Public Library Assoc. | MA | WordPress-MA | 91 |
| Hyde Park Branch Library | MA | WordPress-MA | 0 |
| Ipswich Public Library | MA | WordPress-MA | 0 |
| Islington Branch Library | MA | WordPress-MA | 0 |
| J. V. Fletcher Library | MA | WordPress-MA | 1 |
| Jonathan Bourne Public Library | MA | WordPress-MA | 0 |
| Jones Library, Inc. | MA | WordPress-MA | 6 |
| Joseph H. Plumb Memorial Library | MA | WordPress-MA | 0 |
| Joshua Hyde Public Library | MA | WordPress-MA | 58 |
| Kingston Public Library | MA | WordPress-MA | 0 |
| Lakeville Free Public Library | MA | WordPress-MA | 0 |
| Lawrence Public Library | MA | WordPress-MA | 4 |
| Leicester Public Library | MA | WordPress-MA | 0 |
| Lenox Library Association | MA | WordPress-MA | 0 |
| Leominster Public Library | MA | WordPress-MA | 0 |
| Leverett Library | MA | WordPress-MA | 0 |
| Levi Heywood Memorial Library | MA | WordPress-MA | 7 |
| Lilly Library | MA | WordPress-MA | 0 |
| Lucius Beebe Memorial Library | MA | WordPress-MA | 3 |
| Lunenburg Public Library | MA | WordPress-MA | 0 |
| Lynnfield Public Library | MA | WordPress-MA | 0 |
| Mashpee Public Library | MA | WordPress-MA | 19 |
| Mattapoisett Public Library | MA | WordPress-MA | 16 |
| Medfield Memorial Library | MA | WordPress-MA | 0 |
| Medford Public Library | MA | WordPress-MA | 0 |
| Memorial Hall Library | MA | WordPress-MA | 0 |
| Merriam-Gilbert Public Library | MA | WordPress-MA | 0 |
| Merrimac Public Library | MA | WordPress-MA | 1 |
| Middlefield Public Library | MA | WordPress-MA | 0 |
| Millbury Public Library | MA | WordPress-MA | 0 |
| Millicent Library | MA | WordPress-MA | 0 |
| Millis Public Library | MA | WordPress-MA | 1 |
| Millville Free Public Library | MA | WordPress-MA | 1 |
| Monterey Public Library | MA | WordPress-MA | 0 |
| Morrill Memorial Library | MA | WordPress-MA | 1 |
| Moses Greeley Parker Memorial Lib. | MA | WordPress-MA | 0 |
| Nahant Public Library | MA | WordPress-MA | 38 |
| Nantucket Atheneum | MA | WordPress-MA | 0 |
| Needham Free Public Library | MA | WordPress-MA | 0 |
| Newton Free Library | MA | WordPress-MA | 0 |
| North Adams Public Library | MA | WordPress-MA | 0 |
| Northborough Free Library | MA | WordPress-MA | 0 |
| Norton Public Library | MA | WordPress-MA | 41 |
| Oak Bluffs Public Library | MA | WordPress-MA | 0 |
| Oxford Free Public Library | MA | WordPress-MA | 0 |
| Palmer Public Library | MA | WordPress-MA | 0 |
| Paul Pratt Memorial Library | MA | WordPress-MA | 0 |
| Peabody Institute Library | MA | WordPress-MA | 1 |
| Peru Library | MA | WordPress-MA | 0 |
| Petersham Memorial Library | MA | WordPress-MA | 0 |
| Phinehas S. Newton Library | MA | WordPress-MA | 0 |
| Plainville Public Library | MA | WordPress-MA | 0 |
| Plympton Public Library | MA | WordPress-MA | 29 |
| Pollard Memorial Library | MA | WordPress-MA | 0 |
| Provincetown Public Library | MA | WordPress-MA | 41 |
| Reading Public Library | MA | WordPress-MA | 0 |
| Reuben Hoar Library | MA | WordPress-MA | 0 |
| Revere Public Library | MA | WordPress-MA | 1 |
| Richard Salter Storrs Library | MA | WordPress-MA | 0 |
| Richards Memorial Library | MA | WordPress-MA | 1 |
| Rockport Public Library | MA | WordPress-MA | 1 |
| Rowley Public Library | MA | WordPress-MA | 23 |
| Russell Public Library | MA | WordPress-MA | 0 |
| Rutland Free Public Library | MA | WordPress-MA | 0 |
| Salem Public Library | MA | WordPress-MA | 0 |
| Salisbury Public Library | MA | WordPress-MA | 0 |
| Sandisfield Public Library | MA | WordPress-MA | 13 |
| Scituate Town Library | MA | WordPress-MA | 23 |
| Seekonk Public Library | MA | WordPress-MA | 0 |
| Shaw Memorial Library | MA | WordPress-MA | 1 |
| Sherborn Library | MA | WordPress-MA | 0 |
| Shrewsbury Free Public Library | MA | WordPress-MA | 0 |
| Simon Fairfield Public Library | MA | WordPress-MA | 4 |
| Somerset Public Library | MA | WordPress-MA | 0 |
| South Dennis Free Public Library | MA | WordPress-MA | 0 |
| Stevens Memorial Library | MA | WordPress-MA | 0 |
| Stockbridge Library Association | MA | WordPress-MA | 12 |
| Stoneham Public Library | MA | WordPress-MA | 4 |
| Stoughton Public Library | MA | WordPress-MA | 1 |
| Swampscott Public Library | MA | WordPress-MA | 1 |
| Swansea Free Public Library | MA | WordPress-MA | 0 |
| T.O.H.P. Burnham Free Library | MA | WordPress-MA | 0 |
| Taft Public Library | MA | WordPress-MA | 20 |
| Taunton Public Library | MA | WordPress-MA | 0 |
| Taylor Memorial Library | MA | WordPress-MA | 0 |
| Tewksbury Public Library | MA | WordPress-MA | 1 |
| Topsfield Town Library | MA | WordPress-MA | 0 |
| Townsend Public Library | MA | WordPress-MA | 0 |
| Tyler Memorial Library | MA | WordPress-MA | 0 |
| Uxbridge Free Public Library | MA | WordPress-MA | 0 |
| Ventress Memorial Library | MA | WordPress-MA | 0 |
| Waban Branch Library | MA | WordPress-MA | 4 |
| Walpole Public Library | MA | WordPress-MA | 30 |
| Warren Public Library | MA | WordPress-MA | 0 |
| Wayland Free Public Library | MA | WordPress-MA | 0 |
| Wellfleet Public Library | MA | WordPress-MA | 31 |
| West Dennis Free Public Library | MA | WordPress-MA | 0 |
| West Falmouth Library, Inc. | MA | WordPress-MA | 12 |
| Westborough Public Library | MA | WordPress-MA | 2 |
| Westfield Athenaeum | MA | WordPress-MA | 27 |
| Westhampton Memorial Library | MA | WordPress-MA | 0 |
| Weston Public Library | MA | WordPress-MA | 2 |
| Westport Free Public Library | MA | WordPress-MA | 0 |
| Whitinsville Social Library | MA | WordPress-MA | 0 |
| Wilbraham Public Library | MA | WordPress-MA | 0 |
| Wilmington Memorial Library | MA | WordPress-MA | 7 |
| Winchester Public Library | MA | WordPress-MA | 0 |
| Windsor Free Public Library | MA | WordPress-MA | 0 |
| Woods Memorial Library | MA | WordPress-MA | 1 |
| Young Mens Library Association | MA | WordPress-MA | 0 |
| Cecil County Public Library | — | WordPress-MD | 33 |
| Dorchester County Public Library | — | WordPress-MD | 1 |
| Kent County Public Library | — | WordPress-MD | 14 |
| Ruth Enlow Library of Garrett County | — | WordPress-MD | 2 |
| Talbot County Free Library | — | WordPress-MD | 47 |
| Wicomico Public Libraries | — | WordPress-MD | 27 |
| Worcester County Library | — | WordPress-MD | 35 |
| Amherst Town Library | NH | WordPress-NH | 1 |
| Andover Public Library | NH | WordPress-NH | 0 |
| Barrington Public Library | NH | WordPress-NH | 2 |
| Bartlett Public Library | NH | WordPress-NH | 95 |
| Bath Public Library | NH | WordPress-NH | 0 |
| Bedford Public Library | NH | WordPress-NH | 2 |
| Belmont Public Library | NH | WordPress-NH | 0 |
| Bethlehem Public Library | NH | WordPress-NH | 0 |
| Blaisdell Memorial Library | NH | WordPress-NH | 1 |
| Bremer Pond Memorial Library | NH | WordPress-NH | 2 |
| Brown Memorial Library | NH | WordPress-NH | 0 |
| Byron G. Merrill Library | NH | WordPress-NH | 0 |
| Canaan Town Library | NH | WordPress-NH | 12 |
| Chamberlin Free Public Library | NH | WordPress-NH | 0 |
| Chester Public Library | NH | WordPress-NH | 0 |
| Chesterfield Public Library | NH | WordPress-NH | 1 |
| Chocorua Public Library | NH | WordPress-NH | 2 |
| Conant Public Library | NH | WordPress-NH | 0 |
| Concord Public Library | NH | WordPress-NH | 0 |
| Cook Memorial Library | NH | WordPress-NH | 10 |
| Dalton Public Library | NH | WordPress-NH | 0 |
| Derry Public Library | NH | WordPress-NH | 0 |
| Dover Public Library | NH | WordPress-NH | 0 |
| Dublin Public Library | NH | WordPress-NH | 0 |
| Dunbarton Public Library | NH | WordPress-NH | 0 |
| East Kingston Public Library | NH | WordPress-NH | 0 |
| East Rochester Public Library | NH | WordPress-NH | 0 |
| Effingham Free Public Library | NH | WordPress-NH | 0 |
| Elkins Library | NH | WordPress-NH | 0 |
| Exeter Public Library | NH | WordPress-NH | 0 |
| Fiske Free Library | NH | WordPress-NH | 0 |
| Franklin Public Library | NH | WordPress-NH | 0 |
| Fremont Public Library | NH | WordPress-NH | 0 |
| G. E.P. Dodge Library | NH | WordPress-NH | 35 |
| Gale Library | NH | WordPress-NH | 0 |
| George Gamble Library | NH | WordPress-NH | 1 |
| George Holmes Bixby Memorial Library | NH | WordPress-NH | 0 |
| Gilford Public Library | NH | WordPress-NH | 1 |
| Goffstown Public Library | NH | WordPress-NH | 0 |
| Goodwin Library | NH | WordPress-NH | 0 |
| Gorham Public Library | NH | WordPress-NH | 1 |
| Griffin Free Public Library | NH | WordPress-NH | 26 |
| Hampstead Public Library | NH | WordPress-NH | 0 |
| Hampton Falls Free Library | NH | WordPress-NH | 42 |
| Hampton Lane Memorial Library | NH | WordPress-NH | 0 |
| Hancock Town Library | NH | WordPress-NH | 1 |
| Harvey-Mitchell Memorial Library | NH | WordPress-NH | 1 |
| Haverhill Library Association | NH | WordPress-NH | 0 |
| Hebron Public Library | NH | WordPress-NH | 0 |
| Hill Public Library | NH | WordPress-NH | 8 |
| Holderness Library | NH | WordPress-NH | 0 |
| Hollis Social Library | NH | WordPress-NH | 0 |
| Hooksett Public Library | NH | WordPress-NH | 1 |
| Hudson Rodgers Memorial Library | NH | WordPress-NH | 1 |
| James E. Nichols Memorial Library | NH | WordPress-NH | 4 |
| Joseph Patch Library | NH | WordPress-NH | 0 |
| Josiah Carpenter Library | NH | WordPress-NH | 0 |
| Laconia Public Library | NH | WordPress-NH | 0 |
| Laura Johnson Memorial Library | NH | WordPress-NH | 0 |
| Lebanon Public Libraries | NH | WordPress-NH | 3 |
| Libbie A. Cass Memorial Library | NH | WordPress-NH | 0 |
| Littleton Public Library | NH | WordPress-NH | 0 |
| Londonderry Leach Library | NH | WordPress-NH | 0 |
| Madbury Public Library | NH | WordPress-NH | 1 |
| Madison Library | NH | WordPress-NH | 0 |
| Manchester City Library | NH | WordPress-NH | 1 |
| Mansfield Public Library | NH | WordPress-NH | 0 |
| Mary E. Bartlett Library | NH | WordPress-NH | 0 |
| Mason Public Library | NH | WordPress-NH | 0 |
| Meredith Public Library | NH | WordPress-NH | 2 |
| Merrimack Public Library | NH | WordPress-NH | 0 |
| Milan Public Library | NH | WordPress-NH | 0 |
| Milford Wadleigh Memorial Library | NH | WordPress-NH | 1 |
| Monroe Public Library | NH | WordPress-NH | 0 |
| Moultonborough Public Library | NH | WordPress-NH | 1 |
| Nashua Public Library | NH | WordPress-NH | 0 |
| New Durham Public Library | NH | WordPress-NH | 15 |
| New Ipswich Library | NH | WordPress-NH | 0 |
| Newbury Public Library | NH | WordPress-NH | 0 |
| Newfields Public Library | NH | WordPress-NH | 10 |
| Newmarket Public Library | NH | WordPress-NH | 0 |
| Nichols Memorial Library | NH | WordPress-NH | 0 |
| Olive G. Pettis Library | NH | WordPress-NH | 0 |
| Olivia Rodham Memorial Library | NH | WordPress-NH | 26 |
| Pembroke Town Library | NH | WordPress-NH | 98 |
| Philbrick-James Library | NH | WordPress-NH | 1 |
| Philip Read Memorial Library | NH | WordPress-NH | 0 |
| Pike Library | NH | WordPress-NH | 0 |
| Pillsbury Free Library | NH | WordPress-NH | 8 |
| Rollinsford Public Library | NH | WordPress-NH | 23 |
| Rye Public Library | NH | WordPress-NH | 0 |
| Salem Kelley Library | NH | WordPress-NH | 0 |
| Salisbury Free Library | NH | WordPress-NH | 0 |
| Stark Public Library | NH | WordPress-NH | 0 |
| Sullivan Public Library | NH | WordPress-NH | 0 |
| Tracy Memorial Library | NH | WordPress-NH | 0 |
| Wakefield Public Library | NH | WordPress-NH | 0 |
| Walpole Town Library | NH | WordPress-NH | 0 |
| Webster Free Public Library | NH | WordPress-NH | 0 |
| Westmoreland Public Library | NH | WordPress-NH | 0 |
| Whitefield Public Library | NH | WordPress-NH | 8 |
| Wilmot Public Library | NH | WordPress-NH | 5 |
| Wilton Public Gregg Free Library | NH | WordPress-NH | 0 |
| Windham Nesmith Library | NH | WordPress-NH | 1 |
| Wolfeboro Public Library | NH | WordPress-NH | 1 |
| Anthony Pio Costa Memorial Library | NJ | WordPress-NJ | 14 |
| Asbury Park Free Public Library | NJ | WordPress-NJ | 0 |
| Atlantic City Free Public Library | NJ | WordPress-NJ | 0 |
| Audubon Free Public Library | NJ | WordPress-NJ | 20 |
| Bayonne Free Public Library | NJ | WordPress-NJ | 1 |
| Beach Haven Free Public Library | NJ | WordPress-NJ | 57 |
| Belmar Public Library | NJ | WordPress-NJ | 150 |
| Bergenfield Free Public Library | NJ | WordPress-NJ | 0 |
| Bernardsville Public Library | NJ | WordPress-NJ | 1 |
| Bloomingdale Free Public Library | NJ | WordPress-NJ | 0 |
| Boonton Holmes Public Library | NJ | WordPress-NJ | 0 |
| Bradley Beach Public Library | NJ | WordPress-NJ | 0 |
| Bridgeton Free Public Library | NJ | WordPress-NJ | 0 |
| Butler Public Library | NJ | WordPress-NJ | 0 |
| Camden Free Public Library | NJ | WordPress-NJ | 0 |
| Carteret Free Public Library | NJ | WordPress-NJ | 0 |
| Cedar Grove Free Public Library | NJ | WordPress-NJ | 0 |
| Chathams Joint Free Public Library | NJ | WordPress-NJ | 199 |
| Chester Library | NJ | WordPress-NJ | 0 |
| Clark Public Library | NJ | WordPress-NJ | 0 |
| Cliffside Park Free Public Library | NJ | WordPress-NJ | 150 |
| Cranford Public Library | NJ | WordPress-NJ | 29 |
| Cresskill Public Library | NJ | WordPress-NJ | 0 |
| Crosswicks Library Company | NJ | WordPress-NJ | 1 |
| Delanco Public Library | NJ | WordPress-NJ | 0 |
| Demarest Public Library Association | NJ | WordPress-NJ | 0 |
| Denville Free Public Library | NJ | WordPress-NJ | 38 |
| Dixon Homestead Library | NJ | WordPress-NJ | 1 |
| Dover Free Public Library | NJ | WordPress-NJ | 3 |
| Dowdell Library Of South Amboy | NJ | WordPress-NJ | 0 |
| Dunellen Free Public Library | NJ | WordPress-NJ | 5 |
| Dwight D. Eisenhower Library | NJ | WordPress-NJ | 0 |
| Edgewater Free Public Library | NJ | WordPress-NJ | 0 |
| Elmwood Park Free Public Library | NJ | WordPress-NJ | 0 |
| Emerson Public Library | NJ | WordPress-NJ | 2 |
| Englewood Free Public Library | NJ | WordPress-NJ | 0 |
| Fair Haven Public Library | NJ | WordPress-NJ | 0 |
| Fanwood Memorial Library | NJ | WordPress-NJ | 10 |
| Flemington Free Public Library | NJ | WordPress-NJ | 1 |
| Fort Lee Free Public Library | NJ | WordPress-NJ | 106 |
| Franklin Lakes Free Public Library | NJ | WordPress-NJ | 0 |
| Franklin Twp Public Library-Gloucester | NJ | WordPress-NJ | 44 |
| Franklin Twp Public Library-Somerset | NJ | WordPress-NJ | 4 |
| Glen Ridge Free Public Library | NJ | WordPress-NJ | 0 |
| Glen Rock Public Library | NJ | WordPress-NJ | 1 |
| Gloucester City Library | NJ | WordPress-NJ | 123 |
| Hackettstown Free Public Library | NJ | WordPress-NJ | 150 |
| Haddonfield Public Library | NJ | WordPress-NJ | 0 |
| Hamilton Township Free Public Library | NJ | WordPress-NJ | 0 |
| Hasbrouck Heights Free Public Library | NJ | WordPress-NJ | 1 |
| Haworth Municipal Library | NJ | WordPress-NJ | 0 |
| Hillside Free Public Library | NJ | WordPress-NJ | 89 |
| Hoboken Public Library | NJ | WordPress-NJ | 62 |
| Irvington Public Library | NJ | WordPress-NJ | 1 |
| Jamesburg Public Library | NJ | WordPress-NJ | 6 |
| Kearny Public Library | NJ | WordPress-NJ | 83 |
| Kenilworth Public Library | NJ | WordPress-NJ | 8 |
| Keyport Free Public Library | NJ | WordPress-NJ | 0 |
| Kinnelon Public Library | NJ | WordPress-NJ | 1 |
| Lambertville Free Public Library | NJ | WordPress-NJ | 0 |
| Leonia Public Library | NJ | WordPress-NJ | 1 |
| Lincoln Park Public Library | NJ | WordPress-NJ | 0 |
| Linwood Public Library | NJ | WordPress-NJ | 0 |
| Little Falls Public Library | NJ | WordPress-NJ | 50 |
| Little Silver Public Library | NJ | WordPress-NJ | 0 |
| Lyndhurst Free Public Library | NJ | WordPress-NJ | 11 |
| Madison Public Library | NJ | WordPress-NJ | 0 |
| Maplewood Memorial Library | NJ | WordPress-NJ | 1 |
| Margate City Public Library | NJ | WordPress-NJ | 10 |
| Maurice M. Pine Free Public Library | NJ | WordPress-NJ | 0 |
| Maywood Public Library | NJ | WordPress-NJ | 0 |
| Metuchen Public Library | NJ | WordPress-NJ | 76 |
| Middletown Township Public Library | NJ | WordPress-NJ | 0 |
| Midland Park Memorial Library | NJ | WordPress-NJ | 11 |
| Millburn Free Public Library | NJ | WordPress-NJ | 1 |
| Milltown Public Library | NJ | WordPress-NJ | 0 |
| Millville Public Library | NJ | WordPress-NJ | 0 |
| Monmouth Beach Public Library | NJ | WordPress-NJ | 0 |
| Monroe Twp Public Library-Gloucester | NJ | WordPress-NJ | 0 |
| Monroe Twp Public Library-Middlesex | NJ | WordPress-NJ | 1 |
| Montclair Public Library | NJ | WordPress-NJ | 0 |
| Montville Township Public Library | NJ | WordPress-NJ | 13 |
| Moorestown Library | NJ | WordPress-NJ | 40 |
| Morris Plains Library | NJ | WordPress-NJ | 4 |
| Morristown-Morris Twp Joint Public Library | NJ | WordPress-NJ | 0 |
| Mount Arlington Public Library | NJ | WordPress-NJ | 0 |
| Mount Laurel Library | NJ | WordPress-NJ | 168 |
| Mountain Lakes Free Public Library | NJ | WordPress-NJ | 4 |
| Mountainside Free Public Library | NJ | WordPress-NJ | 23 |
| New Milford Public Library | NJ | WordPress-NJ | 0 |
| New Providence Memorial Library | NJ | WordPress-NJ | 0 |
| North Arlington Public Library | NJ | WordPress-NJ | 21 |
| North Brunswick Free Public Library | NJ | WordPress-NJ | 14 |
| North Haledon Free Public Library | NJ | WordPress-NJ | 7 |
| Norwood Public Library | NJ | WordPress-NJ | 0 |
| Oakland Public Library | NJ | WordPress-NJ | 0 |
| Ocean City Free Public Library | NJ | WordPress-NJ | 4 |
| Old Bridge Public Library | NJ | WordPress-NJ | 0 |
| Old Tappan Free Public Library | NJ | WordPress-NJ | 0 |
| Palisades Park Free Public Library | NJ | WordPress-NJ | 1 |
| Paramus Public Library | NJ | WordPress-NJ | 1 |
| Park Ridge Free Public Library | NJ | WordPress-NJ | 5 |
| Parsippany-Troy Hills Public Library | NJ | WordPress-NJ | 0 |
| Passaic Public Library | NJ | WordPress-NJ | 0 |
| Pennington Free Public Library | NJ | WordPress-NJ | 46 |
| Pennsauken Free Public Library | NJ | WordPress-NJ | 1 |
| Pennsville Public Library | NJ | WordPress-NJ | 0 |
| Piscataway Public Library | NJ | WordPress-NJ | 121 |
| Plainfield Free Public Library | NJ | WordPress-NJ | 101 |
| Plainsboro Free Public Library | NJ | WordPress-NJ | 0 |
| Pompton Lakes Borough Free Public Library | NJ | WordPress-NJ | 6 |
| Princeton Public Library | NJ | WordPress-NJ | 0 |
| Rahway Public Library | NJ | WordPress-NJ | 11 |
| Ramsey Free Public Library | NJ | WordPress-NJ | 0 |
| Red Bank Public Library | NJ | WordPress-NJ | 37 |
| Ridgefield Free Public Library | NJ | WordPress-NJ | 0 |
| Ridgewood Public Library | NJ | WordPress-NJ | 0 |
| Ringwood Public Library | NJ | WordPress-NJ | 150 |
| River Vale Public Library | NJ | WordPress-NJ | 0 |
| Riverdale Public Library | NJ | WordPress-NJ | 1 |
| Riverside Public Library | NJ | WordPress-NJ | 0 |
| Roseland Free Public Library | NJ | WordPress-NJ | 0 |
| Roselle Free Public Library | NJ | WordPress-NJ | 56 |
| Roselle Park Veterans Memorial Library | NJ | WordPress-NJ | 1 |
| Runnemede Public Library | NJ | WordPress-NJ | 9 |
| Ruth L. Rockwood Memorial Library | NJ | WordPress-NJ | 1 |
| Rutherford Free Public Library | NJ | WordPress-NJ | 1 |
| Saddle Brook Free Public Library | NJ | WordPress-NJ | 15 |
| Salem Free Public Library | NJ | WordPress-NJ | 0 |
| Sally Stretch Keen Memorial Library | NJ | WordPress-NJ | 0 |
| Scotch Plains Public Library | NJ | WordPress-NJ | 2 |
| Secaucus Free Public Library | NJ | WordPress-NJ | 0 |
| South River Public Library | NJ | WordPress-NJ | 0 |
| Sparta Public Library | NJ | WordPress-NJ | 0 |
| Spring Lake Public Library | NJ | WordPress-NJ | 0 |
| Springfield Free Public Library | NJ | WordPress-NJ | 0 |
| Stratford Public Library | NJ | WordPress-NJ | 0 |
| Summit Free Public Library | NJ | WordPress-NJ | 0 |
| Sussex County Library | NJ | WordPress-NJ | 0 |
| Teaneck Public Library | NJ | WordPress-NJ | 1 |
| Tenafly Free Public Library | NJ | WordPress-NJ | 0 |
| Union Free Public Library | NJ | WordPress-NJ | 0 |
| Verona Free Public Library | NJ | WordPress-NJ | 150 |
| Vineland Public Library | NJ | WordPress-NJ | 0 |
| Waldwick Public Library | NJ | WordPress-NJ | 0 |
| Wanaque Borough Free Public Library | NJ | WordPress-NJ | 150 |
| West Orange Free Public Library | NJ | WordPress-NJ | 0 |
| Westfield Memorial Library | NJ | WordPress-NJ | 5 |
| Westwood Free Public Library | NJ | WordPress-NJ | 0 |
| Wharton Public Library | NJ | WordPress-NJ | 0 |
| William E. Dermody Free Public Library | NJ | WordPress-NJ | 22 |
| Wood-Ridge Memorial Library | NJ | WordPress-NJ | 33 |
| Woodbridge Public Library | NJ | WordPress-NJ | 13 |
| Woodbury Public Library | NJ | WordPress-NJ | 39 |
| Woodstown-Pilesgrove Library | NJ | WordPress-NJ | 0 |
| Worth Pinkham Memorial Library | NJ | WordPress-NJ | 1 |
| Wyckoff Free Public Library | NJ | WordPress-NJ | 0 |
| Addison Public Library | NY | WordPress-NY | 0 |
| Albany Public Library | NY | WordPress-NY | 22 |
| Alden Ewell Free Library | NY | WordPress-NY | 0 |
| Alfred Box Of Books Library | NY | WordPress-NY | 0 |
| Allegany Public Library | NY | WordPress-NY | 1 |
| Almond Twentieth Century Club Library | NY | WordPress-NY | 7 |
| Amagansett Free Library | NY | WordPress-NY | 0 |
| Amenia Free Library | NY | WordPress-NY | 0 |
| Amherst Public Library Clearfield Branch | NY | WordPress-NY | 0 |
| Andes Public Library | NY | WordPress-NY | 0 |
| Andover Free Library | NY | WordPress-NY | 0 |
| Annie Porter Ainsworth Memorial Library | NY | WordPress-NY | 150 |
| Apalachin Library Association | NY | WordPress-NY | 0 |
| Arcade Free Library | NY | WordPress-NY | 0 |
| Ardsley Public Library | NY | WordPress-NY | 0 |
| Audubon Branch | NY | WordPress-NY | 27 |
| Aurora Free Library | NY | WordPress-NY | 2 |
| B. Elizabeth Strong Memorial Library | NY | WordPress-NY | 0 |
| Babylon School District Public Library | NY | WordPress-NY | 3 |
| Bainbridge Free Library | NY | WordPress-NY | 0 |
| Baldwin Public Library | NY | WordPress-NY | 0 |
| Bancroft Public Library | NY | WordPress-NY | 0 |
| Barker Free Library | NY | WordPress-NY | 14 |
| Barneveld Free Library Association | NY | WordPress-NY | 0 |
| Beaver Falls Library | NY | WordPress-NY | 0 |
| Bedford Free Library | NY | WordPress-NY | 0 |
| Bedford Hills Free Library | NY | WordPress-NY | 19 |
| Belden Noble Memorial Library Of Essex | NY | WordPress-NY | 0 |
| Belfast Public Library | NY | WordPress-NY | 0 |
| Bellmore Memorial Library | NY | WordPress-NY | 1 |
| Bemus Point Public Library | NY | WordPress-NY | 0 |
| Blodgett Memorial Library District Of Fishkill | NY | WordPress-NY | 0 |
| Blount Library | NY | WordPress-NY | 15 |
| Brentwood Public Library | NY | WordPress-NY | 0 |
| Brewster Public Library | NY | WordPress-NY | 0 |
| Briarcliff Manor Public Library | NY | WordPress-NY | 32 |
| Bronxville Public Library | NY | WordPress-NY | 22 |
| Brooklyn Public Library | NY | WordPress-NY | 0 |
| Brownville-Glen Park Library | NY | WordPress-NY | 0 |
| Bryant Library | NY | WordPress-NY | 0 |
| Buffalo & Erie County Public Library | NY | WordPress-NY | 120 |
| C. W. Clark Memorial Library | NY | WordPress-NY | 0 |
| Cairo Public Library | NY | WordPress-NY | 1 |
| Caledonia Library Association | NY | WordPress-NY | 1 |
| Cambridge Public Library | NY | WordPress-NY | 0 |
| Camden Library Association | NY | WordPress-NY | 0 |
| Canajoharie Library And Art Gallery | NY | WordPress-NY | 0 |
| Canastota Public Library | NY | WordPress-NY | 0 |
| Canton Free Library | NY | WordPress-NY | 1 |
| Cape Vincent Community Library | NY | WordPress-NY | 48 |
| Cattaraugus Free Library | NY | WordPress-NY | 0 |
| Cazenovia Public Library Society | NY | WordPress-NY | 1 |
| Center Moriches Free Public Library | NY | WordPress-NY | 1 |
| Central Islip Public Library | NY | WordPress-NY | 0 |
| Central Square Library | NY | WordPress-NY | 19 |
| Chappaqua Library | NY | WordPress-NY | 40 |
| Chatham Public Library | NY | WordPress-NY | 1 |
| Cherry Valley Memorial Library | NY | WordPress-NY | 10 |
| Chester Public Library | NY | WordPress-NY | 0 |
| Claverack Library | NY | WordPress-NY | 1 |
| Clyde-Savannah Public Library | NY | WordPress-NY | 2 |
| Clymer-French Creek Free Library | NY | WordPress-NY | 0 |
| Cohocton Public Library | NY | WordPress-NY | 58 |
| Cohoes Public Library | NY | WordPress-NY | 0 |
| Community Free Library | NY | WordPress-NY | 19 |
| Copiague Memorial Public Library | NY | WordPress-NY | 1 |
| Corfu Free Library | NY | WordPress-NY | 0 |
| Cornwall Public Library | NY | WordPress-NY | 0 |
| Cuba Circulating Library Association | NY | WordPress-NY | 65 |
| Cutchogue New Suffolk Free Library | NY | WordPress-NY | 0 |
| D.R. Evarts Library | NY | WordPress-NY | 38 |
| Dansville Public Library | NY | WordPress-NY | 0 |
| David A Howe Public Library | NY | WordPress-NY | 0 |
| Deer Park Public Library | NY | WordPress-NY | 0 |
| Delevan-Yorkshire Public Library | NY | WordPress-NY | 0 |
| Deruyter Free Library | NY | WordPress-NY | 1 |
| Dewitt Community Library Assoc., Inc | NY | WordPress-NY | 40 |
| Didymus Thomas Library | NY | WordPress-NY | 0 |
| Dobbs Ferry Public Library | NY | WordPress-NY | 39 |
| Dolgeville-Manheim Public Library | NY | WordPress-NY | 0 |
| Dormann Library | NY | WordPress-NY | 0 |
| Dunham Public Library | NY | WordPress-NY | 0 |
| Dunkirk Free Library | NY | WordPress-NY | 1 |
| Eagle Free Library | NY | WordPress-NY | 13 |
| Earlville Free Library | NY | WordPress-NY | 1 |
| East Greenbush Community Library | NY | WordPress-NY | 4 |
| East Hampton Library | NY | WordPress-NY | 35 |
| East Islip Public Library | NY | WordPress-NY | 0 |
| East Rochester Public Library | NY | WordPress-NY | 0 |
| East Rockaway Public Library | NY | WordPress-NY | 6 |
| Eastchester Public Library | NY | WordPress-NY | 5 |
| Edith B. Ford Memorial Library | NY | WordPress-NY | 0 |
| Elbridge Free Library | NY | WordPress-NY | 0 |
| Ellicottville Memorial Library | NY | WordPress-NY | 0 |
| Ellisburg Free Library | NY | WordPress-NY | 25 |
| Elmont Public Library | NY | WordPress-NY | 1 |
| Elwood Public Library | NY | WordPress-NY | 1 |
| Erwin Library Institute | NY | WordPress-NY | 0 |
| Ethelbert B. Crawford Public Library | NY | WordPress-NY | 0 |
| Fair Haven Public Library | NY | WordPress-NY | 1 |
| Fairport Public Library | NY | WordPress-NY | 8 |
| Falconer Public Library | NY | WordPress-NY | 14 |
| Farman Free Library Association Of Ellington | NY | WordPress-NY | 19 |
| Farmingdale Public Library | NY | WordPress-NY | 1 |
| Finkelstein Memorial Library | NY | WordPress-NY | 1 |
| Floral Park Public Library | NY | WordPress-NY | 2 |
| Franklin Free Library | NY | WordPress-NY | 0 |
| Fred And Harriet Taylor Memorial Library | NY | WordPress-NY | 18 |
| Free Library Of The Belmont Literary And Historical Society | NY | WordPress-NY | 0 |
| Freeport Memorial Library | NY | WordPress-NY | 5 |
| Fulton Public Library | NY | WordPress-NY | 0 |
| Galway Public Library | NY | WordPress-NY | 0 |
| Garden City Public Library | NY | WordPress-NY | 69 |
| Gardiner Library | NY | WordPress-NY | 0 |
| Germantown Library | NY | WordPress-NY | 150 |
| Glen Cove Public Library | NY | WordPress-NY | 0 |
| Gloversville Public Library | NY | WordPress-NY | 1 |
| Gorham Free Library | NY | WordPress-NY | 0 |
| Goshen Public Library And Historical Society | NY | WordPress-NY | 0 |
| Gowanda Free Library | NY | WordPress-NY | 6 |
| Great Neck Library | NY | WordPress-NY | 72 |
| Greenville Public Library | NY | WordPress-NY | 1 |
| Guernsey Memorial Library Of Norwich | NY | WordPress-NY | 1 |
| Guilderland Public Library | NY | WordPress-NY | 1 |
| Hamburg Library | NY | WordPress-NY | 29 |
| Hamilton Public Library | NY | WordPress-NY | 0 |
| Hamlin Public Library | NY | WordPress-NY | 0 |
| Hammond Free Library | NY | WordPress-NY | 0 |
| Hammond Library Of Crown Point | NY | WordPress-NY | 1 |
| Hampton Bays Public Library | NY | WordPress-NY | 5 |
| Hannibal Free Library | NY | WordPress-NY | 0 |
| Harrison Public Library | NY | WordPress-NY | 9 |
| Hauppauge Public Library | NY | WordPress-NY | 0 |
| Haverstraw Kings Daughters Public Library - Village Branch | NY | WordPress-NY | 0 |
| Hawn Memorial Library | NY | WordPress-NY | 150 |
| Haxton Memorial Library | NY | WordPress-NY | 12 |
| Henry Waldinger Memorial Library | NY | WordPress-NY | 25 |
| Hepburn Library Of Waddington | NY | WordPress-NY | 0 |
| Hicksville Public Library | NY | WordPress-NY | 11 |
| Highland Falls Library | NY | WordPress-NY | 0 |
| Highland Public Library | NY | WordPress-NY | 0 |
| Holland Patent Free Library | NY | WordPress-NY | 0 |
| Howland Public Library | NY | WordPress-NY | 2 |
| Hudson Area Association Library | NY | WordPress-NY | 0 |
| Huntington Public Library | NY | WordPress-NY | 0 |
| Hurley Library District | NY | WordPress-NY | 10 |
| Hyde Park Free Library | NY | WordPress-NY | 31 |
| Ilion Free Public Library | NY | WordPress-NY | 0 |
| Irvington Pub Lib Guiteau Foundation | NY | WordPress-NY | 3 |
| Island Park Public Library | NY | WordPress-NY | 1 |
| Islip Public Library | NY | WordPress-NY | 0 |
| Ithaca Tompkins County Public Library | NY | WordPress-NY | 46 |
| Jericho Public Library | NY | WordPress-NY | 80 |
| John C. Hart Memorial Library | NY | WordPress-NY | 0 |
| John Jermain Memorial Library | NY | WordPress-NY | 0 |
| Jordan Bramley Library | NY | WordPress-NY | 0 |
| Jordanville Public Library | NY | WordPress-NY | 0 |
| Katonah Village Library | NY | WordPress-NY | 5 |
| Keene Valley Public Library | NY | WordPress-NY | 0 |
| Kennedy Free Library | NY | WordPress-NY | 0 |
| Kinderhook Memorial Library | NY | WordPress-NY | 150 |
| King Memorial Library | NY | WordPress-NY | 15 |
| Kingston Library | NY | WordPress-NY | 10 |
| Kirkland Town Library | NY | WordPress-NY | 0 |
| Lafayette Public Library | NY | WordPress-NY | 0 |
| Lake Placid Public Library | NY | WordPress-NY | 12 |
| Lakewood Memorial Library | NY | WordPress-NY | 0 |
| Lansing Community Library | NY | WordPress-NY | 11 |
| Larchmont Public Library | NY | WordPress-NY | 9 |
| Lewisboro Library | NY | WordPress-NY | 150 |
| Lewiston Public Library | NY | WordPress-NY | 0 |
| Library Association Of Rockland County | NY | WordPress-NY | 61 |
| Lindenhurst Memorial Library | NY | WordPress-NY | 82 |
| Lisle Free Library | NY | WordPress-NY | 0 |
| Little Falls Public Library | NY | WordPress-NY | 0 |
| Livingston Free Library | NY | WordPress-NY | 0 |
| Livingston Manor Free Library | NY | WordPress-NY | 30 |
| Livonia Public Library | NY | WordPress-NY | 1 |
| Lockport Public Library | NY | WordPress-NY | 29 |
| Locust Valley Library | NY | WordPress-NY | 0 |
| Long Beach Public Library | NY | WordPress-NY | 1 |
| Louise Adelia Read Memorial Library | NY | WordPress-NY | 1 |
| Lynbrook Public Library | NY | WordPress-NY | 32 |
| Lyons Falls Library | NY | WordPress-NY | 4 |
| Lyons Public Library | NY | WordPress-NY | 0 |
| Mahopac Public Library | NY | WordPress-NY | 10 |
| Malverne Public Library | NY | WordPress-NY | 1 |
| Mamaroneck Public Library District | NY | WordPress-NY | 150 |
| Manhasset Public Library | NY | WordPress-NY | 12 |
| Manlius Library | NY | WordPress-NY | 1 |
| Mannsville Free Library | NY | WordPress-NY | 30 |
| Marcellus Free Library | NY | WordPress-NY | 0 |
| Marion Public Library | NY | WordPress-NY | 0 |
| Marlboro Free Library | NY | WordPress-NY | 2 |
| Mary E. Seymour Memorial Free Library | NY | WordPress-NY | 0 |
| Mayville Library | NY | WordPress-NY | 0 |
| Memorial Library Of Little Valley | NY | WordPress-NY | 3 |
| Menands Public Library | NY | WordPress-NY | 0 |
| Merrick Library | NY | WordPress-NY | 1 |
| Middleburgh Library | NY | WordPress-NY | 0 |
| Middleville Free Library | NY | WordPress-NY | 0 |
| Millbrook Free Library | NY | WordPress-NY | 0 |
| Minerva Free Library | NY | WordPress-NY | 0 |
| Minoa Library | NY | WordPress-NY | 0 |
| Modeste Bedient Memorial Library | NY | WordPress-NY | 12 |
| Monroe Free Library | NY | WordPress-NY | 0 |
| Montauk Library | NY | WordPress-NY | 12 |
| Montgomery Free Library | NY | WordPress-NY | 6 |
| Montour Falls Memorial Library | NY | WordPress-NY | 15 |
| Mooers Free Library | NY | WordPress-NY | 0 |
| Moore Memorial Library | NY | WordPress-NY | 0 |
| Morristown Public Library | NY | WordPress-NY | 0 |
| Morton Memorial Library | NY | WordPress-NY | 1 |
| Mount Morris Library | NY | WordPress-NY | 0 |
| Mount Vernon Public Library | NY | WordPress-NY | 30 |
| Nanuet Public Library | NY | WordPress-NY | 1 |
| Naples Library | NY | WordPress-NY | 0 |
| Nassau Free Library | NY | WordPress-NY | 1 |
| Nassau Library System | NY | WordPress-NY | 0 |
| New Berlin Library | NY | WordPress-NY | 32 |
| New Lebanon Library | NY | WordPress-NY | 22 |
| New Rochelle Public Library | NY | WordPress-NY | 0 |
| New Woodstock Free Library | NY | WordPress-NY | 0 |
| New York Mills Public Library | NY | WordPress-NY | 0 |
| New York Public Library | NY | WordPress-NY | 0 |
| Newark Public Library | NY | WordPress-NY | 1 |
| Newburgh Free Library | NY | WordPress-NY | 2 |
| Newfane Free Library | NY | WordPress-NY | 0 |
| Newstead Public Library | NY | WordPress-NY | 0 |
| North Bellmore Public Library | NY | WordPress-NY | 1 |
| North Chatham Free Library | NY | WordPress-NY | 47 |
| North Merrick Public Library | NY | WordPress-NY | 41 |
| Northville Public Library | NY | WordPress-NY | 0 |
| Norwood Library | NY | WordPress-NY | 0 |
| Nyack Library | NY | WordPress-NY | 1 |
| Oceanside Library | NY | WordPress-NY | 66 |
| Old Forge Library | NY | WordPress-NY | 1 |
| Olean Public Library | NY | WordPress-NY | 2 |
| Orangeburg Library | NY | WordPress-NY | 8 |
| Oriskany Public Library | NY | WordPress-NY | 0 |
| Orleans Public Library | NY | WordPress-NY | 0 |
| Ossining Public Library | NY | WordPress-NY | 4 |
| Oswego School District Public Library | NY | WordPress-NY | 0 |
| Oxford Memorial Library | NY | WordPress-NY | 0 |
| Oyster Bay-East Norwich Public Library | NY | WordPress-NY | 1 |
| Palisades Free Library | NY | WordPress-NY | 1 |
| Parish Public Library | NY | WordPress-NY | 0 |
| Patterson Library | NY | WordPress-NY | 0 |
| Pawling Free Library | NY | WordPress-NY | 0 |
| Pearl River Public Library | NY | WordPress-NY | 1 |
| Pember Library Museum | NY | WordPress-NY | 0 |
| Penfield Public Library | NY | WordPress-NY | 0 |
| Perry Public Library | NY | WordPress-NY | 0 |
| Peru Free Library | NY | WordPress-NY | 0 |
| Phillips Free Library | NY | WordPress-NY | 1 |
| Phoenicia Library | NY | WordPress-NY | 1 |
| Phoenix Public Library | NY | WordPress-NY | 1 |
| Piermont Library District | NY | WordPress-NY | 1 |
| Pike Library | NY | WordPress-NY | 0 |
| Pine Plains Free Library | NY | WordPress-NY | 150 |
| Plainedge Public Library | NY | WordPress-NY | 6 |
| Pleasant Valley Free Library | NY | WordPress-NY | 1 |
| Poestenkill Library | NY | WordPress-NY | 4 |
| Port Byron Library | NY | WordPress-NY | 1 |
| Port Chester Public Library | NY | WordPress-NY | 9 |
| Port Jervis Free Library | NY | WordPress-NY | 0 |
| Port Leyden Community Library | NY | WordPress-NY | 0 |
| Portville Free Library | NY | WordPress-NY | 0 |
| Potsdam Public Library | NY | WordPress-NY | 35 |
| Poughkeepsie Public Library District | NY | WordPress-NY | 1 |
| Pound Ridge Library District | NY | WordPress-NY | 0 |
| Prospect Free Library | NY | WordPress-NY | 0 |
| Putnam Valley Free Library | NY | WordPress-NY | 1 |
| Queens Borough Public Library - Astoria | NY | WordPress-NY | 0 |
| Queens Borough Public Library - Elmhurst | NY | WordPress-NY | 0 |
| Queens Borough Public Library - Glendale | NY | WordPress-NY | 0 |
| Queens Borough Public Library - Hollis | NY | WordPress-NY | 1 |
| Queens Borough Public Library - Woodside | NY | WordPress-NY | 0 |
| Queens Public Library | NY | WordPress-NY | 1 |
| Quogue Library | NY | WordPress-NY | 0 |
| Ramapo Catskill Library System | NY | WordPress-NY | 0 |
| Ransomville Free Library | NY | WordPress-NY | 0 |
| Reading Room Association Of Gouverneur | NY | WordPress-NY | 0 |
| Red Hook Public Library | NY | WordPress-NY | 1 |
| Reed Memorial Library | NY | WordPress-NY | 1 |
| Rensselaer Public Library | NY | WordPress-NY | 8 |
| Rensselaerville Public Library | NY | WordPress-NY | 0 |
| Richmond Memorial Library | NY | WordPress-NY | 0 |
| Ripley Free Library | NY | WordPress-NY | 9 |
| Riverhead Free Library | NY | WordPress-NY | 121 |
| Rochester Public Library | NY | WordPress-NY | 19 |
| Rockville Centre Public Library | NY | WordPress-NY | 61 |
| Rodman Public Library | NY | WordPress-NY | 0 |
| Roosevelt Public Library | NY | WordPress-NY | 0 |
| Rose Free Library | NY | WordPress-NY | 0 |
| Rose Memorial Library Association | NY | WordPress-NY | 1 |
| Rosendale Library | NY | WordPress-NY | 1 |
| Rouses Point Dodge Memorial Library | NY | WordPress-NY | 2 |
| Roxbury Library Association | NY | WordPress-NY | 1 |
| Rush Public Library | NY | WordPress-NY | 1 |
| Russell Public Library | NY | WordPress-NY | 0 |
| Rye Free Reading Room | NY | WordPress-NY | 1 |
| Sachem Public Library | NY | WordPress-NY | 0 |
| Salamanca Public Library | NY | WordPress-NY | 4 |
| Sayville Library | NY | WordPress-NY | 121 |
| Scarsdale Public Library | NY | WordPress-NY | 66 |
| Schenectady County Public Library | NY | WordPress-NY | 0 |
| Schoharie Free Library Assn. | NY | WordPress-NY | 0 |
| Schroon Lake Public Library | NY | WordPress-NY | 150 |
| Scio Memorial Library | NY | WordPress-NY | 0 |
| Scottsville Free Library | NY | WordPress-NY | 1 |
| Sea Cliff Village Library | NY | WordPress-NY | 1 |
| Seaford Public Library | NY | WordPress-NY | 0 |
| Seneca Falls Library | NY | WordPress-NY | 0 |
| Seneca Nation Of Indians Library Cattaraugus Territory | NY | WordPress-NY | 0 |
| Seymour Public Library District | NY | WordPress-NY | 113 |
| Shelter Island Public Library Society | NY | WordPress-NY | 0 |
| Shelter Rock Public Library | NY | WordPress-NY | 1 |
| Sherburne Public Library | NY | WordPress-NY | 2 |
| Sidney Memorial Public Library | NY | WordPress-NY | 0 |
| Sinclairville Free Library | NY | WordPress-NY | 7 |
| Sloatsburg Public Library | NY | WordPress-NY | 1 |
| Smyrna Public Library | NY | WordPress-NY | 0 |
| Sodus Free Library | NY | WordPress-NY | 0 |
| Solvay Public Library | NY | WordPress-NY | 0 |
| Somers Library | NY | WordPress-NY | 0 |
| Southold Free Library | NY | WordPress-NY | 0 |
| Staatsburg Library | NY | WordPress-NY | 23 |
| Stamford Village Library | NY | WordPress-NY | 0 |
| Stephentown Memorial Library | NY | WordPress-NY | 1 |
| Stillwater Free Library | NY | WordPress-NY | 26 |
| Stone Ridge Public Library | NY | WordPress-NY | 0 |
| Suffern Free Library | NY | WordPress-NY | 3 |
| Sullivan Free Library Of Bridgeport | NY | WordPress-NY | 0 |
| Swan Library | NY | WordPress-NY | 0 |
| Syosset Public Library | NY | WordPress-NY | 0 |
| Syracuse Public Library | NY | WordPress-NY | 49 |
| Tappan Library | NY | WordPress-NY | 0 |
| The Jervis Public Library Association, Inc. | NY | WordPress-NY | 0 |
| Tivoli Free Library | NY | WordPress-NY | 0 |
| Tomkins Cove Public Library | NY | WordPress-NY | 2 |
| Town Of Pelham Public Library | NY | WordPress-NY | 41 |
| Town Of Westerlo Public Library | NY | WordPress-NY | 16 |
| Tuckahoe Public Library | NY | WordPress-NY | 0 |
| Tuxedo Park Library | NY | WordPress-NY | 0 |
| Ulysses Philomathic Library | NY | WordPress-NY | 2 |
| Unadilla Public Library | NY | WordPress-NY | 1 |
| Utica Public Library | NY | WordPress-NY | 35 |
| Valley Cottage Free Library | NY | WordPress-NY | 0 |
| Valley Falls Free Library | NY | WordPress-NY | 2 |
| Vernon Public Library | NY | WordPress-NY | 0 |
| Village Library Of Cooperstown | NY | WordPress-NY | 0 |
| Voorheesville Public Library | NY | WordPress-NY | 0 |
| Wadsworth Library | NY | WordPress-NY | 0 |
| Walworth-Seely Public Library | NY | WordPress-NY | 0 |
| Wantagh Public Library | NY | WordPress-NY | 0 |
| Warner Library | NY | WordPress-NY | 0 |
| Warsaw Public Library | NY | WordPress-NY | 0 |
| Waterford Public Library | NY | WordPress-NY | 0 |
| Waterloo Library And Historical Society | NY | WordPress-NY | 0 |
| Watkins Glen Cen Sch Dis Free Pub Lib | NY | WordPress-NY | 150 |
| Waverly Free Library | NY | WordPress-NY | 34 |
| Wayland Free Library | NY | WordPress-NY | 0 |
| Webster Public Library | NY | WordPress-NY | 16 |
| Weedsport Free Library | NY | WordPress-NY | 21 |
| West Hurley Public Library | NY | WordPress-NY | 5 |
| West Islip Public Library | NY | WordPress-NY | 0 |
| West Nyack Free Library | NY | WordPress-NY | 0 |
| West Winfield Library | NY | WordPress-NY | 0 |
| Westbury Memorial Public Library | NY | WordPress-NY | 2 |
| Westchester Library System | NY | WordPress-NY | 0 |
| Westport Library Association | NY | WordPress-NY | 0 |
| White Plains Public Library | NY | WordPress-NY | 0 |
| Whitesville Public Library | NY | WordPress-NY | 0 |
| Wide Awake Club Library | NY | WordPress-NY | 0 |
| William H. Bush Memorial Library | NY | WordPress-NY | 0 |
| William K Sanford Town Library | NY | WordPress-NY | 1 |
| Williamson Free Public Library | NY | WordPress-NY | 0 |
| Williamstown Library | NY | WordPress-NY | 150 |
| Williston Park Public Library | NY | WordPress-NY | 58 |
| Wilmington E.M. Cooper Memorial Public Library | NY | WordPress-NY | 10 |
| Wilson Free Library | NY | WordPress-NY | 0 |
| Windham Public Library | NY | WordPress-NY | 2 |
| Wolcott Civic Free Library | NY | WordPress-NY | 1 |
| Womens Round Lake Improvement Society Lib | NY | WordPress-NY | 3 |
| Woodgate Free Library | NY | WordPress-NY | 0 |
| Woodward Memorial Library | NY | WordPress-NY | 8 |
| Worcester Free Library | NY | WordPress-NY | 0 |
| Wyandanch Public Library | NY | WordPress-NY | 0 |
| Yonkers Public Library | NY | WordPress-NY | 50 |
| Your Home Public Library | NY | WordPress-NY | 0 |
| Ashaway Free Library | RI | WordPress-RI | 0 |
| Brownell Library, Home Of Little Compton | RI | WordPress-RI | 0 |
| Central Falls Free Public Library | RI | WordPress-RI | 0 |
| Coventry Public Library | RI | WordPress-RI | 0 |
| East Greenwich Free Library | RI | WordPress-RI | 1 |
| Essex Public Library | RI | WordPress-RI | 1 |
| Exeter Public Library | RI | WordPress-RI | 0 |
| Fairmount Branch | RI | WordPress-RI | 16 |
| Fox Point Library | RI | WordPress-RI | 1 |
| George Hail Free Library | RI | WordPress-RI | 0 |
| Greene Public Library | RI | WordPress-RI | 0 |
| Greenville Public Library | RI | WordPress-RI | 0 |
| Harmony Library | RI | WordPress-RI | 0 |
| Island Free Library | RI | WordPress-RI | 0 |
| Knight Memorial Library | RI | WordPress-RI | 1 |
| Langworthy Public Library | RI | WordPress-RI | 0 |
| Louttit Memorial Library | RI | WordPress-RI | 44 |
| Marian J. Mohr Memorial Library | RI | WordPress-RI | 0 |
| Middletown Public Library | RI | WordPress-RI | 0 |
| Mount Pleasant Library | RI | WordPress-RI | 1 |
| North Smithfield Public Library | RI | WordPress-RI | 0 |
| Olneyville Library | RI | WordPress-RI | 1 |
| Pascoag Free Public Library | RI | WordPress-RI | 3 |
| Portsmouth Free Public Library | RI | WordPress-RI | 0 |
| Providence Public Library | RI | WordPress-RI | 1 |
| Rochambeau Library | RI | WordPress-RI | 1 |
| Rogers Free Library | RI | WordPress-RI | 0 |
| Rumford Branch | RI | WordPress-RI | 0 |
| Smith Hill Library | RI | WordPress-RI | 1 |
| South Providence Library | RI | WordPress-RI | 1 |
| Wanskuck Library | RI | WordPress-RI | 1 |
| Washington Park Library | RI | WordPress-RI | 1 |
| Westerly Public Library | RI | WordPress-RI | 4 |
| Woonsocket Harris Public Library | RI | WordPress-RI | 16 |
| Abbeville County Library System | SC | WordPress-SC | 0 |
| Aiken County Library - Midland Valley Branch Library | SC | WordPress-SC | 1 |
| Anderson County Library | SC | WordPress-SC | 101 |
| Anderson County Library - Piedmont Branch Library | SC | WordPress-SC | 0 |
| Chester County Library | SC | WordPress-SC | 0 |
| Chesterfield County Library System | SC | WordPress-SC | 0 |
| Clinton Public Library | SC | WordPress-SC | 0 |
| Dillon County Library System | SC | WordPress-SC | 1 |
| Edgefield County Public Library - Johnston Branch (Mobley Library) | SC | WordPress-SC | 0 |
| Florence County Library System | SC | WordPress-SC | 58 |
| Great Falls Library | SC | WordPress-SC | 57 |
| Greenville County Library - Anderson Road (West) Branch | SC | WordPress-SC | 12 |
| Hal Kohn Memorial Library | SC | WordPress-SC | 0 |
| Hampton County Library - Estill Branch Library | SC | WordPress-SC | 0 |
| Horry County Memorial Library - Loris Library | SC | WordPress-SC | 0 |
| Kershaw County Library - Camden Branch Library | SC | WordPress-SC | 0 |
| Kershaw County Library - Elgin Branch Library | SC | WordPress-SC | 0 |
| Lake View Library | SC | WordPress-SC | 1 |
| Lamar District Library | SC | WordPress-SC | 0 |
| Lexington County Library - Chapin | SC | WordPress-SC | 0 |
| Lexington County Library - Gilbert-Summit | SC | WordPress-SC | 0 |
| Lexington County Library - Irmo | SC | WordPress-SC | 0 |
| Lexington County Library - Swansea | SC | WordPress-SC | 0 |
| Lexington County Public Library System - Main | SC | WordPress-SC | 0 |
| Marion County Library System | SC | WordPress-SC | 0 |
| Mccormick County Library System | SC | WordPress-SC | 4 |
| Oconee County Public Library - Salem Branch Library | SC | WordPress-SC | 0 |
| Oconee County Public Library - Seneca Branch Library | SC | WordPress-SC | 0 |
| Oconee County Public Library - Westminster Branch Library | SC | WordPress-SC | 0 |
| Orangeburg County Library - Springfield Branch Library | SC | WordPress-SC | 0 |
| Orangeburg County Library Commission | SC | WordPress-SC | 0 |
| Pickens County Library - Central-Clemson Branch Library | SC | WordPress-SC | 0 |
| Pickens County Library - Sarlin Branch Library | SC | WordPress-SC | 6 |
| Saluda County Library System | SC | WordPress-SC | 21 |
| Spartanburg County Public Library - H. Carlisle Bean Law Library | SC | WordPress-SC | 0 |
| Union County Library System | SC | WordPress-SC | 3 |
| York Public Library | SC | WordPress-SC | 0 |
| Orange County Library System (scraper aggregate — no per-site log shape) | FL | Orange-County-Library-FL | 2604 |
| Howard County Library System (scraper aggregate — no per-site log shape) | MD | Howard-County | 94 |
| Berks County Public Libraries (scraper aggregate — no per-site log shape) | PA | Berks-County | 56 |
| Brooklyn Public Library (scraper aggregate — no per-site log shape) | NY | Brooklyn-Library | 20 |

### Out-of-rotation: LibraryCalendar-Libraries (hand-run 2026-09-03)

`LibraryCalendar-Libraries` is a **Group 1** scraper and was not part of today's rotation. It was run by hand at 18:34Z to verify a relocation made this session (Graves County Public Library KY, see `SCRAPER-FIX-LOG.jsonl`), and its per-site output is included here rather than discarded — this is exactly what `build-library-site-audit.js --log` exists for. These rows are from a manual run, not the Group 3 rotation.

It found **596 events / 337 new** (vs 505 / 38 on 2026-09-01), 35 per-site rows, one zero-event site (Rensselaerville Public Library NY). The new **Graves County Public Library** row is the relocation proving itself: 22 events, including "Infant Hour- Ages 0-2".

| Library Website | State | Scraper | Events Found |
|---|---|---|---|
| Amherst County Public Library | VA | LibraryCalendar-Libraries | 22 |
| Anderson County Library System | SC | LibraryCalendar-Libraries | 20 |
| Appomattox Regional Library | VA | LibraryCalendar-Libraries | 14 |
| Atlantic County Library System | NJ | LibraryCalendar-Libraries | 24 |
| Bedford Public Library System | VA | LibraryCalendar-Libraries | 18 |
| Bloomingdale Public Library | IL | LibraryCalendar-Libraries | 22 |
| Carnegie Library of McKeesport | PA | LibraryCalendar-Libraries | 18 |
| Caroline County Public Library | MD | LibraryCalendar-Libraries | 21 |
| Cumberland County Public Library | NC | LibraryCalendar-Libraries | 23 |
| Essex Public Library | VA | LibraryCalendar-Libraries | 17 |
| Forsyth County Public Library | NC | LibraryCalendar-Libraries | 21 |
| Frederick County Public Libraries | MD | LibraryCalendar-Libraries | 24 |
| Gloucester County Library System | NJ | LibraryCalendar-Libraries | 23 |
| Grant County Public Library | KY | LibraryCalendar-Libraries | 15 |
| Graves County Public Library | KY | LibraryCalendar-Libraries | 22 |
| Haverstraw King's Daughters Public Library | NY | LibraryCalendar-Libraries | 19 |
| Howard County Library System | MD | LibraryCalendar-Libraries | 22 |
| Jefferson Hills Public Library | PA | LibraryCalendar-Libraries | 19 |
| Jessamine County Public Library | KY | LibraryCalendar-Libraries | 21 |
| Knox County Public Library | TN | LibraryCalendar-Libraries | 17 |
| Lynchburg Public Library | VA | LibraryCalendar-Libraries | 15 |
| Memphis Public Libraries | TN | LibraryCalendar-Libraries | 23 |
| Monroeville Public Library | PA | LibraryCalendar-Libraries | 19 |
| Petersburg Public Library | VA | LibraryCalendar-Libraries | 9 |
| Poquoson Public Library | VA | LibraryCalendar-Libraries | 19 |
| Portsmouth Public Library | VA | LibraryCalendar-Libraries | 19 |
| Powhatan County Public Library | VA | LibraryCalendar-Libraries | 13 |
| Rensselaerville Public Library | NY | LibraryCalendar-Libraries | 0 |
| Schenectady County Public Library | NY | LibraryCalendar-Libraries | 18 |
| Talbot County Free Library | MD | LibraryCalendar-Libraries | 23 |
| Waynesboro Public Library | VA | LibraryCalendar-Libraries | 19 |
| Wilkinsburg Public Library | PA | LibraryCalendar-Libraries | 9 |
| Wyandanch Public Library | NY | LibraryCalendar-Libraries | 20 |
| York County Library | SC | LibraryCalendar-Libraries | 19 |
| York County Public Library | VA | LibraryCalendar-Libraries | 21 |

**Cycle-completion check: not complete.** Across the current cycle (`## 2026-08-28`, `## 2026-08-29`, `## 2026-08-30`, `## 2026-08-31`, `## 2026-09-01`, `## 2026-09-02`, plus today) **87 of 108** active library-family scrapers have at least one row and **21** do not.

- **Group 2 (13)**: BiblioCommons-GA, Communico-AL, Communico-SC, CustomDrupal-Libraries, EventActions-Libraries, LibCal-MA, LibCal-PA, LibCal-VT, LibraryMarket, LibraryMarket-GA, Somerset-County, WordPress-ME, WordPress-MS. **Group 2's regular scrapers have not run since 2026-08-27** — its 08-29, 09-01 and 09-02 turns were lost to three different failure modes. Its next calendar turn is **2026-09-05**.
- **Group 1 (8)**: BiblioCommons-NC, Cecil-County, LibCal-GA, LibCal-NY1, Louisville-Library, SouthwestGeorgia-GA, Tockify-Horry, WordPress-FL. This set is **an artefact of the 2026-09-02 group rebalance**, which moved 114 scrapers between groups: these ran under a different group earlier in the cycle or not at all since being reassigned. Group 1's next turn is **2026-09-04**, which should clear all eight.

The active library-family denominator is **108** (up from the 106 used before 2026-09-02), computed as active registry entries whose key or file matches librar/libcal/communico/bibliocommons/libnet, plus the four single-system library scrapers whose names carry no such token: WordPress-Abbe-Regional, Tockify-Horry, Graniculator-Morris, Intercept-Camden. No `Cycle complete` marker is added.
