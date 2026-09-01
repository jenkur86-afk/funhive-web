# RecDesk junk taxonomy — working document

**Task:** SITE-IMPROVEMENT-REVIEW.md §1.1. Started 2026-08-31 (Fable session).
**This file is APPEND-ONLY**: findings, decisions and dry-run outputs accumulate here and
are never rewritten, so no reasoning step is lost even if a later step overturns it.
Corrections are added as new dated entries that reference what they correct.

---

## The problem being solved

`RecDesk-Parks` stores private facility reservations as family events. 149 of the 158
sites flagged ≥70% All-Ages in the 2026-08-31 age audit are RecDesk, and sampling shows
why: `"Practice Justin"`, `"Marysville Mitts"` ×15, `"City Employee Swimmer"`,
`"Field Prep"` — ballfield bookings by named private teams, shown to families as things
to attend. RecDesk wrote 10,409 NEW rows on 2026-08-31 alone.

The review assumed this would need a title taxonomy like the CivicRec fix (2026-08-30)
but harder, because junk and keepers share title shapes. **Phase 0 overturned that.**

## Phase 0 finding — the API discriminates; no title heuristics needed for the main cut

**2026-08-31.** `GetCalendarItems` returns an `EventType` field on every item. The
scraper already reads it (`fetchEventDetail` passes `event.EventType || 'E'`) and then
ignores it for classification. Probed live across 5 tenants (marysvilleoh, ccrec,
westhartford, wheeling, keeneparks), 2,338 calendar items:

| `EventType` | Meaning (observed) | Evidence |
|---|---|---|
| `F` | **Facility booking** — a reservation occupying a field/court/room | marysvilleoh 149/155 items are F, all team reservations ("MJBSA Practice", "Marysville Mitts", "Fall Ball"); wheeling 347/347 F ("Field Prep", "Practice Steel Valley Jen"); ccrec 1,144/1,342 F ("WRC Lacrosse", "WARC - Westminster Baseball") |
| `P` | **Program** — registered/scheduled programming | "Ranger Led Kayak Trip 9/13", "KPRD Afterschool!", "Flag Football 2nd-4th grade", "Introduction to Golf", "Chair Yoga" |

Secondary observations, recorded so they are not lost:

- **Neither type carries `EventUrl` or `Description` at list level** (0/2,338) — both come
  from the detail call. URL presence therefore does NOT discriminate; `EventType` alone does.
- **`ItemColor` differs by type within a tenant** (marysvilleoh F=#8e7cc3, P=#9900ff) but
  is tenant-configured and NOT stable across tenants — do not use it.
- **Not all F is worthless**: keeneparks has 7 F items, 3 distinct, including
  `"Amazing Race - Fundraiser"` and `"Jose Jeroes Benefit Tournament"` — public happenings
  that were *booked as facility use*. Dropping all F loses these. Adjudicated in Phase 2.
- **Not all P is family content**: westhartford's P list includes registration FORMS
  published as calendar items (`"Med Admin Authorization Form"`, `"Leisure Services
  Emergency Form"`, `"Beachland Adventure Camper Profile"`, `"Dial-A-Ride Annual
  Membership FY 27"`) — a second junk class the F/P cut does not touch. Also adult
  programming (`"Chair Yoga"`, `"Senior Shape Up"`, `"MD Wear and Carry Renewal Class"`),
  which the existing adult-only/non-family rejection in `saveEvent()` may or may not
  already catch — measured in Phase 1.
- **Stored rows do NOT have `EventType`** — it was never persisted. Backfill
  classification must therefore come from a fresh API pull matched against stored rows,
  never from title guessing. This is the central no-information-loss constraint below.

---

## The plan

### No-information-loss mechanics (govern every phase)

1. **This document is append-only.** Every measurement, decision, adjudication and
   dry-run sample lands here with a date. Overturned reasoning stays visible.
2. **Classification snapshot committed before any action.** Phase 1's API pull is saved
   as `reports/recdesk-classification-2026-08-31.json` — the ground truth (tenant, title,
   facility, EventType) *as it stood when decisions were made*. If RecDesk's semantics
   ever look different later, we can prove what we saw.
3. **No row is deleted without a positive API classification.** A stored row that cannot
   be matched to a fresh API item is left in place and counted as UNMATCHED — title
   resemblance to junk is never grounds for deletion. (Unmatched rows are mostly past
   events, which the existing past-event cleanup expires naturally.)
4. **Full pre-deletion snapshot.** Every row the backfill deletes is first written, with
   its `id` and all identifying columns, to `reports/recdesk-deleted-rows-<date>.jsonl`
   and committed. `_stableEventId` is deterministic, so restoration is a mechanical
   re-insert from this file if any classification proves wrong.
5. **Dry-run first, samples pasted here, then `--save`** — the house rule, plus a hard
   ceiling in the script that refuses to delete more rows than the dry run counted.
6. **Borderline classes are never auto-deleted.** They get a subsection here with
   evidence and an owner-facing recommendation.

### Phase 1 — Measure (read-only)

- a. Corpus: all rows under `RecDesk-Parks%` / `RecDeskParks%` names — count, distinct
  titles, per-tenant split. (Selective columns; `.order('id')` before `.range()`.)
- b. Live classification pull: `GetCalendarItems` for **all ~46 configured tenants**,
  window matching the scraper's own (today → +90d), recording
  `(slug, EventName, FacilityName, EventType, StartTimeISO8601)` → snapshot file (rule 2).
- c. Cross-tab: what fraction of *stored future* rows match F vs P vs UNMATCHED.
- d. P-side junk measurement: forms/membership titles inside P, corpus-wide counts, to
  size the Phase 3b rules.

### Phase 2 — Adjudicate (decisions recorded here)

- Class A: `EventType=F` → drop at source. Adjudicate the public-events-booked-as-F cost
  using Phase 1's full-tenant data (how many F titles look like public happenings?).
- Class B: P-side forms/memberships → anchored `isJunkTitle()` additions with negative
  controls, only if Phase 1d shows real volume.
- Class C: P-side adult programming → verify the existing adult-only path catches it;
  fix there if not, NOT with new RecDesk-specific rules.

### Phase 3 — Fix at source

- a. `transformEvent()` skips `EventType === 'F'` items, with the measured basis and the
  known cost in the comment. Counted and logged per tenant per run (`skippedFacility: N`)
  so the effect is visible in scraper output forever, not silent.
- b. Any Class B rules → `isJunkTitle()` + `scripts/test-junk-titles.js` cases including
  negative controls; suite must pass 100%.

### Phase 4 — Backfill (destructive, most-guarded step)

- `scripts/fix-recdesk-facility-rows.js` per SCRIPT-WRITING-PROMPT.md: matches stored
  future rows to the Phase 1 snapshot on (tenant slug from `scraper_name`, stripped
  title, venue, and date where available); deletes only F-matched rows; snapshot-then-
  delete per rule 4; dry-run/--save; ceiling; UNMATCHED counted and left.

### Phase 5 — Verify

- Re-run the age-audit flag computation for RecDesk sites: expect the 149-flag block to
  collapse. Both test suites green. A real `--scraper RecDesk-Parks` run (or the next
  Group 1 rotation) confirming `skippedFacility` counts and no F titles landing.

### Phase 6 — Documentation (required by the task)

- CLAUDE.md: RecDesk `EventType` semantics under Scraper Conventions (so no future
  session re-discovers this from scratch).
- SCRAPER-FIX-LOG.jsonl entry; `_pending` entry with the observable next-rotation effect;
- SITE-IMPROVEMENT-REVIEW.md §1.1 status updated; AGE-RANGE-AUDIT.md gets a dated note
  explaining the flag-count collapse when it happens (not before).

---

## Phase 1 results

**2026-08-31/09-01.**

**1a — stored corpus:** 18,253 RecDesk rows, **17,955 future-dated (98%)** — reservations
are season-booked months ahead, which is why this junk never expired via the past-event
cleanup. Top tenants by future rows: ccrec 3,540, lcncpr 1,928, mprd 1,680, crpr 1,327,
westhartford 1,322.

**1b — fleet classification pull:** all 48 configured tenants, scraper-identical window
(current month + 2), deduped the scraper's own way. **F=10,294  P=23,129  G=683** across
45 responding tenants (mcparc, oxfordms, whitewater returned 0 items). Snapshot committed:
`reports/recdesk-classification-2026-08-31.json` (6.2 MB). **A third type, `G`, appeared
only at fleet scale** — the 5-tenant probe never saw it; pulling the whole fleet before
adjudicating was what caught it.

**1d — P-side junk:** memberships already caught by the 2026-08-30 rules. The FORM class
is exactly **3 distinct titles × 62 recurrences = 186 rows**, all westhartford:
"Med Admin Authorization Form", "Leisure Services Emergency Form", "Beachland Adventure
Camper Profile".

## Phase 2 adjudications

| Class | Decision | Basis |
|---|---|---|
| `F` (facility booking) | **DROP at source + backfill** | 10,294 fleet items; overwhelmingly private-team reservations. Known cost accepted: rare public happenings booked as facility use (keeneparks "Amazing Race - Fundraiser", benefit tournaments) go with them — a handful per fleet, no in-band signal separates them. |
| `G` (league game) | **DROP at source + backfill** | All 683 G items on all 8 G-using tenants are "X vs. Y (field)" roster-game rows — church softball (cityofdover), sponsor beer leagues (crpr: "Boal City Brewing vs. PM Berserkers"), corporate leagues, youth t-ball (habershamga). Schedule data for people already in the league, not discoverable family events; the youth subset floods listings with near-identical All-Ages rows. |
| Unknown/absent `EventType` | **KEEP** | Never delete on a missing signal. |
| Paperwork (P-side forms) | **isJunkTitle() rule** (`isPaperworkTitle`) | End-anchored admin-adjective+"form" / "camper profile". 13 unit cases incl. 9 negative controls ("Fall Formal Dance", "Art in Many Forms", "Fill out the consent form at the door" all survive); suite 85/85. The 186 stored rows are removed by the next FunHive-DataQuality pass via fix-event-quality STEP 1b's existing delegation to isJunkTitle(). |
| Adult programming inside P | **OUT OF SCOPE — recorded, not acted on** | "Competitive Men's Doubles", "Lap Swim", "Aquacise", "Arthritis Aerobics", and notably "Defensive Carry Fundamentals (MD Wear and Carry)" all survive the current adult/non-family filters. This is the §1.2 age/audience-detection task's territory; acting on it here with RecDesk-local rules would re-create the local-detector divergence removed on 2026-08-03. |

## Phase 3 record

- `transformEvent` path now splits `rawEvents` on `EventType ∈ {F,G}` **before** the
  cancelled/adult filters and before detail calls — the capped 30 detail slots stop being
  spent on the first 30 ballfield bookings. Skips are counted and logged per tenant per
  run (`Skipped N facility bookings / league games`), never silent.
- `isPaperworkTitle()` added to `supabase-adapter.js`, wired into `isJunkTitle()`.
- Suites after both changes: junk-titles **85/85**, age-detection **94/94**.

## Phase 4 record — backfill executed 2026-09-01

Dry run first (its full cross-tab and samples are reproduced by re-running
`node scripts/fix-recdesk-facility-rows.js`):

| | count |
|---|---|
| future-dated RecDesk rows | 17,561 |
| **classified junk (unanimous F/G) — deleted** | **7,009** |
| classified keep (P or mixed) | 10,064 |
| **unmatched — left alone** | **488** |

The unmatched samples vindicated the never-delete-unmatched rule: they are overwhelmingly
REAL programs that aged out of the API window or changed titles — "Kenpo Karate - Mondays
- 6 to 13yr", "2026 Biddy Basketball League (Ages 5-6)", "Early Voting". Deleting on
title-resemblance would have destroyed them.

All 7,009 deleted rows were first written, complete, to
`reports/recdesk-deleted-rows-2026-09-01.jsonl` (3.3 MB, committed). `_stableEventId` is
deterministic, so restoration is a mechanical re-insert from that file.

Post-delete verification: an independent re-run classifies **0 junk / 10,064 keep /
488 unmatched** over the remaining 10,552 future rows.

## Phase 5 finding — the residual, honestly characterized

Recomputing the ≥70%-All-Ages flag over remaining future rows: **125 RecDesk sites still
flag** (of 162 with ≥20 events). The flags did not collapse because a **different,
pre-existing problem class** was hiding under the reservations:

- Real youth programs whose stored `age_range` predates the 2026-08-31 `10U`/`U12`
  detector rule ("5-6 (6u) Coed T-Ball" sitting in All Ages) — rows scraped hours before
  the rule landed; new scrapes classify correctly, stored rows need the §1.2 backfill.
- Swim-level names carrying age meaning without numbers (Syracuse's "Goldfish",
  "Seahorse", "Little Swimmer").
- Adult programming the adult filter misses (the Class C row above).
- Kids' classes with no age token at all ("Tap 1 - Wed. 5:15-6pm").

**These are age/audience-DETECTION issues, already assigned as SITE-IMPROVEMENT-REVIEW
§1.2 (Opus).** They were previously invisible under the reservation noise; making them
visible is a result, not a failure, of this fix. Note the audit's 149-flag figure and this
125 are not directly comparable (daily-new vs all-future populations).

## Expected next-rotation effect (falsifiable)

Next Group 1 run (2026-09-03): per-tenant `🏟️ Skipped N facility bookings / league
games` lines in stdout; RecDesk-Parks FOUND drops from 22,038 (08-31) to roughly the
P-side ~12k; no F/G-shaped titles ("X vs. Y", "Practice …", "Field Prep") among its new
rows. Recorded in `reports/fix-notes.json` → `_pending.RECDESK-FG-SKIP-UNRUN`.

