# Assabet relocation worklist — COMPLETED 2026-09-06

> **STATUS: DONE.** All 22 were worked the same day this list was written. **18 were
> relocated to `Assabet-NH-MA` and proven live at 1,075 database rows**; the other 4
> were deliberately NOT wired and the reasons are below. Assabet went 3,431 → 4,528
> rows and 52 → 72 distinct venues. The table is kept as the record of what was
> checked, not as outstanding work.
>
> **Two were duplicates caught only by SLUG**, after a name check had passed them as
> new coverage — Andrews Branch → `newburyportpl` (already configured as Newburyport
> Public Library) and Hampton Lane Memorial → `hampton` (already configured as Lane
> Memorial Library). Their WordPress entries were guarded rather than relocated.
>
> **Two have no calendar at all**: `lakevillelibrary` and `somersetpubliclibrary`
> both return HTTP 200 at their instance root, correctly titled, but 404 on
> `/calendar/` and expose no internal links. They run Assabet for their SITE and not
> their EVENTS, so there is nothing to relocate to. **Both remain open coverage gaps**
> and neither was wired: an entry that cannot return an event is worse than an
> acknowledged gap.
>
> **The naming question in this file was decided: the key stays `Assabet-NH-MA`.**
> It now spans MA, NH, RI, ME, NY and NJ, so the name understates it — but this
> scraper writes ONE `scraper_name` for every site, so the key IS the scraper_name on
> all 4,528 rows, and renaming would churn attribution fleet-wide for a cosmetic gain.
> `state: 'Multi'` already carries the truth. Revisit only if the COLLAPSED
> constraint is lifted.
>
> **Wiring these exposed a bug in the shared save helper**, not in this list:
> `findLibraryForEvent()` let a weak city match on an earlier library beat an exact
> name match on a later one, so 33 Dover **MA** events were stored as Dover **NH**.
> Fixed with three ordered passes, covered by `scripts/test-library-matching.js`, and
> the 33 rows repaired. See `SCRAPER-FIX-LOG.jsonl` 2026-09-06.


Generated while working down the `UNVERIFIABLE` backlog. Regenerate the evidence with
`node scripts/recheck-unverifiable-http.js`; do not hand-edit the table.

## What this is

43 libraries sitting in `WordPress-{state}` configs serve **`assabetinteractive.com`**
markup. A WordPress DOM extractor cannot read an Assabet calendar, which is why every one
of them carried the verdict *"rendered fully but shows no dated events"* — the fetch was
never the problem.

**21 of the 43 were already configured in `Assabet-NH-MA`.** Those were live duplicates:
two scrapers pointed at one library. Their WordPress entries were guarded on 2026-09-06
rather than relocated, because relocating an already-covered library double-scrapes one
calendar under two scraper names. That check is the one `reports/platform-mismatches.md`
records as having caught 5 of the first 8 candidate relocations.

**The remaining 22 below are genuine new coverage.** They are not in the Assabet config in
any form.

## Read this before wiring any of them

**A platform marker proves the platform is REFERENCED, not that it holds this library's
events.** Nothing below has had its Assabet feed opened yet. Two Georgia Google Calendar
relocations were queued on 2026-08-23 with live feeds carrying real events and both were
rejected at the last moment because the institution was in the wrong state. Confirm the
institution from its own page — street address, ZIP, phone area code — and confirm the
feed returns real dated events, before adding an entry.

**Assabet serves ONE MONTH PER PAGE and a bare `/calendar/` redirects to the current
month.** The scraper's `monthUrlsFor()` builds `MONTHS_AHEAD=3` month URLs per library
from the documented `/calendar/YYYY-monthname/` pattern. That fix landed 2026-09-03 after
97% of the scraper's output was being discarded as past events; do not add an entry with a
bare `/calendar/` URL.

**Five of the 22 are outside NH and MA** — ME 1, NY 3, NJ 2. The scraper is registered
`state: 'Multi'` so this works, but the registry key `Assabet-NH-MA` would then understate
its coverage. Decide whether to rename the key (which changes attribution and leaves old
rows under the old name until they expire) or to accept the misleading name, before wiring
those five. That is a judgement call, not a mechanical step.

## The 22

| Currently in | Library | URL |
|---|---|---|
| `WordPress-MA` | Dover Town Library | https://dovertownlibrary.org |
| `WordPress-MA` | G. A. R. Memorial Library | https://westnewburylibrary.org/ |
| `WordPress-MA` | Andrews Branch Library | https://www.newburyportlibrary.org |
| `WordPress-MA` | Edgartown Free Public Library | https://www.edgartownlibrary.org |
| `WordPress-MA` | Conant Free Public Library | https://sterlinglibrary.org/ |
| `WordPress-MA` | Lakeville Free Public Library | https://lakevillelibrary.org/ |
| `WordPress-MA` | Holliston Public Library | https://hollistonlibrary.org/ |
| `WordPress-MA` | Medfield Memorial Library | https://www.medfieldpubliclibrary.org |
| `WordPress-MA` | Jonathan Bourne Public Library | https://www.bournelibrary.org |
| `WordPress-MA` | Leicester Public Library | https://www.leicesterlibrary.org |
| `WordPress-MA` | Leominster Public Library | https://www.leominsterlibrary.org/ |
| `WordPress-MA` | Millbury Public Library | https://www.millburylibrary.org/ |
| `WordPress-MA` | Ipswich Public Library | https://www.ipswichlibrary.org |
| `WordPress-MA` | Somerset Public Library | https://www.somersetpubliclibrary.org |
| `WordPress-MA` | Topsfield Town Library | https://www.topsfieldlibrary.org |
| `WordPress-ME` | Kennebunk Free Library | https://kennebunklibrary.org/ |
| `WordPress-NH` | Hampton Lane Memorial Library | https://www.hampton.lib.nh.us |
| `WordPress-NY` | Seaford Public Library | https://seafordlibrary.org/ |
| `WordPress-NY` | Locust Valley Library | https://www.locustvalleylibrary.org |
| `WordPress-NY` | Baldwin Public Library | https://www.baldwinpl.org |
| `WordPress-NJ` | Boonton Holmes Public Library | https://www.boontonlibrary.org |
| `WordPress-NJ` | Ridgewood Public Library | https://ridgewoodlibrary.org/ |

**One name worth flagging: `Medfield Memorial Library`.** Its URL was corrected within
`WordPress-MA` on 2026-09-03 after `medfieldlibrary.org` was found to 301 to
`medfieldpubliclibrary.org`. That correction was right about the host and is now shown to
have been incomplete about the platform — the corrected host serves Assabet, so the entry
still cannot work where it sits. Its `REDIRECT-SLICE-RELOCATIONS-UNRUN` pending item
expects a nonzero "Found N events" for it and will keep reading 0 until this relocation
happens.

**`Baldwin Public Library` also appears in the zero-event population under `LibCal-NY2`**
with a settled `MATCHES` verdict from an earlier cycle ("LibCal day view renders with empty
search results"). Two different scrapers hold an entry for a library whose real calendar is
Assabet. Resolve which is correct before wiring, and guard the other.

## The other 68 platform mismatches found in the same pass

Recorded here so the Assabet group is not mistaken for the whole finding. Same caveat
applies to every one: the marker is a lead, not a verdict on the destination.

| Platform detected | Rows | Destination family |
|---|---|---|
| libcal | 23 | `LibCal-*` |
| librarycalendar | 18 | `LibraryCalendar-Libraries` |
| the-events-calendar | 13 | the TEC REST path in `helpers/tec-rest-helper.js`, not a new family |
| whofi | 4 | **no extractor exists** |
| libnet / LibraryMarket | 4 | `LibraryMarket-*` |
| communico | 2 | `Communico-*` |
| google-calendar | 2 | `GoogleCalendar-*` |
| bibliocommons | 1 | `BiblioCommons-*` |

**WhoFi is now at seven confirmed instances, not three.** The `WHOFI-EXTRACTOR-NEEDED`
pending note calls three "the confirmed floor" and says the real population should be
sized before building. These four (plus Seekonk MA, North Kingstown RI and the third
already recorded there) are that sizing: seven libraries, one shared extractor, and no
other route to any of them.
