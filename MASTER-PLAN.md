# FunHive Scraper Master Plan

**Created 2026-08-05.** Supersedes `SCRAPER-BUG-FIX-PLAN.md` and `SCRAPER-NAMING-PLAN.md`,
whose content is folded in below. Working data stays in `reports/nc-url-audit.md`; per-scraper
notes stay in `reports/fix-notes.json` (surfaced in the Fix queue tab of the site report).

Canonical conventions live in `CLAUDE.md`. This file is the *plan*, not the rulebook.

---

## 1. Situation

A live-verification pass confirmed **63 scraper bugs** — sites visited, scraper contradicted:
**37 zero-event** (site has events, scraper found none) and **26 age-detection**. 58 of the 63
are in the `WordPress-{state}` family.

Investigating them exposed four deeper defects. The 63 are partly a *symptom*.

| # | Defect | Measured | Status |
|---|---|---|---|
| **A** | **URL collisions** — seed data guessed `{city}library.org` from the city name | Was 347 hosts / **1,072 entries**. Now 249 hosts / **787 entries**: 234 removed on live evidence, 924 contaminated DB rows deleted | 🔨 **Largely fixed 2026-08-09** — 210 identified-not-acted remain |
| **B** | **Fabricated counties** — generator appended `" County"` to the city | Was **2,948 entries** failing `getCountyCentroid()` fleet-wide (WordPress-* only 4.3% resolving). Now **57**, i.e. 98.4% resolve | ✅ **FIXED 2026-08-09** |
| **C** | **Naming drift** — `scraper_name` cannot join to the registry | **291 of 434** names drift | Documented + detector built |
| **D** | **Missing `source_url`** — no provenance to verify against | MacaroniKid fixed (11,467 rows); 42 families unmeasured until all groups rotate | Partly fixed |

**Contamination is not limited to event scrapers.** The `activities` table carries the same
fabricated URLs: **280 rows on 138 colliding hosts**, 261 library-named. `madisonlibrary.org`
exists as 10 venue records in 10 states. Venue rows persist where events expire.

### Defect E — orphaned scrapers (found 2026-08-06)

**30 scraper files on disk are referenced by no registry entry, so they never run.** They are
not stubs: several pass `node -c`, carry full config arrays, and have been maintained by later
commits. Nothing surfaces them — health reporting iterates the registry, so a file the registry
does not mention is invisible.

Swept in full. Most duplicate registered coverage, but **13 library systems in active states
have zero library-scraper rows and exist only in an orphaned file**:

| File (unregistered) | Uncovered systems |
|---|---|
| `scraper-libcal-libraries-va.js` | Prince William, Newport News, Hampton, Roanoke, Suffolk, Williamsburg Regional, **Library of Virginia** |
| `scraper-libcal-libraries-fl.js` | Volusia County, Osceola, Leon County, Manatee County |
| `scraper-libcal-libraries-md.js` | Kent County *(fixed 2026-08-06)* |
| `scraper-librarymarket-libraries-md.js` | Ruth Enlow / Garrett County *(fixed 2026-08-06)* |

Prince William's LibCal was verified live with dated August 2026 events. The registered shared
LibCal file contains none of the VA systems, so registering the orphan adds coverage rather than
duplicating it.

**Registering them is not mechanical.** Each needs a new registry key (`LibCal-VA2` / `LibCal-FL2`,
following the existing `LibCal-NY1`/`NY2` precedent), a `SCRAPER_NAME` corrected from `libcal-VA`
to the registry key, and a first run watched — these have never executed in production.

Also note `scraper-miami-dade-library-FL.js` configures 8 Miami-Dade branches and never runs,
while the parent system *is* configured in `WordPress-FL` yet produces zero library rows. Fix the
parent before adding branches.

## 2. The governing dependency

> **URLs must be correct before any selector work.**

In the worst-affected scrapers 67–90% of configured URLs may point at another state's library.
Broadening extraction there does not recover events — it ingests the wrong library's events
under the wrong name and state, turning a *visible* zero into *invisible* wrong data.

This is why Phases 3 and 4 are blocked. It is the single most important constraint here.

---

## 3. Scraper inventory — all 169 active

Recomputed with `isScraperActive()`. **153 event scrapers across 361 sites, 16 venue scrapers.**
The 93 registered-but-inactive entries are out of scope by design.

### 3.1 Venue scrapers — 16

*Venue scrapers.* They write to `activities`, not `events`. Listed for completeness only; no
further planning info applies.

`VenueList-ArtStudios-DMV`, `VenueList-BowlingAlleys-DMV`, `VenueList-ChildrensMuseums-DMV`,
`VenueList-ClimbingGyms-DMV`, `VenueList-Eastern-US`, `VenueList-FamilyEntertainment-DMV`,
`VenueList-GymnasticsCenters-DMV`, `VenueList-IceRinks-DMV`, `VenueList-IndoorPlaygrounds-DMV`,
`VenueList-MinigolfBatting-DMV`, `VenueList-MovieTheaters-DMV`, `VenueList-NatureFarms-DMV`,
`VenueList-RollerSkating-DMV`, `VenueList-ScienceDiscovery-DMV`, `VenueList-SwimmingPools-DMV`,
`VenueList-TrampolineNinja-DMV`

> One caveat: these are *hand-curated hardcoded venue lists*, not live discovery. A new venue
> never appears until someone adds it. Automated OSM discovery was attempted twice and
> abandoned; do not revive either attempt. Separately, the `activities` contamination in §1
> affects this table and is covered by Phase 2.

### 3.2 Event scrapers — 153

| Family | Scrapers | Sites | Known defects |
|---|---|---|---|
| **WordPress-{state}** | 21 | 21 | **A, B, C** + 56 of the 63 bugs. Worst collisions: NC 90%, VT 72%, CT 68%, TN 67%. CT/VT also use a narrower 3-selector list vs 6 in siblings |
| **MacaroniKid-\*** | 20 | **228** | **D fixed 2026-08-05** (listing URL + per-site names). No known URL collisions — subdomains are real |
| **LibCal-\*** | 19 | 19 | **C** (free-text per-library names, e.g. `BCCLS - Bergen County…`). Dead domains found (Memphis). Writes per-library `scraper_name` |
| **Communico-\*** | 16 | 16 | Dead `libnet.info` domains (NJ, SC partly resolved). **C** |
| **Regional aggregators & venue-events** | 16 | 16 | **D** — `Venue-Events-ZoosAquariums` has no URL of any kind (251 rows) and 2 age-detection bugs. Also a clean **C** example: it writes `scraper_name = "ZooAquariums-Eastern"`, which matches no registry key |
| **Parks & Rec** | 12 | 12 | **D** — `CivicRec-Parks-Eastern` 1,742 rows with no `source_url` *and* no `url`. `RecDeskParks-*` naming FORMAT_DRIFT |
| **LibraryMarket-\*** | 7 | 7 | **C, D** |
| **BiblioCommons-\*** | 5 | 5 | **C, D** |
| **Single-system libraries & other** | 37 | 37 | Mixed. `CustomDrupal-Libraries` reports 356 found / 0 stored. `Orange-County-Library-FL` naming drift + 3 age bugs |

**Full lists** (so nothing is implicit):

- **WordPress-{state}** (21): AL, CT, DE, FL, GA, KY, MA, MD, ME, MS, NC, NH, NJ, NY, PA, RI, SC, TN, VA, VT, WV
- **MacaroniKid-\*** (20): AL, CT, DC, DE, FL, GA, KY, MA, MD, ME, NC, NH, NJ, NY, PA, RI, SC, TN, VA, WV
- **LibCal-\*** (19): CT, DE, FL, GA, KY, MA, ME, NC, NH, NJ, NY1, NY2, PA, RI, SC, TN, VA, VT, WV
- **Communico-\*** (16): AL, DC, FL, GA, KY, MA, MD, NC, NH, NJ, NY, PA, SC, TN, VA, WV
- **LibraryMarket-\*** (7): `LibraryMarket`, CT, GA, `ME-NH-MA`, NC, PA, SC
- **BiblioCommons-\*** (5): GA, MA, NC, NJ, VA
- **Parks & Rec** (12): `AARecParks-MD`, `ActiveNet-Parks-Eastern`, `CivicRec-Parks-Eastern`,
  `Drupal-Parks`, `Fairfax-Parks`, `Localist-Parks`, `Montgomery-Parks`, `NPS-Parks`,
  `PG-Parks`, `RecDesk-Parks`, `State-Parks-Events`, `WordPressTec-Parks`
- **Regional aggregators & venue-events** (16): `BarnesNoble-Eastern`, `ChildrensTheater-Eastern`,
  `Eventbrite-Family-Eastern`, `FairsFestivals-Eastern`, `Farms-Eastern-US`, `FestivalGuides-Eastern`,
  `Festivals-Eastern-US`, `Gardens-Nature-Eastern`, `KidsOutAndAbout-DMV`, `KidsOutAndAbout-Eastern`,
  `Patch-Community-Eastern`, `Simpleview-Tourism-Eastern`, `Venue-Events-ChildrensMuseums`,
  `Venue-Events-ScienceArts`, `Venue-Events-ZoosAquariums`, `YMCA-Community-Eastern`
- **Single-system libraries & other** (37): `AACPL`, `Allentown-Public`, `Assabet-NH-MA`,
  `Berks-County`, `Brooklyn-Library`, `Cecil-County`, `CivicEngage-Libraries`,
  `CustomDrupal-Libraries`, `Dorchester-County`, `Drupal-Pennsylvania`, `Drupal-Virginia`,
  `EventActions-Libraries`, `EventON-Lexington`, `FreeLibrary-Philadelphia`,
  `FullCalendar-Libraries`, `Graniculator-Morris`, `Howard-County`, `Intercept-Camden`,
  `LibraryCalendar-Libraries`, `Louisville-Library`, `Nashville-Library-TN`,
  `Orange-County-Library-FL`, `PortDiscovery-MD`, `Pratt-Library`, `Prince-Georges-County`,
  `Rockbridge-Regional`, `RollyPollies-MD`, `Somerset-County`, `SportsEngine-Youth-Eastern`,
  `Squarespace-Libraries`, `Tockify-Horry`, `Trumba-Spartanburg`, `Westmoreland-Library`,
  `Wicomico-Public`, `WithApps-Libraries`, `WordPress-Abbe-Regional`, `WordPress-Events-Calendar`

---

## 4. Phases

### Phase 0 — Guardrails ✅ DONE
Branch `fix/scraper-bugs-2026-08`. Age-detection baseline recorded passing. Nothing under
`src/**`, `public/**`, `next.config.*`, `package.json` is touched — those auto-deploy to Vercel.

### Phase 1 — Confirmed wrong domains ✅ DONE
Pettigrew Regional Library (was a Michigan library) repointed and verified live. Hightower
Memorial Library removed — its URL served a Nebraska library and no real site exists; recorded
as a coverage gap rather than replaced with a guess.

### Phase 2 — Seed-data remediation 🔨 IN PROGRESS — *the main body of work*

> **Defect B (counties) is DONE as of 2026-08-09 and is no longer part of the per-file pass.**
> It was fixed data-first rather than file-by-file, because "do not guess counties one at a
> time" was always the constraint. Two stages:
> 1. `scrapers/utils/county-centroids.js` completed from the **US Census 2023 National
>    Counties Gazetteer** — 436 hand-entered values kept, 2,801 added, now all 3,222 US
>    counties. This alone resolved 939 entries whose county name was already correct but
>    missing from the dataset.
> 2. `scripts/fix-fabricated-counties.js` rewrote 1,931 fabricated `"<City> County"` values
>    across 34 files using a **Census + GeoNames** city→county join
>    (`scripts/data/city-county-map.json`, provenance in `scripts/data/README.md`).
>
> Result: **2,948 → 57** unresolved. Step 2 of the per-file pass below is therefore already
> satisfied; only URLs (Defect A) and naming (Defect C) remain per-file.

Covers defects **A, B and C together, one file at a time.** This ordering is deliberate: fixing
naming as a separate migration would mean opening every scraper file twice. When a file is open,
fix all three.

**Per-file pass — for each scraper file:**
1. **URLs** — every entry's URL researched and **verified live** (institution, city and state
   must match) before saving. Never a guessed domain. Where no real site exists, remove the
   entry and record a coverage gap.
2. **Counties** — replace fabricated `"<City> County"` values with real counties that resolve
   via `getCountyCentroid()`. Needs a real city→county data source; do not guess individually.
3. **Naming** — bring `scraper_name` to a legal form per `CLAUDE.md`. **The site slug must
   survive**: `RecDeskParks-ccrec` → `RecDesk-Parks-ccrec`, never bare `RecDesk-Parks`.
4. `node -c`, then dry run and read the sample output.

**Order:** WordPress-{state} first, worst-collision-first (NC 90%, VT 72%, CT 68%, TN 67%), then
the remaining 17 states, then LibCal/Communico/BiblioCommons/LibraryMarket per-library names,
then the `activities` table.

**Scope note — "not colliding" does not mean "correct".** Each state file also has entries whose
guessed `{city}library.org` happens to be unique in the fleet, so the collision detector never
flags them. NC has 9 such entries. They carry the same generator signature and need the same live
verification. Counting only colliding entries understates the work in every state.

**Progress (NC):** all 79 colliding entries mapped to their 51 real parent systems via the State
Library of NC directory (534 branches), zero ambiguous. **30 of 89 entries verified and fixed**
across 10 systems; 59 remain — 50 still colliding plus the 9 non-colliding never checked. Detail
and the full to-check list in `reports/nc-url-audit.md`.

**Do not** delete an entry as "covered elsewhere" without host-based proof from
`scripts/verify-coverage.js`. An earlier attempt to delete 18 NC entries was withdrawn: it used
circular evidence and mistook scrape-time FOUND counts for database coverage.

### Phase 3 — CT/VT selector normalization ⛔ BLOCKED on Phase 2
CT and VT use `[class*="event"], article, .post`; their six siblings use six selectors including
`[class*="program"]`, `[class*="calendar"]`, `.item`. Worth up to 19 bugs — but only meaningful
once those URLs are trustworthy. Watch the INVALID column; broader selectors match more junk.

### Phase 4 — Extraction failures ⛔ BLOCKED on Phase 2
~35 remaining zero-event bugs. Probe first, bucket by markup, fix in tiers:
1. Known plugin markup (`tribe-*`, JSON-LD) — one selector fixes many.
2. Bespoke DOM — per-site override.
3. **Prose-only pages** — genuinely not extractable as dated events (e.g. "Coffee Plus Fridays
   9–11am"). Record as documented coverage gaps. Forcing these fabricates dates.

### Phase 5 — Age detection ⬜ NOT STARTED
26 bugs across 8 scrapers. Determine shared-vs-local before editing the shared path. **Run
`node scripts/test-age-detection.js` after every change** — age detection has broken three times.
Dry-run any backfill and read the samples.

### Phase 6 — `source_url` coverage ⬜ PARTLY DONE
MacaroniKid fixed. Re-measure once all three rotation groups have run post-fix; until then most
families are legitimately UNPROVEN, not broken. Separately, `CivicRec-Parks-Eastern` (1,742 rows)
and `ZooAquariums-Eastern` (251) capture **no URL of any kind** — window-independent, real now.

### Phase 7 — `CustomDrupal-Libraries` ⬜ NOT STARTED
Reported 356 found / 65 new on the 2026-08-05 run, but the database holds 0 upcoming rows.
Found → stored is broken somewhere. Not part of the 63; its own investigation.

### Phase 8 — UNVERIFIABLE backlog ⬜ NOT STARTED
331 sites came back UNVERIFIABLE (bot-blocks, JS-only calendars, TLS failures). They are
*unknown*, not good. **The true bug count is between 63 and 394.** Re-checking them is separate
work that no other phase covers.

As of 2026-08-28 the backlog is 830, and its single largest slice — **439 sites that render fully
but show no dated events** — is enumerated in `reports/renders-nothing-sites.md` and specified as
a task in **§10a/§10b**, because that slice is also Phase 10's `CONFIGURED-ZERO` population.
Work it there rather than duplicating the list here. The rest of the backlog splits roughly:
network errors 149, JS-gated shells 71, platform-mismatch relocations 55, Google Calendar iframes
20, dead endpoints 18.

### Phase 9 — Verify ⬜
`node -c` everything. Re-run by rotation group. Compare FOUND/INVALID against baseline. Re-run
Step 3d verification on fixed sites — a real fix flips `MISMATCH → MATCHES`. Merge verdicts with
`merge-verification-comments.js`. Regenerate the report; the Fix queue count is the scoreboard.

### Phase 10 — County-level coverage completeness audit ⬜ FINAL MILESTONE

**The question:** for every county in every active state, is each public library (a) covered and
producing events, (b) configured but producing nothing, (c) not configured at all, or
(d) checked and found genuinely unscrapeable? Today nobody can answer this — we know what is
configured, not what exists.

**Why this is last, and must stay last.** Coverage cannot be measured until URLs point at the
right institutions (Phase 2) and `scraper_name` joins back to the registry (Defect C). Run it
before those land and it produces a confident wrong answer — a library whose URL points at
another state looks "covered", and one whose rows carry a display name looks "missing". That is
exactly the failure that produced the withdrawn Group A recommendation. Blocked on Phases 2–8.

**Denominator — what exists.** Needs an authoritative list of every public library per county:
- Per-state library directories. North Carolina's is proven usable — 534 branches with a county
  column, already used for the Phase 2 mapping (`reports/nc-url-audit.md`).
- Where a state has no usable directory, fall back to the **IMLS Public Libraries Survey**, which
  lists every US public library with its county and a stable FSCS ID.

**Numerator — what we configure.** Every configured site across **all** library scraper families,
not just `WordPress-{state}`: LibCal, Communico, BiblioCommons, LibraryMarket, CustomDrupal,
LibraryCalendar and the single-system scrapers. Restricting to one family understates coverage
badly, since most large systems are covered by a platform scraper rather than WordPress.

**Method:**
1. Build the denominator per county per active state.
2. Build the numerator across all library families.
3. Join through the directory's own branch → system mapping, as in Phase 2. **Do not join on
   name similarity** — library names are geography, and that produced three wrong answers on
   2026-08-05.
4. Classify every library into exactly one of:
   - `COVERED` — configured, and events exist in the DB attributable by `source_url` host
   - `CONFIGURED-ZERO` — configured but producing nothing; needs a scrape-ability check
   - `NOT-CONFIGURED` — a real library nobody has added
   - `UNSCRAPEABLE` — checked, and no usable site exists (e.g. Facebook-only, like Hightower
     Memorial Library, York AL)
5. Emit `reports/coverage-by-county.md` plus a Coverage-by-county tab in the site report.

**Rules:**
- **Every library gets a row**, including unscrapeable ones — the same no-omission rule the rest
  of the report follows. A missing row and a nonexistent library must never look alike.
- `UNSCRAPEABLE` must record **why and the date checked**, so it is not re-researched every cycle.
- `COVERED` requires host evidence from `scripts/verify-coverage.js`, never a name match.
- Report per-county totals, so gaps concentrate visibly (a county with 8 libraries and 1 covered
  is a different problem from 8 counties each missing one).

**Output is a coverage number the project does not currently have:** libraries covered / libraries
that exist, per county, per state — and a defensible list of the ones deliberately not covered.

#### 10a. `CONFIGURED-ZERO` is already enumerated

Step 4's `CONFIGURED-ZERO` bucket does not need to be discovered from scratch. The population is
identified, written down, and regenerable:

- **`reports/renders-nothing-sites.md`** — every site, grouped by scraper, with city, state, the
  configured URL, and a status per row.
- **`scripts/build-renders-nothing-list.js`** rebuilds it from
  `reports/verification-comments.json`, which stays the source of truth. Do not hand-edit the
  Markdown; re-run the script. `--json=<path>` also emits the machine-readable form.
- Browsable equivalent with text/status/state filters: the **Silent Calendars** artifact,
  <https://claude.ai/code/artifact/4b1846e1-0dd1-42ae-8846-06fc5919c5a3>.

**The counts drift as verification proceeds, so treat any number here as a dated reading, not a
constant** — it moved 434 → 439 overnight between 08-28 and 08-29 as the daily run added
verdicts. As of **2026-08-29**:

| | Count |
|---|---|
| Total | 439 |
| **Open** — unguarded and present in config | **384** (379 with a URL recorded) |
| Guarded — already carries `urlCollision`, skipped at run time | 23 |
| Unresolved — audit name not matched to a config entry (`scraper_name` drift) | 32 |

Concentration, open rows only: WordPress-NY 72, MA 62, PA 54, NJ 39, ME 29, NC 21, NH 19, MS 15,
CT 12, KY 11, then a tail of fifteen scrapers at ≤8 each. Twenty states; NY/MA/PA/NJ/ME are ~68%
of the list. **96% sits in the WordPress-\* family**, which is itself the signal — see the task
below before treating any of it as a denominator.

**These are `UNVERIFIABLE`, not `MATCHES`, and the distinction is load-bearing.** Each page loads
cleanly under the scrapers' own Puppeteer stack — no timeout, no bot-block, no TLS error — and
then shows no dated events and no event containers. A page that merely renders nothing has not
*said* it has no upcoming events. Contrast the ten WordPress-NY libraries closed as MATCHES on
2026-08-27: those were closed only because the site's own TEC REST endpoint returned a literal
`total: 0`, which is an affirmative answer. None of these has given one.

#### 10b. Task — classify these sites before using them as a denominator

**Do not carry this list into the Phase 10 join as `CONFIGURED-ZERO` on its face.** A
"renders nothing" verdict describes what a verifier saw, not what the scraper does, and those two
have already diverged twice:

- **Assabet-NH-MA, 2026-08-28.** Eleven of its sites were recorded as extraction failures
  returning 0. The scraper was returning real counts the whole time — Dover 30, Derry 50,
  Somerville 120. The actual defect was that it stored the card's `H2` (day + time + room +
  branch + street address, glued) as the title while the real title sat in a sibling `H3`, and
  that it counted the sidebar filter checkboxes as events. Both verdicts and reality were wrong,
  in opposite directions.
- **Harwinton, Willimantic, Montgomery City-County, 2026-08-27.** Recorded as zero-event; all
  three were working, their verdicts simply predating the TEC helper landing in those state files.

So the classification work is:

1. **Sample before sweeping.** Take ~20 across the biggest families (NY/MA/PA/NJ/ME) and check
   each against its scraper's *most recent run output*, not against the verdict. A site the
   scraper reports a nonzero count for is a stale verdict, not a `CONFIGURED-ZERO`.
2. **Ask the site's own API where one exists.** The TEC probe on 2026-08-27 settled ten NY
   libraries in a single pass by reading `total` from `wp-json/tribe/events/v1/events`. Any site
   that answers with a number has told you which bucket it belongs in; that beats re-rendering it.
3. **Split the remainder into two buckets, and keep them separate.** `CONFIGURED-ZERO` means the
   institution genuinely publishes nothing scrapeable right now. A site whose events are visible
   but unread is an extraction bug and belongs in Phase 4, not in the coverage denominator.
4. **Only then** feed the survivors into Step 4's classification.

**Why this must not be skipped:** a mis-verdicted site entering Phase 10 as `CONFIGURED-ZERO`
produces a confidently wrong coverage number — the precise failure mode §10's "why this is last"
paragraph exists to prevent, arrived at from a different direction.

### Phase 11 — Record 🔄 ONGOING
One `SCRAPER-FIX-LOG.jsonl` line per logical fix. Update `reports/fix-notes.json`. Commit
scraper-side paths only.

---

## 5. Tooling built for this

| Script | Answers |
|---|---|
| `scripts/find-duplicate-library-urls.js` | Which domains collide across states |
| `scripts/verify-coverage.js` | Is this library covered elsewhere? Host-based, never name similarity |
| `scripts/check-scraper-names.js` | Which `scraper_name` values drift; flags COLLAPSED multi-site scrapers |
| `scripts/check-source-url-coverage.js` | Which scrapers pass a listing URL; separates MISSING from stale |
| `scripts/generate-site-report.js` | The report + Fix queue |
| `scripts/merge-verification-comments.js` | Validated verdict merges |

```bash
node scripts/find-duplicate-library-urls.js
node scripts/check-scraper-names.js
node scripts/check-source-url-coverage.js --all
node scripts/verify-coverage.js --state=NC --exclude-scraper=wordpress-NC --summary
node scripts/generate-site-report.js
```

---

## 6. Rules that came from real mistakes

Each was a live error, not a hypothetical.

- **Never collapse a multi-site scraper onto its registry key.** `scraperName: 'MacaroniKid-FL'`
  merged 31 sites; fleet-wide it would have merged 228 onto 20, re-creating the aggregation
  rejected on 2026-08-04.
- **Never set `source_url` to the event's own `url`.** `scraper-macaroni-md.js` did; every
  MacaroniKid site in every state would have shared the host `events.yodel.today`.
- **Never establish coverage by name similarity.** It scored "Cary Branch Library" against
  "Cary Night Market VI" and "Alamance County Public Library" against "Barnes & Noble Alamance
  Crossing". Library names are geography.
- **Never use a scraper's own output as proof it is redundant.** "Bragtown Branch Library" was
  declared covered using rows `wordpress-NC` had itself produced.
- **FOUND ≠ coverage.** The audit's FOUND column counts what a page displayed at scrape time,
  not what reached the database. Quoting it as live coverage overstated by an order of magnitude.
- **Absence proves nothing at low `source_url` coverage.** Below ~90%, a missing host means the
  field is unpopulated, not that the library is uncovered.
- **A rename is not retroactive.** Old rows keep the old name until they expire. `_stableEventId`
  excludes `scraper_name`, so renames cannot create duplicates.

---

## 7. Pending verification

Changes already made whose effect has **not been observed yet** are tracked **per scraper**, not
in this document and not as a page-level banner — a banner leaves the reader to work out which
rows it applies to.

- **`reports/fix-notes.json` → `_pending`**, an object keyed by scraper name with
  `{what, expect, confirm, added}`. Currently **38 scrapers**.
- Rendered as an **`awaiting` badge** on that scraper's row in the report's Coverage tab
  (searchable: filter `awaiting`), and in its Fix queue detail if it is also listed there.
- Step 3e of the daily diagnosis works through them and **deletes the key once confirmed**.

Site-level staleness needs no entry at all: the library sites table carries a per-row **Status**
column comparing the audit's recorded link against the current config — `current`, `refixed`
(URL corrected since that scrape, names the new host), or `unmatched`.

Two things deliberately do **not** live in `_pending`:

- **The scraper-name drift baseline (291 of 434)** is a global measurement, not any scraper's
  state. It belongs in `SKILL.md` Step 3f, which tells the reader that ~291 is expected and only
  a *rise* is news.
- **WordPress-NC's per-site URL changes** are shown by the `refixed` row status. Only the
  scraper-level consequence no row can show — that extraction remains unproven — is pending.

**Known limitation discovered 2026-08-05:** `scrapers/utils/county-centroids.js` holds only
**13 of North Carolina's 100 counties**. Correcting fabricated county *names* therefore will not
restore the county-centroid geocoding tier on its own — Defect **B** needs the centroid dataset
expanded as well as the names fixed. This widens Phase 2's county work beyond what §1 implies.

## 8. Progress log

| Date | Item | Result |
|---|---|---|
| 2026-08-05 | Phase 0 | Branch created; age-detection baseline passing |
| 2026-08-05 | Phase 1 | 2/2 wrong-state domains resolved and verified live |
| 2026-08-05 | Phase 3 | Halted before starting — collision rates make selector work unsafe |
| 2026-08-05 | Phase 2 (NC) | All 79 colliding NC entries mapped to 51 systems; 3 fixed |
| 2026-08-05 | Phase 2 | Group A deletion recommendation **reversed** — circular evidence |
| 2026-08-05 | Scope | `activities` found contaminated: 280 rows, 138 hosts |
| 2026-08-05 | Phase 6 | MacaroniKid listing URLs added across 44 files; per-site naming corrected |
| 2026-08-05 | Defect C | Naming rules documented in `CLAUDE.md`; conformance check added as Step 3f |
| 2026-08-05 | Inventory | All 169 active scrapers classified: 153 event, 16 venue |
| 2026-08-06 | Naming | Venue scrapers renamed `Activities-*` -> `VenueList-*`; all 16 internal SCRAPER_NAME constants aligned to their keys |
| 2026-08-06 | Phase 2 (NC) | Batch 1: 15 entries across 4 verified systems repointed + counties fixed. NC collisions 78 -> 67, fleet-wide 559 -> 554 |
| 2026-08-06 | Tracking | `_pending` added to fix-notes.json and rendered as a report banner, so post-change fallout is tracked in the tooling rather than by memory |
| 2026-08-06 | Merge | Branch merged to main and pushed (f72749d) so the scheduled diagnosis runs on main with all scripts present |
| 2026-08-06 | Phase 2 (NC) | Batch 2: 13 entries across 6 more verified systems. NC collisions 67 -> 54, fleet-wide 554 -> 550 |
| 2026-08-06 | Phase 2 (NC) | Queue corrected: 9 non-colliding NC entries were never checked, so NC is 30 of 89 verified, not 30 of 79 |
| 2026-08-06 | Phase 10 | County-level coverage completeness audit added as the final milestone, blocked on Phases 2-8 |
| 2026-08-28 | Phase 10 | `CONFIGURED-ZERO` population enumerated ahead of time and folded into §10a: render-but-show-nothing sites listed in `reports/renders-nothing-sites.md`, regenerable via `scripts/build-renders-nothing-list.js`. 439 as of 08-29, 384 of them open, 96% WordPress-\* |
| 2026-08-28 | Phase 10 | §10b added — classify those sites BEFORE using them as a denominator. Two precedents show verdict and reality diverging: Assabet-NH-MA (11 sites recorded as returning 0 were returning real counts; the defect was a glued `H2` title and filter checkboxes counted as events) and three TEC sites whose verdicts predated the helper landing |
