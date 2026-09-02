# Site Improvement Review — 2026-08-31

A full review of the diagnosis skill, CLAUDE.md, MASTER-PLAN.md, STATUS.md, TODO.md,
SESSION-STARTER.md, the three `*-PROMPT.md` files, ROTATION-STARVATION-LOG.md, the
fix-notes `_pending` queue, and the 2026-08-31 audit outputs — turned into a prioritized
work list. Each item is annotated **OPUS 5** (well-specified, verifiable, bounded blast
radius — a detailed prompt is included, ready to paste) or **FABLE 5** (judgment-heavy,
cross-cutting, or carrying a documented landmine).

**The split rule:** Opus 5 gets work where the *specification can carry the safety* — a
dry-run gate, a regression suite, a measurable acceptance test, one file or one family.
Fable 5 gets work where safety lives in *judgment across the codebase* — anything with a
recorded prior incident of the "looked correct in isolation" kind, anything that deletes
by a value being changed, and anything where the right answer depends on weighing evidence
the prompt can't enumerate in advance.

Rankings are by **user-visible site impact**, not engineering interest.

---

## Tier 1 — What families actually see (data quality on live pages)

### 1.1 RecDesk facility-reservation junk on the site — **FABLE 5**

> **STATUS 2026-09-01 — DONE (source fix awaiting its first rotation).** The predicted
> "harder than CivicRec" title taxonomy was never needed: RecDesk's API types every item
> (P/F/G) and the scraper was already receiving the field. Source now skips F+G; 7,009
> stored rows deleted under the no-information-loss protocol in
> `reports/recdesk-junk-taxonomy.md` (committed classification snapshot, unanimous-
> classification-only deletion, 488 unmatched deliberately kept, full pre-deletion row
> snapshot). Honest residual: 125 RecDesk sites still flag ≥70% All-Ages on REAL programs
> — that is §1.2's age-detection scope, now visible instead of drowned. §1.2's prompt
> should be updated to use `reports/recdesk-junk-taxonomy.md` Phase 5 as its starting
> worklist.

The single largest *visible* quality problem right now. Today's audit flagged 149
`RecDesk-Parks-*` sites ≥70% All-Ages, and sampling shows why: private team reservations
stored as family events — `"Practice Justin"`, `"Marysville Mitts"` ×15,
`"Central Carroll Rec Council CHE Soccer"`, `"City Employee Swimmer"`, plus adult
programming (`"Mah Jongg Organized Play"`, `"Chair Yoga"`, `"Qi Gong"`). A parent
searching Carroll County MD gets pages of ballfield bookings.

This is the CivicRec facility/membership problem (fixed 2026-08-30, 1,140 rows deleted)
arriving through a different shape — but **harder**: CivicRec's junk was facility *names*
as titles (whole-title rules worked); RecDesk's junk is *real program titles* where
junk ("Practice Justin") and keepers ("Aqua Toddler Time", "KPRD Afterschool!",
"Swim Lessons Preschool") share the same shape. The false-positive risk is deleting real
family programming at corpus scale, which is why this is Fable work: it needs the full
corpus measured, a taxonomy argued (reservation-by-named-team vs. drop-in session vs.
adult class vs. family program), probably a per-tenant signal (RecDesk's API may carry a
program-vs-reservation field worth checking before any title heuristics), and the same
negative-control discipline as the CivicRec fix. Est. scale: RecDesk wrote 10,409 NEW
rows today alone.

### 1.2 Age-detection recovery — Phase 5, gate 5 at 35% vs best 40.6% — **OPUS 5**

> **STATUS 2026-09-01 — first pass done.** JOB 1's answer was that the premise was
> partly wrong: gate 5 double-counted every flagged site, understating it by 10.5 pts
> (35.0% → 45.5% once fixed), and the bias scaled with the daily flag count, so much of
> the "regression" was measurement. Ratchet reset — the old 40.6% best is not comparable.
> JOB 2 closed the explicit-age format gaps (239 → 91 misses), caught a toddler-class →
> Adults bug that would have *deleted* rows, and backfilled 1,163 All-Ages rows to
> specific brackets. Suite 94 → 110. **Still open for a second pass:** the null-signal
> pool is 67k rows (58.6% of future events); classes examined and *rejected* as unsafe
> are documented below in the fix-log entry (craft-fair false positives, program "Level
> N", pool-specific swim-level names). Parenting talks tagged as kids events is a newly
> identified class, recorded and not yet acted on.
>
> **COMPLETION PASS 2026-09-01 (Fable) — §1.2 CLOSED.** The assessment's five rule
> defects fixed and pinned (era/franchise guard, years-unit open-ended, and-under
> crossover documented both ways, dead ternary); carry-permit firearms phrases added to
> the non-family patterns with negative controls and the 6 live rows deleted; the skipped
> flagged-family sampling done WITH descriptions — verdict: those families' All-Ages
> shares are structural (boilerplate descriptions, genuine adult programming), zero of 45
> samples recoverable, so no description-inclusive backfill should be built. Incidental:
> "is closed today" closure-notice gap fixed, 13 stored rows deleted. Suites 115/115,
> 85/85. Remaining age work is the 67k null-signal pool, which is now believed mostly
> structural rather than recoverable.

Gate 5 regressed −2 this window and MASTER-PLAN Phase 5 (26 age bugs across 8 scrapers)
has never started. The regression suite (`test-age-detection.js`, 94 cases) exists
precisely so this work is safe to delegate. Prompt:

```
Read CLAUDE.md in full first. Task: MASTER-PLAN.md Phase 5 — age detection recovery.

Gate 5 of scripts/project-status.js reads 35% specific-age share against a best-ever of
40.6% (2026-08-10). Two jobs, in order:

JOB 1 — measure WHY it regressed before changing anything. Query the events table
(selective columns only: scraper_name, age_range, scraped_at; always .order('id') before
.range(); pages of 1000) grouped by scraper family and scraped_at week. Identify which
families' All-Ages share grew since 2026-08-10. Distinguish composition (new high-volume
all-ages sources like RecDesk-Parks joining the corpus) from true regression (a family
whose specific-age share fell). Report the split with numbers before touching code.

JOB 2 — work the age-signal misses. AGE-RANGE-AUDIT.md's flagged sections (2026-08-28
through -31) list sites ≥70% All-Ages. For non-parks sites in that list, sample 15 stored
titles each (same query pattern) and check whether titles carry age signals
detectAgeRange() misses. For each REAL miss class found (like the 10U/U12 youth-sport fix
of 2026-08-31 in SCRAPER-FIX-LOG.jsonl — read that entry as the model): measure the class
across the full corpus first, add ONE anchored rule to detectAgeRange() in
scrapers/helpers/supabase-adapter.js, add cases INCLUDING negative controls to
scripts/test-age-detection.js, and run it — it must pass 100%. Hard rules: never a bare
digit-range scan (2026-08-03 incident); rules ordered before the generic keyword rules
only when hard-anchored; normalizeAgeRange() buckets by LOWER bound, so mind synthesized
ranges. Any backfill: node scripts/fix-null-dates.js-style --save pattern, dry-run first,
READ the samples, and cap what you write.

Do NOT touch the 5 parks scrapers' local detectors or delete any event — facility-junk
classification is a separate Fable-assigned task (SITE-IMPROVEMENT-REVIEW.md §1.1).
Deliver: the JOB 1 measurement, each rule with its corpus count, suite result, one
SCRAPER-FIX-LOG.jsonl line, and refresh gate 5 via the command in project-status.js.
```

### 1.3 KidsOutAndAbout-DMV venue chrome — **OPUS 5**

> **STATUS 2026-09-01 — DONE.** Bigger than the note said: the venue held the whole
> location block and `address` was NULL on all 65 rows. Two source defects fixed (the
> chrome strip was discarded unless an address regex matched; the split was gated on
> `!city` which the JSON-LD block above usually fills). `cleanVenueName()` now collapses
> whitespace and strips map-widget chrome centrally. Backfill applied the scraper's logic
> verbatim; 50 of 65 turned out to be **cross-scraper duplicates** of already-clean
> KidsOutAndAbout-Eastern rows and were deleted after proving each twin, 15 repaired in
> place. 65 → 0. **New follow-up raised:** the DMV/Eastern metro overlap itself is
> unfixed — see `_pending.KOA-DMV-EASTERN-OVERLAP`.
>
> **ASSESSMENT 2026-09-01 (Fable) — complete with two corrections applied.** The source
> fix is **unrun** until the next Group 1 rotation (9/3) — the original status said DONE
> without that caveat. Probes found and fixed a parenthesised-chrome residue in
> `cleanVenueName` ("Harris Pavilion ( )"), with "Library (Main)" and "T(w)eens"
> verified untouched. Two findings changed the overlap picture: the deleted DMV rows
> carried addresses their surviving Eastern twins entirely lack (0/300 sampled have any),
> and Eastern has a confirmed misgeocode class — the kept Mount Vernon VA twin is plotted
> in Washington PA. The overlap note's "retire DMV" lean was therefore backwards and its
> duplicate prediction inverted; both corrected in `_pending.KOA-DMV-EASTERN-OVERLAP`.
> Process gap recorded: the 50 unplanned deletions wrote no pre-deletion snapshot,
> unlike the RecDesk protocol.

Open pending item (`KIDSOUTANDABOUT-VENUE-NEWLINES`): venues stored as multi-line strings
ending `"See map: Google Maps"` — page chrome rendered as venue names on the site, and
the thing that broke the audit tables on 2026-08-31. Scoped, reproducible, one scraper.
Prompt:

```
Read CLAUDE.md first, then the 2026-08-31 SCRAPER-FIX-LOG.jsonl entry about audit-table
truncation and reports/fix-notes.json → _pending.KIDSOUTANDABOUT-VENUE-NEWLINES.

Bug: KidsOutAndAbout-DMV (and check the Eastern variant too) stores venue values
containing embedded newlines and the literal text "See map: Google Maps".

1. Measure: query events where scraper_name like 'KidsOutAndAbout%' (selective columns:
   id, venue, scraper_name; .order('id') before .range()); count rows whose venue
   contains a newline or 'See map'. Show 10 samples.
2. Fix at source: find the venue extraction in the KidsOutAndAbout scraper file(s),
   trim the captured node's text to the first line / strip the map-link block. Do not
   guess selectors — read the actual extraction code and, if needed, fetch one live
   event page to confirm the DOM shape.
3. Also harden centrally: cleanVenueName() in scrapers/helpers/supabase-adapter.js
   should collapse internal whitespace/newlines in venues — check whether it already
   does before adding anything.
4. Backfill existing rows with a --save-pattern script per SCRIPT-WRITING-PROMPT.md
   (dry-run first, read samples). Re-derive the venue from the stored value's first
   line; if that leaves under 3 chars, use deriveVenueFallback().
5. node -c every touched file; one SCRAPER-FIX-LOG.jsonl line; update the _pending
   entry in the same commit.
```

### 1.4 Phase 7 — CustomDrupal-Libraries found→stored broken — **OPUS 5**

> **STATUS 2026-09-01 — diagnosed; Phase 7's premise disproven.** The family holds ~103
> rows, not 0 — the premise's query used a `scraper_name` no site emits (7 of 8 store
> under library display names, 1 under `CustomDrupal-Libraries-wake`). Real per-site
> findings: **Richland Library has never been scraped** (15s navigation timeout every
> run — budget raised to 45s); **Greenville County is a site-side dead calendar** serving
> 2020 archive on every audience view, verified live, extraction is correct and it is
> left running as an explained gap; **Anderson County** returns 0 events, still open. The
> highest-value fix is the meta-bug: per-site failures went only to stderr while the
> audit parses stdout, so crashed sites were indistinguishable from empty ones. **Not
> re-run** — MacaroniKid held the runner lock all session; verification falls to the next
> Group 2 rotation (`_pending.CUSTOMDRUPAL-TIMEOUT-VISIBILITY-UNRUN`). MASTER-PLAN
> Phase 7 should be rewritten around these findings rather than "stores nothing".

Reported 356 found / 65 new on 2026-08-05 while the database holds 0 upcoming rows.
Something between extraction and storage eats everything — dedup, date parsing, or a
rejection rule. Bounded to one scraper, evidence-driven. Prompt:

```
Read CLAUDE.md first. Task: MASTER-PLAN.md Phase 7 — CustomDrupal-Libraries stores
nothing despite finding events.

Evidence: run table shows found 356 / new 65 on 2026-08-05; DB has 0 upcoming rows for
scraper_name CustomDrupal-Libraries (verify this claim first — selective columns,
.order before .range; also check for rows under drifted names via
scripts/check-scraper-names.js output, since this scraper is listed COLLAPSED).

Diagnose the found→stored gap: run the scraper live for ONE configured site
(npm run scraper -- --scraper CustomDrupal-Libraries after checking its group), read the
per-event output. The usual suspects in this codebase, in order: event_date text that
parses to null date AND fails validation; every row hitting the junk/adult/past
rejections in saveEvent (each logs a reason — read them); _stableEventId collisions
marking everything duplicate; venue/state missing causing geocode-fail rejection.
The saveEvent log lines will say which. Fix the actual cause, node -c, re-run the same
site, and confirm rows land in the DB (count before/after). One SCRAPER-FIX-LOG.jsonl
line. Do not rename the scraper or touch its COLLAPSED naming — that is a separate
migration task.
```

---

## Tier 2 — Coverage (more real events on the site)

### 2.1 UNVERIFIABLE backlog, mechanical slices — **OPUS 5**

> **STATUS 2026-09-02 — triaged; this section's own estimates were wrong.** Measured
> composition: JS-gated/renders-nothing is **491 (58% of the backlog)**, not the 71 assumed
> here — so these mechanical slices can clear at most ~40% of gate 4 even if all succeed.
> A **redirect class of 48** that this section did not contain at all was found, grouped by
> destination (one squatter domain, `dot-book.org`, accounts for **11 libraries**). 14
> conclusive dead-domain rows promoted to MISMATCH; gate 4 **849 → 831**. All
> Puppeteer-dependent slices deferred — MacaroniKid held the runner lock and ran Chrome all
> session, which this section's own rule forbids working through. Worklist:
> `reports/unverifiable-backlog-triage.md`.

Gate 4's 849 unknowns and STATUS.md's named next action. The backlog splits into slices
with very different natures. The mechanical ones — platform-mismatch relocations (~55),
Google-Calendar iframes (~20, method already documented in `GCAL-IFRAME-CLUSTER`), dead
endpoints (~18), and network-error re-checks (~149) — are Opus work because the verifier
and the relocation pattern already exist. Prompt:

```
Read CLAUDE.md in full, then MASTER-PLAN.md Phase 8 and reports/fix-notes.json →
_pending.GCAL-IFRAME-CLUSTER. Task: burn down the mechanical slices of the UNVERIFIABLE
backlog. Work in this order, committing per slice:

SLICE 1 — re-check network errors (~149 sites). Extract UNVERIFIABLE entries from
reports/verification-comments.json whose comment names a network/timeout/TLS error.
Build the input file and run scripts/verify-sites-puppeteer.js --concurrency=3 (NEVER
higher while any rotation or MacaroniKid task is running — check
Get-ScheduledTaskInfo for FunHive-Scrapers AND FunHive-Macaroni first). Merge verdicts
ONLY via scripts/merge-verification-comments.js (dry run, then --save, then --validate).
Transient blocks often clear; expect a real MATCHES/MISMATCH yield.

SLICE 2 — platform-mismatch relocations (~55). For each site where the verifier already
named a platform this codebase parses (libcal, librarycalendar, bibliocommons,
communico, librarymarket): confirm identity from the live page itself (street address /
ZIP / phone area code — NEVER name similarity, per the CLAUDE.md URL-collision rules),
then move the entry to the right family file following the Knox County precedent
(SCRAPER-FIX-LOG.jsonl 2026-08-29): correct per-site scraperName slug, sourceUrl =
listing page, node -c, and DO NOT remove the old entry until the replacement produces
rows in a real run — the Worcester rule. Batch of 10 max per session so each gets a
watched first run.

SLICE 3 — Google Calendar iframes (~20). Follow the harvest method documented in the
GCAL-IFRAME-CLUSTER pending note verbatim; update that note as sites complete.

SLICE 4 — dead endpoints (~18). For each, try the recovery ladder before declaring a
gap: the library's own homepage → its events link → the platform families. A dead
domain with no successor is recorded as urlCollision-style guarded entry with the
evidence, not deleted.

Every slice: verdicts through the merge script only, one SCRAPER-FIX-LOG.jsonl line per
slice, and report MATCHES/MISMATCH/UNVERIFIABLE deltas so gate 4 in project-status.js
moves measurably. Leave the 439 renders-nothing sites alone — that slice is Phase 10
design work assigned elsewhere.
```

### 2.2 WordPress-{state} heterogeneity strategy — **FABLE 5**

The biggest single coverage gap: ~290 of 307 zero-event sites in the Group 1 audit are
six WordPress state files; Group 3's picture is the same (453/459). The `_global` pinned
note defers per-site DOM work — correctly, because bespoke selectors per library don't
scale. What CAN change the economics: the Puppeteer verifier now *names platforms* it
detects, and the TEC REST helper (2026-08-30) proved one shared extraction path can light
up entire subsets at once. The Fable job is strategic: measure how the ~600 WordPress
zero-sites cluster by *detectable calendar platform* (TEC variants, The Events Calendar
month grid, GrowthZone, LibraryAware, plain HTML lists...), then build the 2–3 shared
extractors with the best site-count-per-extractor ratio, rather than either 600 bespoke
fixes or none. This decides where weeks of effort go — wrong clustering wastes all of it.

### 2.3 Orphaned Florida LibCal systems — **OPUS 5**

MASTER-PLAN Defect E: `scraper-libcal-libraries-fl.js` configures Volusia, Osceola, Leon,
Manatee — real library systems with zero coverage — and is registered nowhere. The VA
twin became `LibCal-VA2` (now producing 185 found/run), so the precedent is proven.
Prompt:

```
Read CLAUDE.md in full — especially the "Checklist for a NEW scraper" — plus
MASTER-PLAN.md Defect E. Task: register the orphaned scraper-libcal-libraries-fl.js as
LibCal-FL2, following the LibCal-VA2 precedent exactly.

1. Verify each configured FL system's LibCal URL live first (right institution, right
   state, real events) — fix or guard any that fail, never delete silently.
2. Confirm no overlap with the existing LibCal-FL entries in the shared file — if a
   system exists in both, the shared file wins and the orphan's copy is dropped WITH a
   comment saying so.
3. Registry entry: file, exportName, group (pick the group with the fewest active
   scrapers — recompute per CLAUDE.md, don't trust stale counts), state 'FL',
   sites: N. Fix the file's SCRAPER_NAME to the registry key; per-site scraperName
   slugs; sourceUrl = each calendar listing URL.
4. node -c; dry run; then a real watched run (npm run scraper -- --scraper LibCal-FL2)
   and report per-site found counts. An unrun scraper is not finished.
5. One SCRAPER-FIX-LOG.jsonl line, category new-coverage. Also check
   scraper-miami-dade-library-FL.js per the MASTER-PLAN note — but only REPORT its
   status; fixing the WordPress-FL parent is out of scope here.
```

### 2.4 The 174 open MISMATCHes — **OPUS 5**, batched

Gate 3's main body of work. The site report's Fix queue tab already prioritizes them with
evidence and root-cause buckets; the daily diagnosis chips at a few per run. A dedicated
session clears them faster. Prompt: use the Fix queue directly —

```
Read CLAUDE.md in full. Open reports/site-report.html → Fix queue tab (or rebuild its
inputs from reports/verification-comments.json + fix-notes.json). Work the OPEN
MISMATCHes top-down, dead-endpoint and url-collision buckets first, extraction-failure
last. Batch limit: 15 sites this session, each to completion. Rules per CLAUDE.md: the
bucket is a hint, not a verdict — confirm against the live site; identity from street
address/ZIP/area code only; disabling is not deleting; a guarded library is a recorded
gap; coverage claims only via scripts/verify-coverage.js; node -c every touched config;
new verdicts only via merge-verification-comments.js --save then --validate. One
SCRAPER-FIX-LOG.jsonl line per logical fix. End with the MISMATCH count delta.
```

---

## Tier 3 — Product features (src/**, deploys to Vercel — your review gates every push)

### 3.1 Ship the Tier-1 analytics funnel — **owner action + OPUS 5 assist**

Per TODO.md this is *built and passing build*, blocked on two manual steps: apply
`database/migration-click-events-acquisition.sql` in the Supabase SQL Editor (FIRST —
inserts silently drop until then), then push the `src/**` changes after your review.
Highest product-insight-per-effort item on the board: it turns "did the Facebook plan
work?" into a measurable funnel. Opus prompt if you want the pre-push review done for
you: "Review the un-pushed src/** analytics changes against TODO.md's Tier 1 section;
confirm the migration is applied (probe the columns via a service-role script, not
anon); list every file to be pushed with a one-line risk note each; do not push."

### 3.2 Stripe configuration — **owner only.** All keys/account creation; no model can or
should do this. The code path is complete per TODO.md.

### 3.3 "This Weekend" roundup generator — **OPUS 5**

Feeds the entire Facebook strategy in TODO.md (the save-able weekly roundup is its core
loop) while touching nothing under src/**. Prompt:

```
Read CLAUDE.md (schema + egress rules) and TODO.md's Facebook section. Build
scripts/weekend-roundup.js per SCRIPT-WRITING-PROMPT.md conventions.

Given --region "Anne Arundel, MD" (city/county+state) and optional --radius (default
25mi) and --date (default: next Saturday), produce a ready-to-post text roundup: the
top 5-8 FREE-or-cheap family events for the coming Sat-Sun within radius, each as
"emoji + name — venue, city (age bracket, time)". Selection: use the nearby_events RPC
with a geocoded center (reuse the geocoding helper's cache; keep max_results sane for
egress), filter date to the weekend window on the TIMESTAMPTZ date column (never
event_date), exclude reported rows, prefer events with a specific age_range over All
Ages, dedupe by name+venue, and diversify categories (max 2 per category). Output
formats: --format=text (default, paste-able with a "link in comments" footer per
TODO.md's link-throttling note) and --format=json. No DB writes at all. Include 2-3
example invocations in the header comment and run one for real to prove output quality.
```

### 3.4 Analytics housekeeping — **OPUS 5** (small): bot filtering in
`scripts/analytics-dashboard.js` (the 2026-07-07/08 crawler spike), plus the Speed
Insights one-liner when you next review a src push. Search Console setup is owner-only.

---

## Tier 4 — Process and infrastructure

### 4.1 `scraper_name` migration (gate 6, 265 drifting names) — **FABLE 5**, explicitly

The planned migration CLAUDE.md keeps out of daily work — and the review confirms it must
stay Fable-only: `Assabet-NH-MA` is documented as *not fixable from a daily run* because
`saveEventsWithGeocoding()` overwrites `metadata.scraperName` and
`verifyAndCleanupEvents()` **deletes rows by that exact value** — a rename executed
naively deletes data. The bulk (RecDeskParks-* → RecDesk-Parks-*, wordpress-NY case
fixes, FREE_TEXT retirements) is mechanical *after* someone maps every write/delete path
that keys on the value. That mapping is the Fable part; the renames that follow could
then be handed to Opus family-by-family with the verdict-key migration
(`VERDICT-KEYS-FOLLOW-RENAMES`) run in the same session.

### 4.2 Documentation hygiene — **OPUS 5**

Found stale during this review; cheap to fix, prevents the next session being misled:

```
Doc-only pass, no code. Read CLAUDE.md's Automated Maintenance section (current truth:
FIVE scheduled things, FunHive-Macaroni exists, rotation no longer runs MacaroniKid,
runner.lock serializes) and ROTATION-STARVATION-LOG.md. Then update:

1. SESSION-STARTER.md — its Environment block still describes the single-task 3 AM
   rotation; add FunHive-Macaroni (3 PM) and the runner.lock wait-is-not-a-hang note;
   add ROTATION-STARVATION-LOG.md and scripts/test-rotation-safety.js to key files.
2. MASTER-PLAN.md §8 progress log — append a dated entry for the 2026-08-31 rotation
   split (one paragraph, link the ledger; do not restate it).
3. DATA-QUALITY-DIAGNOSIS-PROMPT.md and SCRAPER-DIAGNOSIS-PROMPT.md — grep both for
   claims that MacaroniKid runs inside the rotation or that fix-all chains after
   scrapers; correct only what is factually stale, changing nothing else.
4. ROTATION-FIX-PROMPT.md — prepend a STATUS header: "IMPLEMENTED 2026-08-31, commit
   7184edc; kept until the acceptance criteria in ROTATION-STARVATION-LOG.md
   intervention #5 are observed; then move to scripts/archive/-style retirement."
Commit as one docs commit. Do not touch STATUS.md (generated) or the audit files.
```

### 4.3 Stale gates refresh — **OPUS 5** (quick): gates 6 and 7 are marked ⚠stale
(2026-08-30 / 2026-08-05). Run the refresh commands named in `project-status.js`
(`check-scraper-names.js`, `verify-coverage.js`), update `STALE_METRICS` values+dates,
`--save`. Gate 7 becomes meaningful for the first time now that all three groups have
rotated post-`source_url`-fix.

### 4.4 Rotation-split observation — **nobody.** The daily diagnosis already reports
against the ledger (item 14) and the preflight watches both tasks. Adding work here would
just duplicate the machine. The one date to watch by hand: **2026-09-02** — Group 2's
first new-code rotation, and the day the transition shim in `macaroni-daily-runner.js`
becomes deletable.

---

## Open review-process items

### A1 Assess §1.4 (CustomDrupal) — **FABLE 5**, queued 2026-09-02

Each completed item has had a Fable assessment (§1.2, §1.3 both found real defects the
delivering pass missed). §1.4 has not been assessed yet. **It was started 2026-09-02 and
stopped early** when the evidence turned up something outside its scope; the partial
findings are recorded here so the assessment does not begin cold:

- **Verified:** the Phase 7 "0 rows" premise really is false, and the naming explanation
  holds (7 of 8 configs emit no `scraperName`).
- **Not yet probed:** whether the 15s→45s bump is enough for Richland (the site was never
  fetched directly — only the timeout message was read); whether the both-streams logging
  actually yields a Richland row in `LIBRARY-SITE-AUDIT.md`; whether Anderson County's
  "found 0" is a selector problem or a JS-gated calendar.
- **Blocked on:** a Group 2 rotation, which has not happened — see the rotation note below,
  which is the more urgent finding.

### A2 Rotation may have stopped running — **URGENT, needs a human look**

Gathered 2026-09-02 ~11:26Z while assessing §1.4, and outside that task's scope:

| Signal | Value |
|---|---|
| `FunHive-Scrapers` last result | **09-02 03:00 → `Result=1` (failure)**; 09-01 → `Result=0` |
| `scrapers/logs/scraper-run-2026-09-01.log` / `-09-02.log` | **neither exists** |
| Last `"FunHive scrapers starting"` marker in `scraper-stdout.log` | **2026-08-31** |
| `group-last-run.json` | G1 09-01, **G2 08-28 (5 days stale)**, G3 08-30 |
| `runner.lock` | held by `macaroni-daily-runner` pid 15868 (**alive**) since **09-01T19:00Z** — 16h+ |

The MacaroniKid side is working as designed: its ledger-based catch-up correctly chose the
starved Group 2 ("Group 2 has not completed in 4.6 days") and is grinding through it. But
the ROTATION has produced no run log and no stdout marker for two consecutive days while
Task Scheduler recorded a start both days, once succeeding and once failing. Two readings,
not yet distinguished:

1. The rotation is waiting on the run lock (by design, up to 8h) and exiting — but that
   should still write a run log and a lock-wait line, and neither exists.
2. `run-scrapers.bat` is failing before its first `echo`, which would mean the batch or
   its working directory is broken — the same class as the 2026-08-12 silent chain failure.

**Whoever picks this up: check the batch and the Task Scheduler action first, not the
scraper code** — that is the standing lesson from CLAUDE.md's Automated Maintenance note.
Do not assume the split caused it without evidence; the 09-01 run returned 0.

## Suggested sequencing

| When | Item | Model |
|---|---|---|
| Now (owner, 15 min) | 3.1 migration + src review, 3.2 Stripe account | you |
| This week | 1.2 age recovery, 1.3 KidsOutAndAbout, 4.2 docs, 4.3 gates | Opus 5 |
| This week | 1.1 RecDesk junk taxonomy | Fable 5 |
| Next | 2.1 backlog slices, 2.3 LibCal-FL2, 1.4 CustomDrupal, 3.3 roundup | Opus 5 |
| Next | 2.2 WordPress clustering strategy | Fable 5 |
| After 2.2 lands | 2.4 MISMATCH batches (repeat) | Opus 5 |
| Last, deliberately | 4.1 name migration | Fable 5 → Opus per family |

Two Fable items (1.1, 2.2) unlock the most Opus-executable work downstream; that is the
leverage argument for doing them early rather than by severity order alone.
