# Rotation Starvation — intervention ledger

**What this file is.** A single durable record of every attempt to stop rotation groups
from silently losing their turn, with what each attempt *predicted* and what was
*measured* afterwards. It exists because the problem has now been "fixed" three times and
is still happening, and each attempt was recorded only in `SCRAPER-FIX-LOG.jsonl` where it
sits among hundreds of unrelated entries — so every new session re-derives the history from
scratch and re-reaches conclusions already reached.

**Read this before proposing another fix.** The daily diagnosis reports against it.

---

## The mechanism

Three facts combine. None is a bug on its own.

1. **A full rotation now takes ~26 hours.** Measured 2026-08-31: 11.4h of regular scrapers
   (07:00:01Z → 18:25:55Z) plus a MacaroniKid tail of ~15h. Prior MacaroniKid Group 1
   tails: 930.7 min (2026-08-25) and 881.5 min (2026-08-28).
2. **Triggers are 24 hours apart** — `FunHive-Scrapers`, daily 3:00 AM.
3. **`FunHive-Scrapers` is registered `MultipleInstances=IgnoreNew`**, so a trigger that
   fires while the previous run is still going is **discarded silently** — no error, no
   log file, no `LastTaskResult` anomaly.

Net: **every rotation that overruns eats the following day's rotation entirely.** The
group that loses its turn waits 6 days instead of 3. Because MacaroniKid sits at the tail
of every group list, it is always the first casualty.

**26h > 24h is the root cause.** Everything below is either recovery or detection; none of
it addresses the duration.

### Why it stays invisible

The Step 1 staleness guard is *"if the newest line in `scraper-summary.log` is more than
24h old, the nightly task did not run."* That guard is **anti-correlated** with this
failure: the overrunning run keeps writing fresh lines, so the log looks *healthier* than
normal on exactly the day a rotation was dropped.

Measured 2026-08-29: newest summary line timestamped `18:36:16Z`, minutes before the
diagnosis. Guard passed. Those lines were the 2026-08-28 Group 1 run finishing at 08:43Z
plus hand re-runs. Group 2's turn that day never happened, and it went unreported for two
more days.

---

## Intervention ledger

| # | Date | Change | Predicted | Measured outcome | Verdict |
|---|---|---|---|---|---|
| 1 | 2026-08-19 | `scrapers/helpers/group-catchup.js` — `recordGroupCompletion()` at the run tail + `selectGroup()` preferring a starved group over the calendar pick. `STARVATION_DAYS = 4`. | "A skipped day now self-heals on the next day a run actually starts." | Fired correctly **once**, 2026-08-27: logged `CATCH-UP: Group 2 has not completed in 5.0 days` and ran 53 Group 2 scrapers. Did **not** fire 2026-08-30 or 08-31 (Group 2 measured 2.1d and 3.08d). | ⚠️ **Partial** — see below |
| 2 | 2026-08-20 | `scripts/seed-group-last-run.js` — re-derives `group-last-run.json` from the runner's own completion lines, after it was found 3 days stale. | Stops a stale-old timestamp making the wrong group eligible. | No recurrence observed. | ✅ Held |
| 3 | 2026-08-22 | `ExecutionTimeLimit` 12h → 36h; data-quality split into its own `FunHive-DataQuality` task. | Stops Task Scheduler killing the batch mid-run. | Held — no `267014` since. | ✅ Held, but **addressed a different symptom.** 26h fits inside 36h comfortably; the time limit was never the binding constraint. |
| 4 | 2026-08-31 | `checkRotationStarted()` in `scripts/preflight-diagnosis.js` — parses each of the last 7 `scraper-run-<date>.log` files for a `Running Group N` line. | Surfaces a dropped rotation the day it happens, without inferring from log freshness. | On its first run, immediately reported `2026-08-29=NONE 2026-08-26=NONE`. | ✅ **Detection only — not a fix.** The rotations are still being dropped. |
| 5 | 2026-08-31 | **The task split (Layers 1+2, the genuine fix).** Layer 1: `helpers/atomic-json.js` (temp+rename JSON state, re-read-before-modify), `helpers/run-lock.js` (bounded, loud, stale-breaking mutex for full-group runs), geocode cache merge-on-write, per-group checkpoint files, `group-catchup.js` completion redefined per pipeline. Layer 2: MacaroniKid removed from the rotation into its own task (`FunHive-Macaroni` 3:00 PM → `macaroni-daily-runner.js`, own `macaroni-last-run.json` ledger + catch-up + same-day guard). `STARVATION_DAYS` kept at 4, argued in `group-catchup.js`. 8/8 in `scripts/test-rotation-safety.js`. **Task registration still pending — needs elevated `setup-tasks.ps1`.** | With both tasks registered: the rotation task's own duration is ≤ regular-pass length (~11.4h max) + a bounded lock wait, always under 24h, so **no rotation trigger is ever discarded again**; MacaroniKid overrun delays the next rotation by hours instead of deleting it; every group advances on a ~3-day cadence; preflight shows no `NONE` days. | *(pending — fill in after a full 3-day cycle with `FunHive-Macaroni` registered)* | ⏳ code proven by unit suite; scheduling effect **unobserved** |

### Why #1 half-works, and why that matters

`group-catchup.js` is **not broken — it is mis-tuned**, and the distinction changes what
should be done about it.

`STARVATION_DAYS = 4`, but a group's turns are only **3 days apart**. So a group that
misses *one* turn is not detectable as starved until day 4+ — by which point its own next
calendar turn is at day 6 and arriving anyway. The mechanism therefore only rescues a group
after it has missed **two consecutive turns** (which is exactly the 5.0-day case that fired
on 08-27), never one.

Its real effect: it converted a **permanent** stall (MacaroniKid Group 2 had gone 14 days
before it shipped) into a **5–6 day** cycle. That is a genuine improvement. It just does not
restore the 3-day cadence, and the 2026-08-19 entry's claim that "a skipped day now
self-heals" overstated it.

---

## Prediction check — 2026-09-01

**The 09-01 prediction held, exactly.** Recorded here rather than edited into the section
below, so the claim and its test stay side by side.

| Predicted (2026-08-31) | Measured (2026-09-01) | Held? |
|---|---|---|
| No rotation at all on 09-01; preflight shows `2026-09-01=NONE` | Preflight: `2026-09-01=NONE 2026-08-31=G1 2026-08-30=G3 2026-08-29=NONE 2026-08-28=G1 2026-08-27=G2 2026-08-26=NONE`. No `Running Group N` line exists for 09-01. | ✅ |
| Cause: the old-code MacaroniKid tail is still running at the 07:00Z trigger | `scraper-run-2026-08-31.log:127` — `🍝 Running MacaroniKid scrapers for Group 1 (macaroni-runner-group1.js)` at `2026-08-31T18:25:55Z`, finishing `2026-09-01T13:42:47Z`. The rotation's own table reports **1842.8 min = 30.7h** total. | ✅ |
| Nothing deployed 08-31 could prevent it | Split commit `7184edc` is timestamped `2026-08-31T20:53Z` — 2.5h **after** the runner had already spawned the group-1 tail from pre-split code held in memory. | ✅ |
| Tail length ~15h | **19.3h measured** (18:25:55Z → 13:42:47Z). | ❌ — see below |

**The duration model understates Group 1 tails and should be widened.** The ledger's option-1
table recorded Group 1 MacaroniKid tails of 15.5h / 14.7h / "~15h"; the actual 08-31 tail was
19.3h, ~29% above the top of that range. The conclusion is unchanged — with an 11.4h regular
phase, any tail over ~12.6h overruns, and every observed Group 1 tail already clears that —
but anyone re-deriving headroom from these numbers should use 19.3h, not 15h, as the Group 1
worst case. Recording the miss rather than quietly re-fitting it.

**Both new tasks verified live the same day.** `FunHive-Macaroni` is registered and Ready
(`NextRunTime = 2026-09-01 15:00`, `LastTaskResult = 267011` = never run yet), and a
`macaroni-daily-runner.js --dry-run` at 18:19Z resolved to *"CATCH-UP (macaroni ledger):
Group 2 has not completed in 4.6 days (calendar said Group 1)"* → `macaroni-runner-group2.js`.
That is the predicted behaviour — the starved group beating the calendar pick — confirmed
before the trigger rather than after. `scripts/test-rotation-safety.js` passes 8/8.

**Still open, and the actual test of intervention #5:** the 09-02 prediction. Group 2 should
run under new code, regular scrapers only, in roughly 7h, with a lock-acquisition line in
`scraper-run-2026-09-02.log`. Until that is observed, intervention #5's ledger row stays ⏳.

---

## Current state — 2026-08-31

- Rotations in the last 7 days: `08-31=G1 08-30=G3 08-29=NONE 08-28=G1 08-27=G2 08-26=NONE 08-25=G1`
- **Two dropped rotations in 7 days.** Both were Group 2's turn.
- `group-last-run.json`: G1 = 2.5d, G2 = **3.6d**, G3 = 1.0d.
- Group 2 last completed **2026-08-27**.
- Consequence: 27 of the 28 active library scrapers with no row in the current audit cycle
  are Group 2. Three `_pending` items (`WORDPRESS-MONTHGRID-UNRUN`,
  `SIMPLEVIEW-DAYGRID-PARTIAL`, `SIMPLEVIEW-VENUE-COLLAPSE-BACKLOG`) are blocked on a
  Group 2 rotation that keeps not arriving.

**Prediction on record — corrected 2026-08-31.** An earlier draft of this line said
"Group 2's 09-01 turn will be dropped". That was wrong: `getDayGroup(1)` is **Group 1**.
Recording the correction rather than quietly editing it, because a prediction file whose
predictions get silently rewritten is worthless.

**The catch-up cannot start a run.** `selectGroup()` is called at
`local-scraper-runner.js:645`, inside the runner — it only chooses which group an
already-started run works on. And the task carries **`StartWhenAvailable = False`**, so a
discarded trigger is never retried: it is gone permanently. Verified against the live
registration 2026-08-31, along with `RestartCount = 0` and a single daily trigger
(03:00, `DaysInterval=1`) with no repetition.

So, falsifiably (revised the same evening after intervention #5 landed — the code deployed
2026-08-31 ~21:00Z changes what happens from 09-02 onward, but NOT 09-01, because the
in-flight run executes pre-split code from memory):

- **2026-09-01** — the old-code MacaroniKid tail (started 18:25:55Z, measured 14.7-15.5h)
  should still be running at the 07:00Z trigger, which is therefore **discarded: no rotation
  at all that day**. Nothing deployed today can prevent this — the overrunning task instance
  predates the deploy. The preflight will show `2026-09-01=NONE`.
- **2026-09-02** — day 2 is Group 2's calendar turn, nothing is in flight, so the trigger
  fires and **Group 2 runs under NEW code**: regular scrapers only, completing in ~7h
  instead of ~22h, recording completion to `group-last-run.json` at the END OF THE REGULAR
  LIST (new semantics). Its run log will carry a lock-acquisition line.
- **From the first day `FunHive-Macaroni` is registered** (pending: needs elevated
  `setup-tasks.ps1`): the 3:00 PM trigger selects a group against `macaroni-last-run.json`
  — given the seeded ledger, the most-starved group wins, which is currently Group 2
  (last MacaroniKid completion 2026-08-28T05:05Z). A transition shim in
  `macaroni-daily-runner.js` (delete after 2026-09-02) stops it duplicating Group 1's
  pass on 09-01, which the old-code run will have just finished that morning.
- **Across the first full cycle with both tasks registered**: zero `NONE` days in the
  preflight, all three groups ≤ ~3.5d in `group-last-run.json`, all three MacaroniKid
  groups ≤ ~4d in `macaroni-last-run.json`, and the audit files reach `Cycle complete`.

If a rotation starts on 09-01, the ~15h tail estimate was wrong and the duration model
needs revisiting. If Group 2 does not run on 09-02, something beyond this mechanism is
broken. If `NONE` days continue AFTER both tasks are registered, intervention #5 has
failed and its ledger row must say so.

---

## Why concurrency is not free — the real constraint

Asked 2026-08-31: *"if Group 1 can run while MacaroniKid is running, why can't Group 2 run
while MacaroniKid is still going?"* The question is correct and exposed a contradiction in
an earlier draft of the options below, which accepted ~3h of overlap under option 1 while
rejecting the same overlap under option 4.

**There is no technical reason Group 2 cannot start.** `IgnoreNew` is a policy setting, not
a resource limit. MacaroniKid and the rotation are currently the *same task*, so "MacaroniKid
is still running" is identical to "the task is still running" and the trigger is refused.

The real blocker is **four shared mutable files**, not Chrome memory (which is what an
earlier draft claimed):

| File | Write pattern | Failure under concurrency |
|---|---|---|
| `.geocode-cache.json` | read → in-memory → `writeFileSync` of the whole file | last writer wins; the other process's geocoding is silently discarded, wasting rate-limited Nominatim calls |
| `scrapers/logs/scraper-summary.log` | `appendFileSync`, from 5 separate files | two runs interleave rows into one table; the diagnosis and `build-library-site-audit.js` parse that table and would read two runs as one |
| `scrapers/logs/scraper-checkpoint.json` | one global file keyed by group | `--resume` matches on `checkpoint.group`; concurrent runs clobber each other |
| `scrapers/logs/group-last-run.json` | read-modify-write of the whole object | a lost update in the starvation bookkeeping itself — exactly the 2026-08-20 "three days stale" bug |

**These apply equally to a "split the task but let it overlap" design.** That is why option 1
must also *spread* MacaroniKid across the cycle: the spreading is what keeps these files
single-writer, not a nicety about memory. Any option that permits two runner processes at
once must make all four concurrency-safe first.

Note the corollary: **option 3 is serialized by construction** — a deferred trigger fires
only after the running instance exits — so it sidesteps all four. That is its main virtue.

## DECIDED 2026-08-31 — option 1 implemented, with serialization replacing spreading

Intervention #5 implements option 1's split, but **serializes on the run lock instead of
re-partitioning MacaroniKid's states across the cycle**. This is a deliberate deviation
from the spreading half, argued on the arithmetic:

- Spreading MacaroniKid **evenly** (~14.5h/day) does not fit: Group 1 days would carry
  11.4h + 14.5h = 25.9h — still over 24h. Only an ANTI-balanced partition (least
  MacaroniKid on Group 1 days) fits, and it is fragile: measured MacaroniKid durations
  swing 60% between runs (G3: 12.8h → 8.1h), so any static partition drifts back over
  the line without anyone noticing — recreating this exact defect with extra steps.
- Serialization is robust to arbitrary duration drift: the worst case is a run starting
  hours late (visible as a logged lock wait), never a run being deleted. The rotation
  task's own duration stays under 24h regardless of what MacaroniKid does, so its trigger
  always fires; total cycle load (~66h of work per 72h) leaves slack for the backlog to
  drain, and if load ever grows past capacity the symptom is growing lock waits in the
  logs — detectable — rather than silent drops.
- Single-writer on the shared files becomes guaranteed ALWAYS (mutex), not just "in
  normal operation" (spreading) — strictly stronger on the integrity requirement.

If future measurements show lock waits growing without bound, spreading (anti-balanced)
is the follow-up lever; it layers cleanly on top of the split.

## Options, in the order they were evaluated (pre-decision record)

1. **Move the MacaroniKid tail to its own scheduled task, AND spread it across the cycle's
   three days.** Both halves are needed; the second is easy to miss.

   Phase durations, measured from the scheduled runs (all start 07:00:01Z):

   | Date | Group | Regular phase | MacaroniKid tail | Total |
   |---|---|---|---|---|
   | 08-24 | G3 | 4.0h | 12.8h | 16.9h |
   | 08-25 | **G1** | 10.6h | 15.5h | **26.1h** |
   | 08-27 | G2 | 6.9h | 15.2h | 22.1h |
   | 08-28 | **G1** | 11.0h | 14.7h | **25.7h** |
   | 08-30 | G3 | 4.4h | 8.1h | 12.5h |
   | 08-31 | **G1** | 11.4h | ~15h | **~26.4h** |

   **Only Group 1 consistently exceeds 24h**, and every dropped day followed a Group 1 run
   (08-26 after 08-25; 08-29 after 08-28; 09-01 predicted after 08-31). The regular phase
   alone never exceeds 11.4h, so splitting the tail off puts the rotation permanently inside
   24h and **the rotation trigger can never be discarded again** — `MultipleInstances` is
   per-task, so a long MacaroniKid run can no longer delete a rotation.

   **But splitting alone still leaves ~3h of overlap.** The rotation ends by 18:25Z, leaving
   a 12.6h idle window before the next 07:00Z trigger; MacaroniKid Group 1 needs 15.5h and
   does not fit. Two Chrome workloads would then overlap for ~3h — and `reports/fix-notes.json`
   records concurrent heavy Chrome as the leading suspect for a 37-scraper launch failure.
   Splitting Group 1's 9 states / 139 sites across the cycle's 3 days (~3 states, ~5h per
   day) fits the idle window comfortably and removes the overlap entirely.

   Cost: `recordGroupCompletion()` currently fires *after* the tail, so it must move, and the
   "only a run that reached the END counts" semantics need re-establishing across the split.
   This is the only option that addresses the 26h duration rather than the recovery.
2. **Lower `STARVATION_DAYS` from 4 to 3.0** — *not* 3.5. An earlier draft of this list said
   ~3.5; **that value does not work and the correction matters.** Replayed against the real
   `group-last-run.json` at the 2026-08-31 07:00Z trigger (G1=1.93d, G2=3.08d, G3=0.48d,
   calendar group 1):

   | `STARVATION_DAYS` | group that would have run |
   |---|---|
   | 4.0 (current) | Group 1 |
   | 3.5 | Group 1 |
   | 3.25 | Group 1 |
   | **3.0** | **Group 2** ✅ |

   A group that misses one turn sits at only ~3.08d when the next run starts, so any
   threshold above 3.0 misses it. Safety at 3.0 rests entirely on the existing
   `worst.group !== calendar` guard: in steady state the group aged ~3.0d *is* the calendar
   group, so no override happens. That guard is what makes 3.0 viable rather than chaotic,
   and it has not been exercised at this threshold.

   **This only helps on days a run actually starts** — the threshold is evaluated inside
   `selectGroup()`, so on a dropped day nothing reads it and the group just keeps aging. Its
   value is real but bounded: 5 of the last 7 days did start a run, and on those days it
   would redirect the run to the starved group.
3. **Set `StartWhenAvailable = True`** (currently `False`). Surfaced 2026-08-31 by the
   question "will a scraper run automatically if the starvation day is hit?" — the answer
   is no, and this setting is why. With it on, a trigger discarded at 07:00Z re-fires as
   soon as the running instance finishes (~09:56Z), and `selectGroup()` would then pick the
   starved group — so the armed-but-never-fired catch-up would actually execute. One
   checkbox, no code change, and it makes the existing `group-catchup.js` work as its author
   intended. **The cost is real though**: a 26h rotation restarting immediately on finishing
   means rotations run effectively back-to-back forever, with no idle window, permanently
   overlapping `FunHive-DataQuality` and leaving no gap for hand-runs. Cheaper than option 1
   but it treats the recovery, not the 26h duration.
4. **Set `MultipleInstances` to allow a second instance.** The most direct reading of the
   problem — Group 2 is refused only because a policy setting says so — and cheap to change.
   But it is the one option that creates **genuine concurrency**, so it requires the four
   shared files above to be made safe first (file locking, or per-run log/cache paths).
   Without that it trades a dropped rotation for silently corrupted summary tables and lost
   geocode results, which is a worse failure because it is invisible. Viable, but it is a
   code change, not a checkbox. Previously dismissed here on Chrome-memory grounds; that
   reasoning was wrong, and the file-safety reasoning replaces it.
5. **Do nothing and accept a 5–6 day cadence for whichever group is unlucky.** Honest
   status quo. Worth stating explicitly so it is a decision rather than a drift.

Raising `ExecutionTimeLimit` again is **not** an option — 26h already fits inside 36h.
