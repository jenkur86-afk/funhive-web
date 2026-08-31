# Rotation Starvation — implementation brief

Paste everything between PASTE START and PASTE END.

Context: this was diagnosed across the 2026-08-31 scraper diagnosis. The findings are
already recorded in `ROTATION-STARVATION-LOG.md` at repo root — **read that file first**, it
carries the intervention ledger, the measured data, and three corrections made during the
diagnosis that are easy to re-derive wrongly.

---

## PASTE START

You are fixing a recurring scheduling defect in the FunHive scraper fleet. Read
`CLAUDE.md` and `ROTATION-STARVATION-LOG.md` in full before changing anything.

**The standard for this work, set by the project owner: no cheap fixes.** A genuine
long-term fix that does not risk the site's data integrity. Four cheaper mitigations were
identified and explicitly rejected — do not implement them as shortcuts, and do not
re-propose them:

- Lowering `STARVATION_DAYS` (a mitigation; only redirects runs that already start)
- `StartWhenAvailable = True` (serialized, but makes rotations run back-to-back forever)
- `MultipleInstances` allowing a second instance (creates real concurrency on unsafe files)
- Raising `ExecutionTimeLimit` (already 36h; the limit was never the binding constraint)

### The defect

Three facts combine; none is a bug alone.

1. A Group 1 rotation takes **~26 hours**.
2. The `FunHive-Scrapers` trigger fires every **24 hours** (daily 03:00, one trigger, no
   repetition).
3. The task is registered `MultipleInstances=IgnoreNew` **and** `StartWhenAvailable=False`,
   `RestartCount=0` — so a trigger that fires during a run is **discarded and never
   retried**. Silently: no error, no log file, no `LastTaskResult` anomaly.

Net: every Group 1 run deletes the following day's rotation. Measured phase durations, all
scheduled runs starting 07:00:01Z:

| Date | Group | Regular phase | MacaroniKid tail | Total |
|---|---|---|---|---|
| 08-24 | G3 | 4.0h | 12.8h | 16.9h |
| 08-25 | **G1** | 10.6h | 15.5h | **26.1h** |
| 08-27 | G2 | 6.9h | 15.2h | 22.1h |
| 08-28 | **G1** | 11.0h | 14.7h | **25.7h** |
| 08-30 | G3 | 4.4h | 8.1h | 12.5h |
| 08-31 | **G1** | 11.4h | ~15h | **~26.4h** |

**Only Group 1 exceeds 24h**, and every dropped day followed a Group 1 run (2026-08-26
after 08-25; 2026-08-29 after 08-28). The regular phase alone never exceeds 11.4h — the
MacaroniKid tail is what pushes it over.

Consequence: Group 2 is the perpetual victim. It has gone 5–6 days between runs instead of
3. On 2026-08-31, 27 of the 28 active library scrapers missing from the audit cycle were
Group 2, and three `_pending` items in `reports/fix-notes.json` are blocked on a Group 2
rotation that keeps not arriving.

**`group-catchup.js` cannot fix this.** `selectGroup()` is called at
`local-scraper-runner.js:645`, *inside* the runner — it only chooses which group an
already-started run works on. It cannot cause a run to happen. On a dropped day nothing
evaluates it.

### The fix — two independent layers. Both are required.

#### Layer 1 — integrity (do this first; it is the part that must not be skipped)

Four shared mutable files are unsafe if two runner processes ever overlap. Today they never
overlap only because the scheduler refuses the second run — which is the very bug being
fixed. **Removing that accidental protection without making these safe would trade a
visible dropped rotation for silent data corruption, which is strictly worse.**

| File | Current write pattern | Failure under overlap |
|---|---|---|
| `.geocode-cache.json` | read → in-memory → `writeFileSync` of the whole file | last writer wins; the other process's geocoding is discarded, wasting rate-limited Nominatim calls (429s are already frequent) |
| `scrapers/logs/scraper-summary.log` | `appendFileSync`, written from **5** files (`local-scraper-runner.js`, the three `macaroni-runner-group*.js`, `helpers/scraper-summary-logger.js`) | two runs interleave rows into one table; the daily diagnosis and `scripts/build-library-site-audit.js` parse that table and would read two runs as one |
| `scrapers/logs/scraper-checkpoint.json` | one global file keyed by group | `--resume` matches on `checkpoint.group`; concurrent runs clobber each other |
| `scrapers/logs/group-last-run.json` | read-modify-write of the whole object | a lost update in the starvation bookkeeping itself — this exact bug occurred 2026-08-20 |

Requirements:
- Atomic writes for the JSON state files (write temp + rename), and re-read immediately
  before modifying so a concurrent update is not clobbered.
- A **run lock** so two runner processes cannot interleave by accident, whatever the
  scheduling. A second process must **fail loudly and log why** — it must not silently exit
  (that recreates the invisible-drop bug in userspace) and must not wait unboundedly.
- Per-run separation or locking for `scraper-summary.log` such that its table can never
  interleave. The diagnosis parses this file; a malformed table is a silent failure. See the
  2026-08-31 fix in `scripts/build-age-range-audit.js` for the same class of bug.

#### Layer 2 — capacity

- **Move the MacaroniKid tail out of `local-scraper-runner.js` into its own scheduled task.**
  Currently `runMacaroniGroup()` spawns `macaroni-runner-group{N}.js` via
  `child_process.spawnSync` at the end of the run. Because they are one task, "MacaroniKid is
  still running" is identical to "the task is still running" and the next trigger is refused.
  Splitting them means `MultipleInstances` is evaluated per task and **a long MacaroniKid run
  can no longer delete a rotation.**
- **Spread MacaroniKid across the cycle's three days.** Splitting alone is not enough: the
  rotation ends by ~18:25Z leaving a 12.6h idle window, and MacaroniKid Group 1 needs 15.5h —
  it would still overlap the next rotation by ~3h. Group 1 covers **9 states / ~139 sites**;
  roughly 3 states (~5h) per day fits the window comfortably and keeps the shared files
  single-writer in normal operation.
- **`recordGroupCompletion()` currently fires *after* the MacaroniKid tail**, deliberately, so
  that a run killed before the tail stays marked starved. That semantic must be preserved
  across the split — decide explicitly what "the group completed" means once the tail is a
  separate task, and write the reasoning into `group-catchup.js`'s header comment.
- After the split, re-evaluate `STARVATION_DAYS`. It is currently 4 against a 3-day rotation,
  so it only rescues a group after **two** consecutive missed turns. Replayed against real
  data at the 2026-08-31 trigger (G1=1.93d, G2=3.08d, G3=0.48d, calendar group 1): thresholds
  4.0, 3.5 and 3.25 all still pick Group 1; only **3.0** picks Group 2. If rotations can no
  longer be dropped, the right answer may be to leave it as a backstop rather than tune it —
  argue the choice, do not just set a number.

### Hard constraints

- **Do not restructure the runner while a rotation is in flight.** Check first:
  `Get-ScheduledTaskInfo -TaskName FunHive-Scrapers` (`267009` = still running) and the tail
  of `scrapers/logs/scraper-run-<today>.log`. The MacaroniKid child is spawned at runtime, so
  editing files it may still load mid-run is a real hazard.
- `scrapers/task-scheduler/setup-tasks.ps1` is the source of truth for task registration and
  asserts settings on read-back. Any new task goes there, not into an ad-hoc `schtasks` call.
  Registering requires elevation.
- Run `node -c <file>` on every modified `.js`.
- Do not touch `src/**`, `public/**`, `next.config.*`, or `package.json` — those auto-deploy
  to Vercel.
- Follow CLAUDE.md's pagination rule if you write any query: always `.order()` before
  `.range()`.

### Acceptance criteria

The fix is proven only when all of these hold:

1. `node scripts/preflight-diagnosis.js` reports **no `NONE` days** in its
   `recent rotations all started` line across a full 3-day cycle after the change.
2. `scrapers/logs/group-last-run.json` shows all three groups advancing on a ~3-day cadence,
   with no group exceeding ~4 days.
3. A deliberate concurrency test: start two runner processes simultaneously and confirm the
   second fails loudly, and that `scraper-summary.log`, `.geocode-cache.json`,
   `group-last-run.json` and `scraper-checkpoint.json` are all intact afterwards.
4. `AGE-RANGE-AUDIT.md` / `LIBRARY-SITE-AUDIT.md` reach a **`Cycle complete`** marker — Group
   2's scrapers appear in the cycle rather than being listed as a rotation gap.

### Recording the work

- Add a row to the intervention ledger in `ROTATION-STARVATION-LOG.md` **with a falsifiable
  prediction**, and update it with the measured outcome on a later run. That file exists
  because three previous fixes were recorded as successes without one. Do not add a fix
  without a prediction.
- One `SCRAPER-FIX-LOG.jsonl` line, `category: "code-bug"`.
- Update the standing prediction in that file's "Current state" section.
- The daily diagnosis reports against this file as report item 14 (see
  `~/.claude/scheduled-tasks/funhive-scraper-diagnosis/SKILL.md`).

### Things already done — do not redo

- `scripts/preflight-diagnosis.js` gained `checkRotationStarted()` on 2026-08-31: it parses
  the last 7 `scraper-run-<date>.log` files for a `Running Group N` line. **Detection only.**
  It is how you will verify your fix; do not mistake it for one.
- Step 1's staleness guard in the diagnosis SKILL.md now carries an explicit warning that it
  cannot detect a dropped rotation — the guard is anti-correlated with the failure, because
  an overrunning run writes *fresher* log lines than a healthy one.

## PASTE END
