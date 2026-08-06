# WordPress-NC URL Audit

Phase 1b working data for `WordPress-NC`, produced 2026-08-05.

**Method.** All 89 `WordPress-NC` config entries were checked for domain collisions against
every other `scraper-wordpress-libraries-*.js`; 79 collide with another state. Each of those 79
was matched against the official State Library of North Carolina directory
(<https://library.nc.gov/nc-libraries/library-directory>, 534 branches, dated 2026-07-13) to
find its true parent library system. All 79 matched, none ambiguous. Systems were then checked
against the rest of the scraper fleet.

**Trust rule applied.** Coverage counts as real only if it comes from a *platform* scraper
(LibCal / BiblioCommons / Communico / CustomDrupal / LibraryCalendar), whose URLs are curated
per platform. Coverage found only in another `wordpress-libraries-*.js` file does NOT count —
that is the same generated seed data, and several of those are demonstrably wrong themselves
(e.g. Wayne County Public Library is configured as `jesuplibrary.org`, which is in Georgia).

**Group A** — branch of a system already covered by a platform scraper. These entries are
duplicates carrying a fabricated URL. Recommended action: remove from `WordPress-NC`, after
confirming the platform scraper returns events for that specific branch.

**Group B** — system not covered anywhere else. These need a real URL researched and verified
live before saving. Never save an unverified domain.

=== A: branch of a system ALREADY covered by a platform scraper ===
    entries: 24 | systems: 16
  Alamance County Public Libraries  [LibCal-NC (48 events in last audit)]
      Alamance County Public Library, Graham Public Library
  Brunswick County Library  [LibCal-NC (10)]
      Leland Branch Library, Brunswick County Library
  Charlotte Mecklenburg Library  [BiblioCommons]
      Beatties Ford Road Branch Library, Matthews Branch Library
  Cleveland County Library System  [BiblioCommons + LibCal]
      Cleveland County Memorial Library
  Craven-Pamlico Regional Library  [LibCal-NC (0 — unverified)]
      Havelock-Craven County Public, Craven-Pamlico-Carteret Regional Library
  Cumberland County Public Library  [LibCal + LibraryCalendar]
      Bordeaux Branch Library, Spring Lake Branch
  Durham County Library  [LibCal-NC (20)]
      Bragtown Branch Library
  Gaston County Public Library  [LibCal-NC (20)]
      Belmont Branch Library, Dallas Branch Library, Lowell Branch Library, Stanley Branch Library
  Greensboro Public Library  [CustomDrupal]
      Blanche Benjamin Branch Library
  Henderson County Public Library  [LibCal-NC (5)]
      Henderson County Public Library
  Iredell County Library  [LibCal-NC (48)]
      Harmony Branch Library
  Madison County Public Library  [BiblioCommons]
      Madison County Public Library
  New Hanover County Public Library  [LibCal-NC (20)]
      Myrtle Grove Branch
  Rowan Public Library  [CustomDrupal]
      Rowan Public Library
  Union County Public Library  [LibCal-NC (25)]
      Union County Public Library
  Wake County Public Libraries  [Communico + LibCal]
      Cary Branch Library

=== B: system NOT covered elsewhere — needs a real verified URL ===
    entries: 55 | systems: 35
  Albemarle Regional Library
      Lawrence Memorial Library
  Appalachian Regional Library
      Watauga County Public Library
  Beaufort-Hyde-Martin Regional Library
      Hazel W. Guilford Memorial Library, Bath Community Library
  Buncombe County Public Libraries
      Fairview Branch Library, Leicester Branch Library
  Cabarrus County Public Library
      Cabarrus County Public Library, Harrisburg Library
  Caldwell County Public Library
      Hudson Branch Library
  Carteret County Public Library
      Newport Public Library
  Catawba County Library
      Claremont Branch Library, Catawba County Library
  Davidson County Public Library System
      Davidson County Public Library System
  Duplin County Library
      Florence Gallier Library, Warsaw-Kornegay Public Library
  Fontana Regional Library
      Macon County Public Library
  Granville County Library System
      Berea Branch Library
  Halifax County Library System
      Halifax County Library System, Littleton Public Library (Wc Jones Memorial)
  Harnett County Public Library
      Erwin Public Library
  Haywood County Public Library
      Canton Branch Library
  Hocutt Ellington Memorial Library
      Hocutt Ellington Memorial Library
  Lincoln County Public Library
      Florence S. Shanklin Branch Library
  McDowell County Public Library
      Mcdowell County Law Library
  Mooresville Public Library
      Mooresville Public Library
  Neuse Regional Library
      La Grange Branch Library, Maysville Public Library
  Northwestern Regional Library
      Boonville Community Public Library, Danbury Public Library, Alleghany County Public Library
  Pender County Public Library
      Hampstead Branch Library
  Pettigrew Regional Library
      Tyrrell County Library
  Polk County Public Libraries
      Polk County Public Library, Saluda Branch Library
  Public Library Of Johnston County & Smithfield
      Mary Duncan Public Library, Princeton Public Library, Selma Public Library, Public Library Of Johnston County Smithfield
  Randolph Public Library
      John W. Clark Public Library, Liberty Public Library
  Robeson County Public Library
      Pembroke Public Library
  Rockingham County Public Library
      Madison Branch Library
  Sampson-Clinton Public Library
      J.C. Holliday Library
  Sandhill Regional Library System
      Moore County Library, Pinebluff Public Library, Robbins Area Branch, Leath Memorial Library, Montgomery County Library
  Sheppard Memorial Library
      Margaret Little Blount Library, Carver Branch Library
  Stanly County Public Library
      Norwood Branch Library
  Warren County Memorial Library
      Warren County Memorial Library
  Wayne County Public Library
      Wayne County Public Library, Fremont
  Wilson County Public Library
      Black Creek Branch Library, East Branch Library

---

## Branch-level verification of Group A (2026-08-05)

Queried the `events` table (NC only, columns `venue, scraper_name, city`, paginated with
`.order('id')` before `.range()`). 6,273 NC rows, of which **824** come from library scrapers
across 19 distinct `scraper_name` values.

**Headline: branch-level verification is largely INCONCLUSIVE, and that is itself the finding.**
Platform scrapers record `venue` as a *room* ("Rourk Meeting Room (rear half)", "Children's
Room", "STEAM Lab") or as the bare system name, not as the branch. Gaston County Public Library
has 10 rows whose venue is literally "Branch Library". So a branch not appearing by name is not
evidence it is uncovered.

Two matching passes were run. The first matched each branch against all NC venues and produced
false positives — "Cary Branch Library" matched "Cary Night Market VI" (FestivalGuides),
"Graham Public Library" matched "John Graham Gym" (a park in Warrenton), "Alamance County Public
Library" matched "Barnes & Noble Alamance Crossing". Those are not coverage. The second pass
restricted candidates to each system's own library scraper first.

### Branch-level confirmed (4)
| Branch | Matched venue | Via |
|---|---|---|
| Bragtown Branch Library | "Bragtown Branch Library (3200 Dearborn Dr)" | Durham County Library |
| Leland Branch Library | "Leland Meeting Room" | Brunswick County Public Library |
| Brunswick County Library | "Brunswick County Public Library" | Brunswick County Public Library |
| Union County Public Library | "Union West Meeting Room" | Union County Public Library |

### Systems with NO library-scraper output at all — "covered elsewhere" is FALSE
These produce zero library events in the database. The 6 entries below must move to **Group B**
and get a real URL; deleting them as redundant would have silently dropped the library entirely.

| System | Entries affected | What the DB actually shows |
|---|---|---|
| Cleveland County Library System | Cleveland County Memorial Library | 0 rows |
| Craven-Pamlico Regional Library | Havelock-Craven County Public, Craven-Pamlico-Carteret Regional Library | 0 rows |
| Madison County Public Library | Madison County Public Library | 0 rows |
| Greensboro Public Library | Blanche Benjamin Branch Library | only BarnesNoble-Eastern rows |
| Wake County Public Libraries | Cary Branch Library | only Macaroni Kid Wake Forest rows |

### Systems with real library output — system-level coverage proven (18 entries)
Alamance (33 rows), Brunswick (12), Charlotte Mecklenburg (31), Cumberland (25), Durham (15),
Gaston (10), Henderson (6), Iredell (6), New Hanover (20), Rowan (23), Union (14).

Deleting these 18 rests on system-level evidence plus the assumption that a system calendar
covers its branches. That assumption is now *better supported* — we know each system's scraper
really does emit events — but it was not directly provable, because the DB does not record
branch granularity. Decision deferred to the owner.

**Revised Group A/B split: 18 deletable (pending decision), 6 reclassified to Group B.**
Group B therefore grows from 55 to 61 entries.

---

## REVERSAL — Group A must NOT be deleted (2026-08-05, later same day)

The earlier recommendation to delete 18 Group A entries is **withdrawn**. It rested on two
errors, both found by challenging the method rather than the conclusion.

**Error 1 — circular evidence.** "Bragtown Branch Library" was reported as covered by another
scraper. That venue string is produced by `wordpress-NC` itself, the scraper under audit.
`Durham County Library` as a `scraper_name` holds exactly **1** event row, not the 15 counted;
the rest matched on venue-name tokens. The audited scraper's own output was used to prove it
was redundant.

**Error 2 — scrape-time counts mistaken for coverage.** Group A was justified with figures like
"LibCal-NC (48 events)". Those come from `LIBRARY-SITE-AUDIT.md`'s FOUND column, which measures
what a page displayed at scrape time, not what survived dedup, filtering and expiry into the
database. Live NC event rows per library scraper: Rowan 14, Cumberland 12, Gaston 10, Alamance 7,
Union 6, Iredell 5, New Hanover 4, Brunswick 1, Durham 1. There are **no** rows under the name
`LibCal-NC` at all — LibCal writes per-library scraper names.

Meanwhile `wordpress-NC` holds **275** NC event rows, making it the second-largest library event
producer in the state after `BiblioCommons-NC` (370). Deleting 18 of its entries because other
scrapers hold 1–14 rows apiece is not supportable.

**Correct status: all 79 colliding entries need a real verified URL.** Group A/B is dissolved.
The only sound version of the redundancy question is host-based and is now implemented in
`scripts/verify-coverage.js`. Run against the real question it returns INCONCLUSIVE, because
`source_url` is only 62% populated on NC event rows — absence of a host cannot prove absence of
coverage below ~90%.

## NEW — the `activities` table carries the same bad seed URLs

The collision defect is not confined to event scrapers. Measured across all 52,802 activities rows:

- **280 rows** sit on a host that collides across states in the WordPress seed data
- spread over **138 distinct hosts**; **261** of the rows are library-named

Worked example: `madisonlibrary.org` has **10 activity rows in 10 different states**
(WV, CT, NC, FL, NH, AL, ME, NJ, GA, MS). One real library, ten venue records. Others:
`greenvillelibrary.org` 7 rows / 7 states, `berlinlibrary.org` 6 / 6, `marionlibrary.org` 6 / 6.

Direct example found while testing the verifier: NC activity **"Belmont Branch Library"** carries
`source=https://smcl.org/` — San Mateo County Library, California.

This is arguably worse than the event-side defect: events expire, venue records persist. Phase 1b
must therefore cover `activities` as well as the WordPress event configs.

---

## Still to check — the 9 non-colliding NC entries (added 2026-08-06)

Phase 2 only examined the 79 entries whose domain collides across states. The other 10 were
skipped because their domain is unique in the fleet — which is weak evidence the URL is right,
and **no evidence at all** that the library is real or that the domain belongs to it. Every one
still carries the `{city}library.org` signature of the same generator.

Pettigrew Regional Library was the 10th and is already fixed. These 9 remain unverified:

| Library | City | Configured domain | Note |
|---|---|---|---|
| Bunn Branch Library | Bunn | `bunnlibrary.org` | generator-shaped |
| Dobson Community Library | Dobson | `dobsonlibrary.org` | generator-shaped |
| Farmville Public Library | Farmville | `farmvillelibrary.libguides.com` | LibGuides — not generator-shaped, likely real |
| Hickory Public Library | Hickory | `hickorylibrary.org` | generator-shaped |
| Union West Branch Library | Indian Trail | `indiantraillibrary.org` | generator-shaped |
| King Public Library | King | `kinglibrary.org` | plausible — King is a real Northwestern Regional branch |
| Franklin County Library | Louisburg | `louisburglibrary.org` | generator-shaped |
| Roanoke Rapids Public Library | Roanoke Rapids | `roanokerapidslibrary.org` | generator-shaped |
| Star Branch | Star | `starlibrary.org` | Star is a real Sandhill Regional branch |

Treat these exactly like the colliding ones: confirm the institution, city and state live before
saving, and match each to its parent system via the State Library of NC directory. A non-colliding
guessed domain is still a guess — it just happens no other state has a town by that name.

**NC is therefore 30 of 88 done, not 30 of 79.** (89 entries minus the removed Hightower-equivalent
is not applicable here; NC still has 89 entries, of which 30 are verified and 59 are not.)
