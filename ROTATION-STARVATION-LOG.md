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

## Current state — 2026-08-31

- Rotations in the last 7 days: `08-31=G1 08-30=G3 08-29=NONE 08-28=G1 08-27=G2 08-26=NONE 08-25=G1`
- **Two dropped rotations in 7 days.** Both were Group 2's turn.
- `group-last-run.json`: G1 = 2.5d, G2 = **3.6d**, G3 = 1.0d.
- Group 2 last completed **2026-08-27**.
- Consequence: 27 of the 28 active library scrapers with no row in the current audit cycle
  are Group 2. Three `_pending` items (`WORDPRESS-MONTHGRID-UNRUN`,
  `SIMPLEVIEW-DAYGRID-PARTIAL`, `SIMPLEVIEW-VENUE-COLLAPSE-BACKLOG`) are blocked on a
  Group 2 rotation that keeps not arriving.

**Prediction on record for 2026-09-01** (falsifiable — check it on the next run): today's
Group 1 run entered its MacaroniKid tail at 18:25:55Z. At the measured 14.7–15.5h that
finishes **09:07Z–09:56Z on 09-01**, past the 07:00Z trigger. **Group 2's 09-01 turn will
be dropped**, making three consecutive lost turns and a ~9-day gap. If Group 2 *does* run
on 09-01, this prediction was wrong and the duration model needs revisiting.

---

## Options, in the order I would take them

1. **Move the MacaroniKid tail to its own scheduled task.** Attacks the root cause: the
   rotation drops from ~26h to ~11.4h, comfortably inside 24h, and nothing is dropped any
   more. MacaroniKid then runs on its own cadence and can overrun freely without eating
   anything. Cost: `recordGroupCompletion()` currently fires *after* the tail and would
   need to move, and the group-completion semantics ("only a run that reached the END
   counts") need re-establishing for the split. This is the only option that fixes the
   cause rather than the recovery.
2. **Lower `STARVATION_DAYS` from 4 to ~3.5.** One constant. Makes a *single* missed turn
   recoverable the next day instead of requiring two. Does not stop rotations being
   dropped — it just stops a dropped one compounding. Risk: set too low and the calendar
   group's own ~3d age could trip it, shuffling the rotation; the existing
   `worst.group !== calendar` guard mitigates this but has not been tested at 3.5.
3. **Set `MultipleInstances` to queue rather than `IgnoreNew`.** Superficially obvious, and
   probably wrong: it would start Group 2 immediately on top of a still-running Group 1,
   putting two Chrome-heavy rotations on the machine at once. `reports/fix-notes.json`
   already records concurrent heavy Chrome workloads as the leading suspect for a
   37-scraper launch failure. Not recommended without a concurrency guard.
4. **Do nothing and accept a 5–6 day cadence for whichever group is unlucky.** Honest
   status quo. Worth stating explicitly so it is a decision rather than a drift.

Raising `ExecutionTimeLimit` again is **not** an option — 26h already fits inside 36h.
