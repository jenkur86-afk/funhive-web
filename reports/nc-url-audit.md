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
