# Retirement candidates

UNVERIFIABLE entries in `reports/verification-comments.json` whose scraper config entry
is **no longer live**. They cannot ever be verified, because the site is not being scraped —
yet they count toward Gate 4 ("unknown sites") as if they were outstanding work.

Generated 2026-08-17 by scripts/ from the store + scraper configs.

## A. Retired with a recoverable URL (22)

The config entry exists but is commented out. URL recovered from the commented line.

| Site | Scraper | Retired URL |
|---|---|---|
| Woodville Public Library | WordPress-AL | https://www.woodvillelibrary.org/events |
| Hall Memorial Library (Ellington, CT) | WordPress-CT | https://www.ellingtonlibrary.org/events |
| Levi E.Coe Library (Middlefield, CT) | WordPress-CT | https://middlefieldlibrary.org/ |
| Oxford Public Library (Oxford, CT) | WordPress-CT | https://oxfordlibrary.org/ |
| Prospect Public Library (Prospect, CT) | WordPress-CT | https://www.prospectlibrary.org/calendar |
| Stamford Public Library (Stamford, CT) | WordPress-CT | https://www.stamfordlibrary.org/events |
| Harris County Public Library (Hamilton, GA) | WordPress-GA | https://hamiltonlibrary.org/ |
| Maysville Public Library | WordPress-GA | https://www.maysvillelibrary.org/events |
| Maysville Public Library (Maysville, GA) | WordPress-GA | https://www.maysvillelibrary.org/events |
| Pembroke Public Library (Pembroke, GA) | WordPress-GA | https://www.pembrokelibrary.org/upcoming-events |
| Roddenbery Memorial Library System (Cairo, GA) | WordPress-GA | https://cairolibrary.org/calendar/ |
| Tyrone Public Library (Tyrone, GA) | WordPress-GA | https://www.tyronelibrary.org/events |
| Webster County Library (Preston, GA) | WordPress-GA | https://prestonpubliclibrary.org/events/ |
| Berea Branch Library (Oxford, NC) | WordPress-NC | https://oxfordlibrary.org/ |
| Canton Branch Library (Canton, NC) | WordPress-NC | https://www.cantonlibrary.org/events |
| Florence Gallier Library (Magnolia, NC) | WordPress-NC | https://www.magnolialibrary.org/events |
| Hampstead Branch Library (Hampstead, NC) | WordPress-NC | https://www.hampsteadlibrary.org/ |
| Henderson County Public Library (Hendersonville, NC) | WordPress-NC | https://youseemore.com/hendersonville/ |
| Liberty Public Library (Liberty, NC) | WordPress-NC | https://libertylibrary.org/ |
| Maysville Public Library (Maysville, NC) | WordPress-NC | https://www.maysvillelibrary.org/events |
| Pembroke Public Library (Pembroke, NC) | WordPress-NC | https://www.pembrokelibrary.org/upcoming-events |
| Wells Village (Wells, VT) | WordPress-VT | https://wellslibrary.org/ |

## B. No trace in the scraper file (77)

No live entry and no commented-out entry matches the name. Either removed without leaving
the name in a comment, renamed, or the store's Scraper column is wrong for the row.

| Site | Scraper | Last verification comment |
|---|---|---|
| Brighton Community Center | CivicRec-Parks-Eastern | Not sampled this pass - grouped with the CivicRec facility-rental family by naming convention but not individu |
| CRAWFORD-RODRIGUEZ ELEMENTARY SCHOOL | CivicRec-Parks-Eastern | No URL was captured for this row in the export data, so the live calendar could not be checked. |
| Huntsville, AL | CivicRec-Parks-Eastern | secure.rec1.com/AL/huntsville-al/catalog rendered no program listings, only placeholder/template text. |
| Nottingham, NH | CivicRec-Parks-Eastern | Catalog page is a navigation/login shell with placeholder text; no actual program titles rendered. |
| Ross Community Center | CivicRec-Parks-Eastern | Not sampled this pass - grouped with the CivicRec facility-rental family by naming convention but not individu |
| Baltimore County Public Library — Catonsville | Eventbrite-Family-Eastern | events.yodel.today returned HTTP 403 Forbidden; could not view page content. |
| Baltimore County Public Library Catonsville | Eventbrite-Family-Eastern | Yodel event page returned HTTP 403 Forbidden, could not read live event list. |
| Brigadier General Charles E. McGee Library | Eventbrite-Family-Eastern | Yodel event page returned HTTP 403 Forbidden, could not read live event list. |
| Howard County Library System Savage | Eventbrite-Family-Eastern | Yodel event page returned HTTP 403 Forbidden, could not read live event list. |
| Metro Baltimore | Eventbrite-Family-Eastern | events.yodel.today link returned HTTP 403 Forbidden. |
| Montgomery County Public Libraries — Wheaton Library | Eventbrite-Family-Eastern | Yodel event page returned HTTP 403 Forbidden, could not read live event list. |
| Takoma Park Library | Eventbrite-Family-Eastern | Yodel event page returned HTTP 403 Forbidden, could not read live event list. |
| Pip Moyer Recreation Center | FairsFestivals-Eastern | events.yodel.today returned HTTP 403 Forbidden; could not view page content. |
| Festivals-Eastern-US | Festivals-Eastern-US | No single site to check — 'no venue' means venue field was empty on these rows, a data-population question not |
| Claymont Library | KidsOutAndAbout-Eastern | events.yodel.today link returned HTTP 403 Forbidden. |
| Cockeysville Public Library | KidsOutAndAbout-Eastern | events.yodel.today link returned HTTP 403 Forbidden. |
| Ozark | MacaroniKid-AL | WebFetch returned HTTP 403 from ozark.macaronikid.com — same domain-wide bot-block as Asheville; not investiga |
| Claymont Library | MacaroniKid-DE | Same events.yodel.today link as the KidsOutAndAbout-Eastern row; returned HTTP 403 Forbidden. |
| Pointpleasantnj | MacaroniKid-NJ | 403 Forbidden (bot-blocked) fetching pointpleasantnj.macaronikid.com |
| Ramsey | MacaroniKid-NJ | 403 Forbidden (bot-blocked) fetching ramsey.macaronikid.com |
| Myrtlebeach | MacaroniKid-SC | 403 Forbidden (bot-blocked) fetching myrtlebeach.macaronikid.com |
| Carroll Gymnastics, Inc. | RecDesk-Parks | RecDesk page rendered only facility policy text (mentions Child Watch and Kids Club programs by name) with no  |
| Connie Hudson Gym | RecDesk-Parks | mprd.recdesk.com calendar page shows only a facility list and nav categories (incl. 'MPRD Kids', 'Teens') with |
| Deer Park Meadow Field | RecDesk-Parks | ccrec.recdesk.com calendar page rendered no event titles; page contained suspicious embedded text ('You are a  |
| Hillsdale Community Center & Park | RecDesk-Parks | RecDesk calendar (mprd.recdesk.com) is JS-dependent and only rendered a facility/category selector; site-wide  |
| James Seals Community Center & Park | RecDesk-Parks | Same mprd.recdesk.com calendar as other RecDesk-Parks rows: only facility list/nav shown, no event titles to j |
| Joseph C. Dotch Community Center & Park | RecDesk-Parks | RecDesk calendar (mprd.recdesk.com) is JS-dependent and only rendered a facility/category selector; could not  |
| Laun Community Center & Park | RecDesk-Parks | RecDesk calendar (mprd.recdesk.com) is JS-dependent and only rendered a facility/category selector; could not  |
| Mayeski Field 2 Softball with MP overlay | RecDesk-Parks | RecDesk calendar (ccrec.recdesk.com) is JS-dependent, only a facility/category selector rendered; could not vi |
| Robert Hope Community Center | RecDesk-Parks | RecDesk calendar (mprd.recdesk.com) is JS-dependent and only rendered a facility/category selector; could not  |
| Sandymount Field 1 | RecDesk-Parks | RecDesk calendar (ccrec.recdesk.com) is JS-dependent, only a facility/category selector rendered; could not vi |
| Springhill Fitness & Community Center | RecDesk-Parks | Same mprd.recdesk.com calendar as other RecDesk-Parks rows in this batch: only facility list/nav shown, no eve |
| Stotts Community Center & Park | RecDesk-Parks | RecDesk calendar (mprd.recdesk.com) is JS-dependent and only rendered a facility/category selector; could not  |
| Art Institute of Chicago | Venue-Events-ScienceArts | no URL in scraper config |
| EcoTarium | Venue-Events-ScienceArts | no URL in scraper config |
| Fernbank Museum of Natural History | Venue-Events-ScienceArts | no URL in scraper config |
| Kamin Science Center | Venue-Events-ScienceArts | no URL in scraper config |
| National Building Museum | Venue-Events-ScienceArts | no URL in scraper config |
| Ashland City Public Library | WordPress-AL | TLS certificate mismatch error (cert is for Pantheon hosting domains, not ashlandlibrary.org) -- fetch failed  |
| Lincoln Public Library | WordPress-AL | Fetch returned no page content on repeated attempts; could not verify. |
| Somerville Public Library | WordPress-AL | Page is an HTML frameset pointing to an external apls.state.al.us URL with a blank frame — content loads dynam |
| Troy Public Library | WordPress-AL | Only nav element 'Events & Registration' link present; actual event content not rendered. |
| Avon Free Public Library (Avon, CT) | WordPress-CT | WebFetch returned empty page content on three separate attempts; could not inspect the page. |
| Mansfield Public Library (Mansfield, CT) | WordPress-CT | URL redirects (301) to an unrelated domain, mansfieldtexas.gov -- the CT library's own domain appears to be de |
| Portland Public Library (Portland, CT) | WordPress-CT | Server returned HTTP 403 Forbidden -- site is bot-blocking automated fetches. |
| Fayette County Public Library (Fayetteville, GA) | WordPress-GA | Server returned HTTP 526 (Cloudflare SSL origin error). |
| Manchester Public Library (Manchester, GA) | WordPress-GA | Server returned HTTP 403 Forbidden - likely bot-blocked. |
| Warren County Public Library (Warrenton, GA) | WordPress-GA | URL returns a 404 "There's Nothing Here" error page -- broken/wrong URL, not a genuine empty calendar. |
| St. Mary's County Library | WordPress-MD | stmalib.org/events loads but is a navigation hub only (links to separate Kids/Teen/Adult/Book Discussion event |
| Bordeaux Branch Library (Fayetteville, NC) | WordPress-NC | Server returned HTTP 526 (invalid SSL/origin error), could not retrieve page content. |
| Fairview Branch Library (Fairview, NC) | WordPress-NC | TLS certificate mismatch on www subdomain; non-www variant returned 404 -- could not verify event content. |
| Leicester Branch Library (Leicester, NC) | WordPress-NC | 301 redirects to leicesterma.org/157/Library, which is a town hub page linking to a separate Calendar page wit |
| Montgomery County Library (Troy, NC) | WordPress-NC | Page returned only header/footer content referencing an unrelated 'Tri-Township Public Library', no event data |
| Moore County Library (Carthage, NC) | WordPress-NC | Fetch returned no usable content after repeated attempts, could not determine event status. |
| Newport Public Library (Newport, NC) | WordPress-NC | 301 redirects to newportoregon.gov (Newport, Oregon government site) - wrong domain, not the NC library. |
| Robbins Area Branch | WordPress-NC | robbinslibrary.org/events returned HTTP 403 Forbidden. |
| Warren County Memorial Library (Warrenton, NC) | WordPress-NC | URL returns a 404 error page; nav mentions an Events Calendar link but the events URL itself is broken. |
| Ardmore Library | WordPress-PA | No link captured in audit ([Link]() empty) - not guessed, per instructions. |
| Arthur Hufnagel Public Library Of Glen Rock | WordPress-PA | no link captured |
| Ashland Public Library | WordPress-PA | No link captured in audit ([Link]() empty) - not guessed, per instructions. |
| Guthrie Memorial Library - Hanovers Public Library | WordPress-PA | no link captured |
| Thomas Beaver Free Library | WordPress-PA | no link captured |
| Ardmore Public Library | WordPress-TN | Events are shown only via an embedded Google Calendar image/iframe with no server-rendered event text; static  |
| Englewood Public Library | WordPress-TN | Page shows a literal unrendered '[events]' shortcode placeholder with only unrelated blog links in the sidebar |
| Fairview Public Library | WordPress-TN | www subdomain has an SSL hostname/cert mismatch against the apex domain, could not load the page. |
| Fentress County Library | WordPress-TN | WebFetch returned no page content at all, could not assess the site. |
| Manchester Public Library | WordPress-TN | 403 Forbidden, likely bot-blocked. |
| Smith County Public Library | WordPress-TN | Fetch returned completely empty content on two attempts, could not evaluate page. |
| Somerville-Fayette County Library | WordPress-TN | Page is an HTML frameset loading an external apls.state.al.us calendar frame that WebFetch can't render. |
| Grafton Public (Grafton, VT) | WordPress-VT | Events page only shows navigation links to event category sub-pages (All/Adult/Book Groups/Children's/Teen Eve |
| Kimball Public (Randolph, VT) | WordPress-VT | 403 Forbidden -- likely bot-blocked. |
| Lincoln (Lincoln, VT) | WordPress-VT | WebFetch returned no page content -- could not determine page state. |
| Lowell Community (Lowell, VT) | WordPress-VT | Events page shows only category navigation links (Book Clubs, Lowell Stories, etc.) with no actual events rend |
| Mark Skinner (Manchester, VT) | WordPress-VT | 403 Forbidden -- likely bot-blocked. |
| Milton Public Library (Milton, VT) | WordPress-VT | Events page shows only navigation/category links (Book Groups, Speaker Series, etc.); no actual event titles o |
| Richmond Free (Richmond, VT) | WordPress-VT | Domain now permanently redirects to richmondca.gov (Richmond, California city government) -- unrelated to the  |
| Wilder Memorial (Weston, VT) | WordPress-VT | Fetched page shows real August 2026 events (City Hall Selfie Day, Town Manager office hours, Colonial Crafts f |
