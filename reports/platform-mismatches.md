# Platform mismatches — libraries filed under the wrong scraper family

Generated 2026-08-23 by `node scripts/detect-site-platform.js`. Regenerate it the same way;
do not hand-edit the tables.

## Why this file exists

Gate 4 holds 376 `UNVERIFIABLE` sites and most carry the same comment: *"rendered fully but
shows no dated events, no event containers and no explicit empty-state message — cannot
distinguish"*. Re-fetching them changes nothing, because the fetch was never the problem.

"No events in the DOM" has two causes needing opposite fixes:

1. **The library genuinely has no upcoming events.** Nothing to do.
2. **Its events live on a platform this codebase already parses** — LibCal, BiblioCommons,
   Communico, Assabet, CivicPlus, a Google Calendar iframe — **and the WordPress DOM
   extractor cannot see any of them.** The entry needs *relocating*, not selector work.

## Two things to read before using this list

**A platform marker proves the platform is REFERENCED, not that it holds this library's
events.** Two Georgia Google Calendar relocations were queued on 2026-08-23 with live feeds
carrying real events, and both were rejected at the last moment: `cairolibrary.org` is Cairo,
**New York** and `thomsonlibrary.org` is Thomson, **Illinois**. Confirm the institution, not
just the platform.

**Check whether the destination family already covers it.** Of the first 8 rows with a usable
instance, **5 were already configured in their destination family.** Relocating those would
have created duplicate coverage under two scraper names. Use
`scripts/verify-coverage.js --host=<instance>`, never name matching.

## Provenance correction (2026-08-23)

An earlier version of this file showed rows like `IN | WordPress-NC | Princeton Public
Library` — an Indiana library apparently inside the North Carolina scraper. **That was an
artifact of how the worklist was built**, not a config defect: entries were matched by name
across *all* WordPress files and whichever matched first alphabetically won. Rebuilt to look
each site up inside its own scraper's file, the count of entries whose state disagrees with
their file is **0**.

## Scope

The 122 `UNVERIFIABLE` sites that matched a live, non-`urlCollision` entry in their
own `WordPress-{state}` file.

## Totals

| Verdict | Count | Meaning |
|---|---|---|
| `PLATFORM` | 30 | runs a platform we already parse — the worklist below |
| `PLAIN_HTML` | 42 | real page, no platform marker — may genuinely have no events, or a bespoke calendar |
| `UNREACHABLE` | 26 | no response on the configured URL — seed-data or a dead host |
| `EMPTY` | 15 | responds, but almost no text — a dead or JS-only shell |
| `HTTP_403` | 7 | server refuses us; may or may not be a bot block |
| `PARKED` | 1 | the domain is parked, for sale, or holding |
| `HTTP_404` | 1 | the configured URL does not exist |

## Worklist (30)

The **Instance** column is the platform tenant, e.g. `henricolibrary-va.libcal.com`. It is
the `eventsUrl` the destination config needs *and* identity evidence in its own right — a
LibCal or BiblioCommons subdomain is chosen by the institution and names it, unlike a Google
Calendar id, which is an opaque hash. A blank Instance means the page references the platform
but the tenant is not in the served HTML; that needs a browser or a closer look.

### libraryaware → (none — newsletter tool, not a calendar)  (7)

| State | Currently in | Library | Instance | URL |
|---|---|---|---|---|
| CT | `WordPress-CT` | Thomaston Public Library | — | https://thomastonlibrary.org/ |
| CT | `WordPress-CT` | Waterbury Public Library | — | https://bronsonlibrary.org |
| KY | `WordPress-KY` | Bullitt County Public Library | — | https://bcplibrary.org/ |
| MA | `WordPress-MA` | Athol Public Library | — | https://www.athollibrary.org/ |
| MA | `WordPress-MA` | Joshua Hyde Public Library | — | https://www.sturbridgelibrary.org |
| PA | `WordPress-PA` | Moores Memorial Library | — | https://www.christianalibrary.org |
| WV | `WordPress-WV` | Berkeley County Public Library | — | https://bcpls.org/ |

### libcal → LibCal-{ST}  (5)

| State | Currently in | Library | Instance | URL |
|---|---|---|---|---|
| CT | `WordPress-CT` | Bridgeport Public Library | `bportlibrary.libcal.com` | https://www.bportlibrary.org |
| CT | `WordPress-CT` | Wethersfield Public Library | `api3.libcal.com` | https://www.wethersfieldlibrary.org/ |
| NC | `WordPress-NC` | Graham Public Library | `alamancelibraries.libcal.com` | https://library.alamancecountync.gov/ |
| RI | `WordPress-RI` | George Hail Free Library | `oslri.libcal.com` | https://www.georgehail.org/ |
| VA | `WordPress-VA` | Henrico County Public Library | `henricolibrary-va.libcal.com` | https://www.henricolibrary.org |

### assabet → Assabet-NH-MA  (5)

| State | Currently in | Library | Instance | URL |
|---|---|---|---|---|
| CT | `WordPress-CT` | Danbury Public Library | — | https://danburylibrary.org/ |
| CT | `WordPress-CT` | Old Lyme - Phoebe Griffin Noyes Library | — | https://www.oldlymelibrary.org |
| MA | `WordPress-MA` | Acton Memorial Library | — | https://www.actonmemoriallibrary.org |
| MA | `WordPress-MA` | Amesbury Public Library | — | https://www.amesburylibrary.org |
| MA | `WordPress-MA` | Andrews Branch Library | — | https://www.newburyportlibrary.org |

### civicplus → CivicEngage-Libraries  (4)

| State | Currently in | Library | Instance | URL |
|---|---|---|---|---|
| CT | `WordPress-CT` | Norwalk Public Library | — | https://norwalkpl.org |
| CT | `WordPress-CT` | Trumbull Library | — | https://www.trumbull-ct.gov/ |
| NC | `WordPress-NC` | Lowell Branch Library | — | https://gastonlibrary.org/ |
| NC | `WordPress-NC` | Margaret Little Blount Library | — | https://www.sheppardlibrary.org/ |

### google-calendar → GoogleCalendar-Libraries  (3)

| State | Currently in | Library | Instance | URL |
|---|---|---|---|---|
| NC | `WordPress-NC` | Claremont Branch Library | — | https://www.catawbacountync.gov/county-services/library/ |
| PA | `WordPress-PA` | Union Library Company Of Hatborough | — | https://www.hatborolibrary.org |
| VT | `WordPress-VT` | Cobleigh Public Library | — | https://www.cobleighlibrary.org |

### tribe → WordPress-{ST} (REST feed available)  (3)

| State | Currently in | Library | Instance | URL |
|---|---|---|---|---|
| AL | `WordPress-AL` | Montgomery City-County Public Library | — | https://www.mccpl.lib.al.us |
| CT | `WordPress-CT` | Harwinton Public Library | — | https://www.harwintonlibrary.org |
| SC | `WordPress-SC` | Abbeville County Library System | — | https://abbevillecounty.org |

### communico → Communico-{ST}  (2)

| State | Currently in | Library | Instance | URL |
|---|---|---|---|---|
| AL | `WordPress-AL` | Homewood Public Library | `homewood.libnet.info` | https://www.homewoodpubliclibrary.org |
| CT | `WordPress-CT` | Hartford Public Library | `hplct.libnet.info` | https://www.hplct.org/ |

### bibliocommons → BiblioCommons-{ST}  (1)

| State | Currently in | Library | Instance | URL |
|---|---|---|---|---|
| NC | `WordPress-NC` | Matthews Branch Library | `cmlibrary.bibliocommons.com` | https://www.cmlibrary.org/ |

## Resolved on the 2026-08-23 pass

**Relocated, instance proven live over plain HTTP before wiring** (no Chrome — a rotation was
running, and `node:http` reaches these fine):

| Library | To | Instance | Proof |
|---|---|---|---|
| Henrico County Public Library (VA) | `LibCal-VA` | `henricolibrary-va.libcal.com` | HTTP 200, title "LibCal - Henrico County Public Library", 50 event cards |
| Wethersfield Public Library (CT) | `LibCal-CT` | `wethersfieldlibrary.libcal.com` | HTTP 200, title "LibCal - Wethersfield Library", 38 event cards |

**Removed as genuinely redundant**, each proven with `verify-coverage.js` on the source_url
host with the audited scraper excluded from its own evidence:

| Library | Covered by | Evidence |
|---|---|---|
| Matthews Branch Library (NC) | `BiblioCommons-NC` | 102 rows on `cmlibrary.bibliocommons.com`, 18 under venue "Matthews" |
| Homewood Public Library (AL) | `Communico-AL-homewood` | rows on `homewood.libnet.info` |

**Deliberately NOT actioned**, and why:

| Library | Finding |
|---|---|
| Hartford Public Library (CT) | `verify-coverage` says **INCONCLUSIVE**, not covered. Its 80 rows on that host are its **own**, stored under the drifted name `wordpress-CT`. The entry is working; its `UNVERIFIABLE` verdict is stale. |
| George Hail Free Library (RI) | Its instance `oslri.libcal.com` is the **Ocean State Libraries consortium**, listing East Providence, Greenville and others. Wiring it under one library's name would attribute a whole consortium's events to George Hail. Needs a consortium-aware decision. |
| Graham Public Library (NC) | `alamancelibraries.libcal.com` is already configured in LibCal, but that destination currently holds **0** rows. Left in place — the destination is the thing to fix. |
| Bridgeport Public Library (CT) | Same shape: `bportlibrary.libcal.com` configured in LibCal-CT, 0 rows. Left in place. |
| Beatties Ford Road Branch (NC) | Same `cmlibrary.org` URL as Matthews, but no row under that venue in the BiblioCommons window. An absence is not proof of coverage, so it stays as an explained gap. |

The Hartford case is the important one to remember: the first, ad-hoc version of the coverage
check compared scraper names **case-sensitively**, counted `wordpress-CT`'s own rows as
third-party evidence, and would have had me delete a working entry. `verify-coverage.js`
normalizes case correctly, and was hardened the same day so a **renamed** form of the audited
scraper (`Family-ST` → `Family-ST-siteslug`) also counts as its own evidence.
