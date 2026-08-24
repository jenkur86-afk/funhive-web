# Platform mismatches — libraries filed under the wrong scraper family

Generated 2026-08-23 by `node scripts/detect-site-platform.js`. Regenerate it the same way;
do not hand-edit the tables.

## Why this file exists

392 sites sit at `UNVERIFIABLE` in `reports/verification-comments.json`, and 228 of them
carry the same comment: *"rendered fully but shows no dated events, no event containers and
no explicit empty-state message — cannot distinguish"*. Re-fetching those changes nothing,
because the fetch was never the problem. The page really does show no events to a DOM reader.

"No events in the DOM" has two causes that need opposite fixes:

1. **The library genuinely has no upcoming events.** Nothing to do.
2. **The library's events live on a platform this codebase already parses** — LibCal,
   BiblioCommons, Communico, Assabet, a Google Calendar iframe, CivicPlus — **and the
   WordPress DOM extractor cannot see any of them.** The entry needs *relocating to that
   family's scraper*, not selector work.

This file is case 2, found at scale. Every row below is currently configured under
`WordPress-{state}`, where it can only ever return 0 events, no matter how good the
selectors get.

## Method, and its limit

`detect-site-platform.js` fetches each configured URL with `node:http` (**not** Chrome — see
`resolve-collision-host-state.js` for why Chrome reports `ERR_BLOCKED_BY_CLIENT` for hosts
that answer Node instantly) and looks for host/product strings only one platform emits. It
deliberately does not match generic words like "calendar", which appear on every library
site in existence.

**A platform marker proves the platform is REFERENCED, not that it holds this library's
events.** Confirm the feed returns real dated events before relocating anything — the same
posture the collision work uses. Relocating an entry changes which events are ingested
under which name, so it is not a mechanical edit.

## Scope of this pass

Only the 152 `UNVERIFIABLE` sites that matched a live, non-`urlCollision` config
entry in a `WordPress-{state}` file. The remaining unverifiable sites are in other families
or were already disabled, and are not covered here.

## Totals

| Verdict | Count | Meaning |
|---|---|---|
| `PLATFORM` | 40 | runs a platform we already parse — relocate (this file's worklist) |
| `UNREACHABLE` | 27 | no response on the configured URL — seed-data or a dead host |
| `EMPTY` | 18 | responds, but serves almost no text — likely a dead or JS-only shell |
| `HTTP_403` | 10 | server refuses us; may or may not be a bot block |
| `OFF_HOST` | 4 | the configured URL redirects to a different domain |
| `PARKED` | 2 | the domain is parked, for sale, or holding |
| `HTTP_404` | 1 | the configured URL does not exist |
| `PLAIN_HTML` | 50 | real page, no platform marker — genuinely may have no events, or a bespoke calendar |

## Worklist — platform mismatches (40)

### libraryaware → (none — newsletter tool, not a calendar)  (7)

| State | Currently in | Library | URL |
|---|---|---|---|
| CT | `WordPress-CT` | Thomaston Public Library | https://thomastonlibrary.org/ |
| GA | `WordPress-GA` | Harris County Public Library | https://hamiltonlibrary.org/ |
| KY | `WordPress-KY` | Bullitt County Public Library | https://bcplibrary.org/ |
| MA | `WordPress-MA` | Athol Public Library | https://www.athollibrary.org/ |
| MA | `WordPress-MA` | Joshua Hyde Public Library | https://www.sturbridgelibrary.org |
| PA | `WordPress-PA` | Moores Memorial Library | https://www.christianalibrary.org |
| WV | `WordPress-WV` | Berkeley County Public Library | https://bcpls.org/ |

### assabet → Assabet-NH-MA  (7)

| State | Currently in | Library | URL |
|---|---|---|---|
| CT | `WordPress-NC` | Danbury Public Library | https://danburylibrary.org/ |
| CT | `WordPress-CT` | Old Lyme - Phoebe Griffin Noyes Library | https://www.oldlymelibrary.org |
| MA | `WordPress-MA` | Acton Memorial Library | https://www.actonmemoriallibrary.org |
| MA | `WordPress-MA` | Amesbury Public Library | https://www.amesburylibrary.org |
| MA | `WordPress-MA` | Andrews Branch Library | https://www.newburyportlibrary.org |
| NC | `WordPress-NC` | Hampstead Branch Library | https://www.hampsteadlibrary.org/ |
| VT | `WordPress-VT` | Wells Village | https://wellslibrary.org/ |

### google-calendar → GoogleCalendar-Libraries  (6)

| State | Currently in | Library | URL |
|---|---|---|---|
| GA | `WordPress-GA` | Roddenbery Memorial Library System | https://cairolibrary.org/ |
| GA | `WordPress-GA` | Thomson-Mcduffie County Library | https://www.thomsonlibrary.org/ |
| NC | `WordPress-NC` | Claremont Branch Library | https://www.catawbacountync.gov/county-services/library/ |
| PA | `WordPress-PA` | Union Library Company Of Hatborough | https://www.hatborolibrary.org |
| VT | `WordPress-VT` | Cobleigh Public Library | https://www.cobleighlibrary.org |
| VT | `WordPress-VT` | Roger Clark Memorial | http://www.pittsfieldlibrary.com |

### libcal → LibCal-{ST}  (5)

| State | Currently in | Library | URL |
|---|---|---|---|
| CT | `WordPress-CT` | Bridgeport Public Library | https://www.bportlibrary.org |
| CT | `WordPress-CT` | Wethersfield Public Library | https://www.wethersfieldlibrary.org/ |
| NC | `WordPress-NC` | Graham Public Library | https://library.alamancecountync.gov/ |
| RI | `WordPress-RI` | George Hail Free Library | https://www.georgehail.org/ |
| VA | `WordPress-VA` | Henrico County Public Library | https://www.henricolibrary.org |

### tribe → WordPress-{ST} (REST feed available)  (5)

| State | Currently in | Library | URL |
|---|---|---|---|
| AL | `WordPress-AL` | Montgomery City-County Public Library | https://www.mccpl.lib.al.us |
| CT | `WordPress-CT` | Hall Memorial Library | https://www.ellingtonlibrary.org |
| CT | `WordPress-CT` | Harwinton Public Library | https://www.harwintonlibrary.org |
| NC | `WordPress-NC` | Canton Branch Library | https://www.cantonlibrary.org |
| SC | `WordPress-SC` | Abbeville County Library System | https://abbevillecounty.org |

### bibliocommons → BiblioCommons-{ST}  (4)

| State | Currently in | Library | URL |
|---|---|---|---|
| IN | `WordPress-NC` | Princeton Public Library | https://www.princetonlibrary.org |
| KY | `WordPress-GA` | Warren County Public Library | https://www.warrenpl.org |
| NC | `WordPress-NC` | Matthews Branch Library | https://www.cmlibrary.org/ |
| PA | `WordPress-DE` | Bridgeville Public Library | https://bridgevillelibrary.org/ |

### civicplus → CivicEngage-Libraries  (3)

| State | Currently in | Library | URL |
|---|---|---|---|
| CT | `WordPress-CT` | Trumbull Library | https://www.trumbull-ct.gov/ |
| NC | `WordPress-NC` | Lowell Branch Library | https://gastonlibrary.org/ |
| NC | `WordPress-NC` | Margaret Little Blount Library | https://www.sheppardlibrary.org/ |

### communico → Communico-{ST}  (2)

| State | Currently in | Library | URL |
|---|---|---|---|
| AL | `WordPress-AL` | Homewood Public Library | https://www.homewoodpubliclibrary.org |
| CT | `WordPress-CT` | Hartford Public Library | https://www.hplct.org/ |

### librarymarket → LibraryMarket-{ST}  (1)

| State | Currently in | Library | URL |
|---|---|---|---|
| KY | `WordPress-NC` | Henderson County Public Library | https://www.hcpl.org |

## Not platform problems — seed data (24)

These are the same class as Defect A, just without a state collision to make them
visible in gate 2. An `OFF_HOST` row is often a simple URL correction; an `EMPTY` or
`PARKED` one usually is not.

| Verdict | State | Currently in | Library | URL | Redirects to / detail |
|---|---|---|---|---|---|
| `OFF_HOST` | WA | `WordPress-NC` | Newport Public Library | https://www.newportlibrary.org | newportoregon.gov |
| `OFF_HOST` | CT | `WordPress-CT` | Norwalk Public Library | https://www.norwalkpubliclibrary.org | agentaruhanjuditogel.com |
| `OFF_HOST` | ME | `WordPress-CT` | Portland Public Library | https://www.portlandlibrary.com | portlandlibrary.org |
| `OFF_HOST` | VT | `WordPress-VT` | Stowe Free | https://www.stowelibrary.org | stowefreelibrary.org |
| `PARKED` | IA | `WordPress-VT` | Gilman Public Library | https://gilmanlibrary.org/ | Gilman Library Home AT GILMAN LIBRARY Calendar About Gilman  |
| `PARKED` | IA | `WordPress-VT` | Milton Public Library | https://www.miltonlibrary.org | Milton Public Library - Milton, Massachusetts Skip to Main C |
| `EMPTY` | GA | `WordPress-GA` | Clarkston Branch | https://www.clarkstonlibrary.org | 0 chars of text |
| `EMPTY` | GA | `WordPress-GA` | Coolidge Public Library | https://www.coolidgelibrary.org | 0 chars of text |
| `EMPTY` | GA | `WordPress-GA` | Harlie Fulford Memorial Library | https://www.wrightsvillelibrary.org | 0 chars of text |
| `EMPTY` | NC | `WordPress-NC` | King Public Library | https://www.kinglibrary.org | 0 chars of text |
| `EMPTY` | CT | `WordPress-CT` | Waterbury Public Library | https://www.siloam.com | 0 chars of text |
| `EMPTY` | CT | `WordPress-CT` | Beacon Falls Public Library | https://www.beaconfallslibrary.org | 67 chars of text |
| `EMPTY` | CT | `WordPress-CT` | Mystic Noank Library | https://www.mysticlibrary.org | 0 chars of text |
| `EMPTY` | CT | `WordPress-CT` | Kent Memorial Library | https://www.suffieldlibrary.org | 39 chars of text |
| `EMPTY` | TN | `WordPress-TN` | Tullahoma Public Library | https://www.tullahoma-tn.com/library | 0 chars of text |
| `EMPTY` | TN | `WordPress-TN` | Crockett County Library | https://www.alamolibrary.org | 0 chars of text |
| `EMPTY` | AL | `WordPress-AL` | Scottsboro Public Library | https://scottsborolibrary.org/ | 4 chars of text |
| `EMPTY` | AL | `WordPress-AL` | Jane Culbreth Library | https://www.leedslibrary.org | 0 chars of text |
| `EMPTY` | CA | `WordPress-AL` | Lincoln Public Library | https://www.lincolnlibrary.org | 0 chars of text |
| `EMPTY` | VT | `WordPress-VT` | Fairfax Community | https://www.fairfaxlibrary.org | 0 chars of text |
| `EMPTY` | NY | `WordPress-NY` | New York Public Library | https://www.nypl.org | 0 chars of text |
| `EMPTY` | PA | `WordPress-PA` | Ellwood City Area Pub Library | https://www.ellwoodcitylibrary.org | 0 chars of text |
| `EMPTY` | PA | `WordPress-PA` | Fleetwood Area Public Library | https://www.fleetwoodlibrary.org | 0 chars of text |
| `EMPTY` | PA | `WordPress-PA` | Pequea Valley Public Library - Gap Branch | https://www.gaplibrary.org | 45 chars of text |

## Fixed on the 2026-08-23 pass

Four of the seed-data rows above were corrected in place rather than left on the list,
because each had a replacement that could be proven from the live page — in every case the
ZIP on the replacement site matches the ZIP already in the config entry, which is what makes
the identification evidence rather than a name guess:

| Library | Was | Now | Proof |
|---|---|---|---|
| Norwalk Public Library (CT) | `norwalkpubliclibrary.org` → **agentaruhanjuditogel.com**, an Indonesian gambling domain | `norwalkpl.org` | "Norwalk Public Library, 1 Belden Avenue, Norwalk, CT 06850", 203-899-2780 |
| Waterbury Public Library (CT) | `siloam.com`, an empty page and not a library | `bronsonlibrary.org` | "Silas Bronson Library, 267 Grand Street, Waterbury, CT 06702", 203-574-8225 |
| Portland Public Library (ME) | `portlandlibrary.com` | `portlandlibrary.org` | "Explore Your Public Library \| Portland Public Library" |
| Stowe Free (VT) | `stowelibrary.org` | `stowefreelibrary.org` | "Home \| Stowe Free Library", "90 Pond Street, Stowe, VT, 05672", 802-253-6145 |

The Norwalk one was urgent for a reason beyond coverage: an expired library domain resold to
a gambling site is a content-safety problem on a family events site, not just a scraping one.
It is the second such case found — `newfanelibrary.org` was the first.

Correcting a URL does **not** fix these entries' extraction. Norwalk runs CivicPlus,
Waterbury runs LibraryAware and Portland runs LibCal, so all three remain relocation
candidates on the worklist above.
