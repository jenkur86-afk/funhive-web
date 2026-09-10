# FunHive — Project Continuity Plan

**Closed 2026-09-10. Read this file first if the project is ever picked up again.**

This is the handover. It records what state the project was left in, what was switched off
and how to switch it back on, what lives outside git and would otherwise be lost, and what
decays on its own while nothing is running. It is written for someone with no memory of the
project — possibly you, in a year.

Everything in the repo was committed and pushed to `origin/main` before close
(`b022d14`). Nothing was left in a working tree.

---

## 1. State at close

| | |
|---|---|
| Last commit on `main` | `b022d14` — 2026-09-09 |
| Remote | `https://github.com/jenkur86-afk/funhive-web.git` |
| Registry | 278 entries, **185 active**, 93 inactive-region (deliberate) |
| Rotation groups | G1 = 60, G2 = 63, G3 = 62 active scrapers |
| Active region | `dmv` + `eastern` = 22 states |
| Database | 150,567 events · 61,436 activities · 2,262 click_events · 9,772 scraper_logs |
| Node / npm at close | v24.18.0 / 11.16.0 |

Progress snapshot from `STATUS.md` (2026-09-09), the trend ledger:

```
countiesResolve 100%  urlCollisions 0  confirmedBugs 281  unknownSites 354
specificAgeShare 46%  nameConformance 75.5%  sourceUrlCoverage 62%  countyCoverage 0
```

`nameConformance` and `sourceUrlCoverage` were already marked **stale** at close — they are
DB-derived and dated in `STALE_METRICS` inside `scripts/project-status.js`. Do not quote
them as current.

**In flight when the automation stopped:** a Group 3 rotation started 2026-09-10 03:00 and
a MacaroniKid group started 2026-09-09 15:00. Both were killed mid-run by the teardown.
That is safe and needs no cleanup — see §3.

---

## 2. What was switched off

Nothing was deleted. Every switch-off is reversible, and the reason is that the tuned
settings are the *product* of the work, not incidental to it: the execution limits, the
`IgnoreNew` / `StartWhenAvailable` combination and the group assignments all came out of
the rotation-starvation investigation in `ROTATION-STARVATION-LOG.md` and the runtime
rebalance in `CLAUDE.md`. Re-deriving them costs months. Re-enabling costs one command.

| What | How it was stopped | How to restore |
|---|---|---|
| `FunHive-Scrapers` (daily 3:00 AM) | disabled | `.\scrapers\task-scheduler\teardown-tasks.ps1 -Restore` |
| `FunHive-Macaroni` (daily 3:00 PM) | disabled | same |
| `FunHive-DataQuality` (daily 1:00 PM) | disabled | same |
| `FunHive-Monitor` (daily 8:00 AM) | disabled | same |
| `funhive-scraper-diagnosis` (Claude Code, 2:12 PM) | paused, `enabled: false` | re-enable in the Claude app's scheduled tasks |

### The one step that still needs a human

The four Windows tasks were registered from an **elevated** shell, so they can only be
disabled from one. The close-out session was not elevated and could not do it. Run this
once, from an **Administrator** PowerShell:

```powershell
cd C:\dev\funhive-web\scrapers\task-scheduler; .\teardown-tasks.ps1
```

`teardown-tasks.ps1` was written for this. It disables rather than deletes, stops any
in-flight run, and — importantly — **verifies by reading the task state back** rather than
trusting the call to have worked. That is not paranoia: `setup-tasks.ps1`'s own header
records that these are CIM cmdlets whose failures ignore `$ErrorActionPreference` *and*
slip past a surrounding `try/catch`, so on 2026-07-12 the setup script cheerfully printed
`Registered: ...` for two tasks it had entirely failed to create. Use `-Remove` to
unregister completely, `-Restore` to re-enable.

**Until that command is run, the four tasks are still armed and will keep scraping.**
The Claude Code diagnosis task is already paused and needs nothing further.

---

## 3. Killing the scrapers mid-run was safe — here is why, so nobody "repairs" it

Both scraper tasks were running when they were stopped. Nothing needs cleaning up:

- Events already written stay written.
- `_stableEventId` in `supabase-adapter.js` derives a deterministic id, so any future
  re-scrape **upserts in place** rather than duplicating.
- MacaroniKid records completion from its **results file, not its exit code**, so a killed
  group correctly reads as "did not complete" rather than as a false success.
- The one visible artefact is a stale `scrapers/logs/runner.lock`. The next full-group run
  detects the dead holder and breaks it, logging `🔨 Breaking stale runner lock`. That line
  is **designed behaviour, not an error** — it was observed and confirmed on 2026-09-09.

---

## 4. What lives outside git — the actual loss risks

The repo is safe on GitHub. These are not in it, and this section is the reason this
document exists.

### 4.1 Secrets — irreplaceable in practice

| File | Holds |
|---|---|
| `.env.local` | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (13 vars) |
| `scrapers/.env` | scraper-side Supabase credentials |
| `.env` | same family |

Gitignored on purpose and **must never be committed** — the repo is public. Copy these
three files to a password manager or an encrypted backup now. They can be regenerated from
the Supabase dashboard if lost, but only while the Supabase project still exists (§5.1).

### 4.2 `scrapers/.geocode-cache.json` — 2.6 MB, 31,275 cached geocodes

Expensive rather than impossible to rebuild. Nominatim is rate-limited to one request per
~2.5 s, so a cold cache is on the order of **21+ hours of wall-clock geocoding** spread
across early runs, plus the risk of 429s. Keep it. If it is lost the system still works,
just slowly and noisily at first.

### 4.3 `scrapers/logs/` — 83 MB, and `logs/` — 185 KB

The run history. Three things inside it are load-bearing rather than merely informational:

- `scraper-summary.log` — the **cumulative** per-scraper FOUND/NEW/DUPES/INVALID/TIME
  table. This is what the runtime-based group balancing was computed from, and what the
  site report's "Last run" column parses.
- `group-last-run.json` and `macaroni-last-run.json` — rotation state. Safe to lose:
  `selectGroup()` treats absent history as "not starved" and falls through to the calendar.
- `scraper-stdout.log` / `macaroni-stdout.log` — the only place per-library
  `📍 name … Found N events` lines exist. The library audit is a parse of these, so
  deleting them makes past cycles unreconstructable.

### 4.4 Database backup — taken at close

`node scripts/export-tables-backup.js` was run on 2026-09-10 and wrote to
`scripts/exports/` (gitignored):

| File | Rows | Size | Why it was chosen |
|---|---|---|---|
| `activities.json` | 61,437 | 61.8 MB | Includes the hand-curated `VenueList-*` families. CLAUDE.md is explicit that a new venue only appears when someone types it in — both automated OSM discovery attempts were abandoned. Losing this means re-typing it. |
| `click_events.json` | 2,262 | 1.1 MB | Real user analytics. **Genuinely irreplaceable** — no amount of re-scraping recreates a record of what people did. |
| `scraper_logs.json` | 9,774 | 2.7 MB | The evidence base for group balancing and the starvation log. |
| `MANIFEST.json` | — | — | Restore instructions and provenance. |

Verified after writing, not just counted: `click_events` came back with a real interaction
distribution (`view_event` 1548, `session_start` 344, `search` 34, …), which is the check
that matters — that table has **no SELECT policy**, so an anon-key read would have written
an empty file with no error at all. The export requires the service-role key and refuses to
run without it.

`events` was deliberately **not** exported. It re-scrapes, and see §5.2 for why a copy of it
would be near-worthless anyway.

> **`scripts/exports/` is gitignored and contains user analytics. Copy it somewhere durable
> yourself, and do not commit it.**

### 4.5 Other local-only items

`.claude/settings.json` (tool permissions for the diagnosis task), `.vercel/` (deployment
link), `node_modules/` in both roots (rebuildable), `.next/` (build output, rebuildable).

Two stale Claude agent worktrees from 2026-08-07 were pruned at close. Their uncommitted
changes were audit-section appends already superseded by properly committed `## 2026-08-08`
sections in both audit files; the diffs were preserved anyway at
`archive/stale-worktree-diffs-2026-09-10.patch` so pruning destroyed nothing.

---

## 5. What decays while nothing is running

### 5.1 The Supabase project will pause — this is the main clock

The project is on the **free tier**, which pauses after roughly a week of inactivity, and
long-dormant free projects can eventually be removed altogether. Unpausing is normally one
click in the dashboard, but it is not guaranteed forever.

**If the project is gone, so are the credentials in §4.1 and every table not backed up in
§4.4 — including all 150k events.** The backup is the hedge; the dashboard is the thing to
check first on any restart.

### 5.2 Every event becomes past-dated, and the first cleanup will delete nearly all of them

This is the single most alarming-looking thing about a restart, so it is written down here
rather than discovered.

`events` holds ~150k rows, almost all dated within a ~60-day forward window from
2026-09-10. After a few months dormant, **every one of them is in the past**. The moment
`fix-all` runs, its past-event deletion step will remove essentially the whole table.

That is correct behaviour, not corruption, and not a bug to investigate. It is also why
exporting `events` was judged near-pointless: the rows would be deleted by the first
data-quality pass after any restart.

The public site does not need that deletion to look empty — it filters on `date >= today`,
so it will show nothing well before the cleanup runs.

### 5.3 The live site keeps serving

Vercel auto-deploys `main` and was **not** touched — nothing in the close-out could change
it, since `src/**` is off-limits to the automation and no Vercel credentials were used.
The site stays up and will show an empty or near-empty event list once the data ages out.

**This is a decision left to you**, deliberately: pause or delete the Vercel project, or
leave it serving. Nothing in this repo does it for you.

### 5.4 Scraper targets rot

185 active scrapers point at real third-party sites. Libraries migrate platforms, domains
lapse, DOMs change. At close, 281 sites were already confirmed-broken and 354 unknown. That
number only grows while nothing is maintaining it, so **treat the first post-restart run as
a survey, not as a regression**.

---

## 6. Cold restart — in order

The ordering matters; several steps fail confusingly if done out of sequence.

1. **Unpause the Supabase project** in the dashboard. Everything else fails without it, and
   fails in ways that look like code bugs.
2. **Restore the secrets** from §4.1 into `.env.local`, `scrapers/.env`, `.env`. If they are
   lost, regenerate from Supabase → Project Settings → API.
3. **Two separate npm installs** — this catches people every time:
   ```bash
   npm install
   cd scrapers && npm install
   ```
   `scrapers/package.json` is a different dependency set (puppeteer-extra and friends).
4. **Restore `scrapers/.geocode-cache.json`** if you have it (§4.2). Optional but saves a
   day of geocoding.
5. **Verify the pipeline before trusting anything:**
   ```bash
   node scripts/preflight-diagnosis.js
   node scripts/test-age-detection.js       # expect 162/162
   node scripts/test-whofi-extractor.js     # expect 27/27
   ```
   The preflight asserts the repo is writable, the database answers, and — most valuable —
   that each audit builder still emits a table the report generator can actually parse. A
   producer/consumer format disagreement there fails **silently** and makes a broken run
   look identical to a healthy one.
6. **Run one scraper by hand** and read the output before enabling anything scheduled:
   ```bash
   npm run scraper -- --scraper WhoFi-Libraries
   ```
   Cheap (two HTTP fetches, no browser) and it exercises the whole save path.
7. **Then** re-enable the automation, from an elevated PowerShell:
   ```powershell
   cd C:\dev\funhive-web\scrapers\task-scheduler; .\teardown-tasks.ps1 -Restore
   ```
8. Expect the first data-quality run to delete almost every event (§5.2). Expect a
   `Breaking stale runner lock` line (§3). Neither is a fault.

### Constraints that are not obvious and have each caused an incident

- **Do not re-chain MacaroniKid into the rotation.** It was the rotation's tail until
  2026-08-31 and pushed runs to ~26h against a 24h trigger, silently discarding the next
  day's rotation. It owns its own task now.
- **Do not let the two scraper tasks share a stdout capture file.** They did until
  2026-09-02; `cmd.exe` will not share a `>>` target between processes, so the rotation
  died before node even launched, with no log at all.
- **Do not re-chain the data-quality pass onto the scraper task.** That chain stopped
  executing silently for ten days in August when the batch hit its time limit before
  reaching the fix-all line — while the detached node child finished the scrape, so
  everything *looked* healthy.
- **Never `.range()` without `.order()`** on a paginated Supabase read. That is what
  destroyed ~17,000 events on 2026-05-15.
- **Never put `min_age`, `max_age` or `is_free` in a `.select()` on `events`.** Those
  columns exist only on `activities`; the request 400s and burns egress on every retry.

---

## 7. Where the knowledge lives

Read in this order. These files are the project's memory and are all committed.

| File | What it is |
|---|---|
| `CLAUDE.md` | **The single most important file.** Schema, Never-Do / Always-Do rules, bandwidth limits, scraper naming, the automation table. |
| `PROJECT-CONTINUITY.md` | This file. |
| `MASTER-PLAN.md` | The phased plan. Phase 8 (UNVERIFIABLE backlog) was the active phase at close. |
| `STATUS.md` | Trend ledger, newest first, with machine-readable snapshots per entry. |
| `ROTATION-STARVATION-LOG.md` | The intervention ledger for dropped rotations, with a falsifiable prediction per entry. Read before touching scheduling. |
| `SCRAPER-DIAGNOSIS-PROMPT.md` | The diagnosis playbook — categories, evidence bar, fix-log schema. |
| `SCRIPT-WRITING-PROMPT.md` | Conventions for anything new in `scripts/`. |
| `SCRAPER-FIX-LOG.jsonl` | Append-only, one line per logical fix. Read it before re-investigating anything. |
| `LIBRARY-SITE-AUDIT.md` / `AGE-RANGE-AUDIT.md` | Per-site inventories, one row per individual site. **"No aggregation, ever."** |
| `reports/site-report.html` | Browsable projection of the audits. Regenerate, never hand-edit. |
| `reports/fix-notes.json` | Owner's pinned notes plus `_pending`: changes made whose effect has not been observed yet. **32 entries were open at close.** |
| `reports/verification-comments.json` | 2,095 per-site verdicts — 708 MATCHES, 1,033 MISMATCH, 354 UNVERIFIABLE. |
| `TODO.md` | Feature/growth backlog, as distinct from scraper repair. |

---

## 8. Where to pick the work back up

`scripts/project-status.js --save` prints the next action and costs zero Supabase egress —
it reads only local files. At close it said:

> **NEXT ACTION: Work down the UNVERIFIABLE backlog (MASTER-PLAN Phase 8).**

354 sites remain unknown. What was established, so it is not re-learned the hard way:

- **Re-fetching is not the lever.** Three separate full passes returned ~1.5–7% yield. The
  sites are unverifiable for durable reasons and a fourth pass will mostly reproduce them.
- **The tractable slice is the 193 "renders-nothing" rows**, which Phase 10a/10b owns as
  the `CONFIGURED-ZERO` population.
- **~15 of the all-ages verdicts are a genuine floor** — their venue no longer has any rows,
  so no fetch and no query can answer them. Whether to retire those from the store is an
  **open owner decision**, recorded in `_pending` and deliberately not made by any script.
- **`reports/fix-notes.json` `_pending` holds 32 entries** — each is a change already made
  whose predicted effect had not yet been observed. Several were waiting on rotations that
  will now never run, so on any restart, work through them and clear the ones whose trigger
  has passed rather than treating them as fresh work.

One habit worth carrying over, because it caught two separate bad batches in the final
session: **when a mechanical pass returns a suspiciously clean result, spot-check the raw
rows before believing it.** A tally of "25 MATCHES, 0 MISMATCH" meant the detector was
blind, not that the data was healthy.
