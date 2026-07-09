# Scraper Fix Plan

> **ARCHIVED 2026-07-09.** This was a one-time phased plan for activating scraper regions (DMV → eastern → central → western), not a recurring workflow. Phases 1–4 (DMV, eastern) are done — `dmv` and `eastern` are both active in `scrapers/region-config.json`. Phases 5–6 (central, western) were never started; the checklists below are still a reasonable starting point if that work resumes. For day-to-day scraper fixes, use `SCRAPER-DIAGNOSIS-PROMPT.md` at the repo root instead — this file's own "Progress log" went stale (last entry 2026-05-15) once that became the actual workflow.

Single source of truth for the scraper triage that started 2026-05-14 after the data-quality-check on 2026-05-10. Any Cowork/Claude Code session picking up this work should read this file first, scan the **Progress log** at the bottom for the latest state, then resume at the next un-checked item.

---

## Critical context that's easy to miss

### 1. The region filter is the single biggest source of "broken" scrapers

`scrapers/region-config.json` has:

```json
"activeRegions": ["dmv", "eastern"],
"regions": {
  "dmv":     { "active": true,  "states": ["DC","MD","VA"] },
  "eastern": { "active": false, "states": [...20 states] },
  "central": { "active": false, "states": [...16 states] },
  "western": { "active": false, "states": [...13 states] }
}
```

`getActiveStates()` in `scrapers/scraper-registry.js` returns states from regions where `active === true` only — so **only DMV (DC/MD/VA) currently runs**. Eastern is listed in `activeRegions` but its `active` flag is `false`, so it's excluded.

`isScraperActive(scraperConfig, activeStates)`:
- Returns true if `scraperConfig.state === 'Multi'` (so multi-state scrapers always run)
- Returns true if `scraperConfig.state` is in `activeStates` (DC/MD/VA)
- Returns false otherwise

**Implication:** the 101 "never-ran" scrapers and most of the 11 "zero-event" scrapers are not buggy — they're filtered out by region. They will only run once `eastern.active`, `central.active`, or `western.active` is flipped to `true`. Don't waste time "fixing" a scraper that's intentionally disabled.

### 2. How to tell "real bug" vs "filtered out by region"

For each scraper in the audit, look up its `state` in `scrapers/scraper-registry.js`:
- `state: 'DC' | 'MD' | 'VA'` → currently active, real bug if zero-event
- `state: 'Multi'` → currently active, real bug if zero-event
- anything else → inactive by region, not a bug

### 3. saveEvent guard rails (added 2026-05-10/11)

The save path now rejects:
- Junk titles (nav links, 404 pages, all-caps fragments)
- Non-family events (incl. "Adult Coloring", girls/moms night out, cannabis, etc.)
- Cancelled / placeholder-venue events
- Past events
- Dateless events
- **Time-only `event_date` strings** like `"2:00pm–3:00pm"` (Communico/BiblioCommons API bug)
- **Literal `"Invalid Date"` strings** (BiblioCommons malformed `def.start`)
- HTML / newline garbage in `event_date`

If a scraper is "running but produces 0 events," check the console output for `⏭️ Skipping ...` lines — that's the guard rejecting bad data, not a scraper failure. Real failures look like `TypeError`, `timeout`, `403`, etc.

---

## Inventory

### Group A — Real bugs (currently active region, producing 0 events)

| Scraper | File | State | Group | Sites | Most likely root cause |
|---|---|---|---|---|---|
| **Localist-Parks** | `scraper-localist-parks.js` | Multi | 2 | PA State Parks, IN State Parks | All sites are outside DMV. Either: (a) move sites to a DMV-relevant parks file, (b) gate per-site by `getActiveStates()`, or (c) remove from registry until eastern activates. |
| **KidsOutAndAbout-DMV** | `scraper-kidsoutandabout-dmv.js` | Multi | 1 | dmv.kidsoutandabout.com | Producing events but also pulling **out-of-region events** (Portland OR Chess A2Z, etc.) Add a "DMV only" filter to drop events whose detected city/venue clearly isn't in DC/MD/VA/DE. |

### Group B — Inactive-region scrapers, fix only when their region activates

These are flagged "zero-event" or "never-ran" in audits but are filtered out by `region-config.json`. **Do not fix yet.** When eastern/central/western activates, this list becomes the triage queue.

#### Eastern (`active: false`) — ~30 scrapers
- `Communico-MA` (Worcester Public Library) — `scraper-communico-libraries-CA-CO-DC-FL-GA-IL-MA-MD-TX-VA.js`
- `Communico-NY` (Westchester) — same file
- `Communico-PA` (Chester County, Montgomery County-Norristown) — same file
- `BiblioCommons-NJ` (Burlington County) — `scraper-bibliocommons-libraries-CA-CO-IL-MA-TX-VA-WA.js`
- `Drupal-Pennsylvania` (Lancaster, York) — `scraper-drupal-libraries-PA.js`
- `EventON-Lexington` (Lexington County SC) — `scraper-eventon-lexington-sc.js`
- All `LibCal-*` for FL/GA/LA/MA/NC/NJ/NY1/NY2/PA/RI/SC/TN
- All `WordPress-*` for ME/VT/MA/RI/CT/NY/NJ/PA/DE/WV/NC/SC/GA/FL/AL/MS/TN/KY
- All `LibraryMarket-*` for CT/PA/NC/SC/GA
- `BiblioCommons-DC` (DC is technically DMV — verify state field)

#### Central (`active: false`) — ~30 scrapers
- `Communico-IA` (Waterloo) — same shared Communico file
- `Communico-IL` (Schaumburg, Vernon Area)
- `Communico-WI` (Madison)
- `BiblioCommons-IL` (Chicago, Aurora, Evanston)
- `BiblioCommons-MN` (Hennepin, St. Paul)
- `BiblioCommons-MO` (St. Louis, Kansas City)
- `BiblioCommons-OH` (Cincinnati, Cleveland, Cuyahoga)
- `LibCal-OH`, `LibCal-IA`, `LibCal-MN`, `LibCal-TX`
- `WordPress-*` for OH/IN/MI/IL/WI/MN/IA/MO/AR/LA/KS/NE/SD/ND/OK/TX
- `LibraryMarket-IA`, `LibraryMarket-IL`, `LibraryMarket-WI`, `LibraryMarket-IN`, `LibraryMarket-MN`
- `Brooklyn-Library`, `Free Library of Philadelphia` (PA — but PA is eastern not central; recheck)
- `San Antonio Library`, `Houston-Library`, `Dallas-Library`

#### Western (`active: false`) — ~25 scrapers
- `Communico-CA` (Riverside County)
- `Communico-NV` (Las Vegas-Clark County) — currently zero-event
- `Communico-OR` (Multnomah County) — currently zero-event
- `BiblioCommons-CA2` (Alameda, San Mateo, San Diego × 2)
- `BiblioCommons-AZ` (Pima County)
- `BiblioCommons-CO` (Arapahoe, Jefferson County)
- `LibCal-CA`, `LibCal-CO`, `LibCal-WA`
- `LA-Public-Library`, `San Antonio Library` (verify region)
- All `WordPress-*` for CO/WA/OR/IN/UT/AZ/NV/NM/ID/MT/WY/AK/HI

> The exact split depends on `region-config.json`. The lists above are best-effort from registry inspection — verify in the source file before declaring a scraper out of scope.

### Group C — Recent scraper fixes (committed 2026-05-14 in `8ab07a9`) needing live validation

These fixes can only be validated against real API responses, which the sandbox can't reach.

| Fix | File | Validation step |
|---|---|---|
| Communico API `eventDate` fallback to `raw_start_time` instead of `item.time_string` | `scraper-communico-libraries-CA-CO-DC-FL-GA-IL-MA-MD-TX-VA.js` lines ~1115–1135 | After next scrape, query: events scraped in last 24h from any Communico library where `event_date` looks like `"2:00pm–3:00pm"`. Expected: 0 results. |
| BiblioCommons `isNaN(startDate.getTime())` guard | `scraper-bibliocommons-libraries-CA-CO-IL-MA-TX-VA-WA.js` lines ~660–685 | After next scrape, query: events scraped in last 24h from any BiblioCommons library where `event_date LIKE 'Invalid Date%'`. Expected: 0 results. |
| saveEvent time-only / Invalid-Date reject | `scrapers/helpers/supabase-adapter.js` | Run a scraper with `DEBUG_SAVE=1` and grep for `Skipping time-only event_date` or `Skipping "Invalid Date" event`. |

---

## Phased plan

> Check items off in-place by changing `[ ]` to `[x]` when done. Append dated notes in the **Progress log** at the bottom.

### Phase 1 — Localist-Parks (the only Group A scraper that's just broken)

- [ ] Decide policy: do PA and IN state parks events belong in the DB while eastern/central are inactive?
  - If **no** (recommended for now): remove `Localist-Parks` from `scrapers/scraper-registry.js` OR set `state: 'PA'` so the region filter excludes it. Add note to re-enable when eastern activates.
  - If **yes**: leave registered, but add a `console.log` so a future audit doesn't flag it as broken.
- [ ] If keeping it, gate per-site inside `scraper-localist-parks.js` by calling `loadRegionConfig()` + filtering `LOCALIST_CONFIGS` before the loop.
- [ ] Run once manually: `node scrapers/scraper-localist-parks.js`. Verify event count > 0 if the gate logic permits.

### Phase 2 — KidsOutAndAbout-DMV out-of-region drift

These events showed up in the 2026-05-11 audit:
- `Chess A2Z March Webinar` — venue `10940 SW Barnes Rd 247` (Portland, OR)
- `Winged Canvas`, `Illustrated Animation Classes Online` — online-only, no real location

- [ ] Read `scrapers/scraper-kidsoutandabout-dmv.js` end-to-end. Identify where event venue/address is extracted.
- [ ] Add a post-extraction filter: if the resolved state is not in `["DC","MD","VA","DE"]` AND the event is not "online-only", skip the event (log via `console.log(\`  ⏭️ Out-of-region: ...\`)`)
- [ ] For online-only events: either skip (FunHive is geo-based) or assign `state: 'DC'` as a default. Decide policy.
- [ ] Run manually against one calendar page. Compare counts before/after.
- [ ] After deploy, run `data-quality-quick.js` and confirm `Missing state` count drops.

### Phase 3 — Validate the 2026-05-14 scraper fixes against live data

After the next scheduled scraper run that includes a Communico or BiblioCommons-VA scraper:

- [ ] Run `node scripts/data-quality-quick.js`. Check the "Missing date (TIMESTAMPTZ)" count — should be near 0 if the fixes worked.
- [ ] Spot-check a few recently-scraped Communico events in Supabase. Verify `event_date` is a real date string, not `"X:XXpm–Y:YYpm"`.
- [ ] Spot-check BiblioCommons-VA events. Verify no `event_date` starts with `"Invalid Date"`.
- [ ] If any regressions: re-open Phase 3 sub-issues in this file; do not silently re-fix.

### Phase 4 — Decide on eastern region activation

Eastern coverage would bring 20 states (ME, NH, VT, MA, RI, CT, NY, NJ, PA, DE, WV, NC, SC, GA, FL, AL, MS, TN, KY) into the rotation. This unlocks ~30 currently-inactive scrapers.

- [ ] Confirm activation is wanted. If not, mark Group B Eastern scrapers as "intentionally inactive" in their registry comments and stop.
- [ ] If activating: edit `scrapers/region-config.json`, set `regions.eastern.active = true`.
- [ ] Run one full sweep: `bash scripts/fix-all.sh` (NOT `--recent-only`). Expect ~50–150 MB of new geocoding traffic.
- [ ] Audit which eastern scrapers actually returned events. Re-run `data-quality-check.js`.
- [ ] For each eastern scraper that returned 0 events:
  - [ ] Open the live URL in a browser. Confirm the site still exists at that URL.
  - [ ] If the site moved platforms (e.g. Communico → LibraryCalendar), update the registry entry to point at the right scraper file.
  - [ ] If the CSS selectors are stale (Puppeteer paths), update them.
  - [ ] If the API endpoint changed, update the URL in the config block.
  - [ ] Run the single scraper manually: `node scrapers/scraper-NAME.js`. Confirm > 0 events.
- [ ] Update Group B Eastern table above with one of: `✓ fixed`, `⚠ site dead — removed from registry`, `⊘ deferred — needs platform migration`.

### Phase 5 — Central region activation

Same shape as Phase 4, but for central states.

- [ ] Decide whether/when to activate.
- [ ] If activating: flip `regions.central.active = true`.
- [ ] For each newly-running scraper that returns 0 events, follow the same investigation checklist as Phase 4.

### Phase 6 — Western region activation

Same shape, western states.

- [ ] Decide whether/when to activate.
- [ ] If activating: flip `regions.western.active = true`.
- [ ] Follow the Phase 4 investigation checklist.

### Phase 7 — Per-scraper deep audit (only if a region is partially failing)

For any specific scraper still returning 0 after Phase 4/5/6:

1. **Live URL check.** Visit the site. Is the calendar there? Did it move?
2. **Platform check.** Right-click → View Page Source. Is there an API endpoint (look for `/api/`, `/wp-json/`, `/eeventcaldata`)? If yes, prefer the API path over Puppeteer.
3. **Selector check.** Open DevTools, inspect an event card, verify the scraper's CSS selectors still match. The current scraper code is the ground truth — read it before patching.
4. **Page-load strategy.** SPAs need `waitUntil: 'networkidle2'` or explicit `waitForSelector`. Static pages can use `domcontentloaded`. If you're waiting for the wrong event, the page may be incomplete when scraping.
5. **Header / cookie check.** Some sites block default User-Agents. The Communico scraper already sets `User-Agent: Mozilla/5.0 ...`.
6. **Rate limit / 429.** Add `await sleep(2000)` between requests if the site is aggressive.
7. **Dependency check.** `require('./helpers/event-save-helper')` vs `require('./event-save-helper')` — many scrapers have inconsistent paths. Verify the file exists at the path being required.

For each fix:
- [ ] Edit the scraper file.
- [ ] `node -c scrapers/<file>.js` to syntax-check.
- [ ] Run manually to confirm.
- [ ] Commit with message `Fix <scraper-name>: <one-line root cause>`.
- [ ] Update Group B table.

---

## Quick references

### Files that get touched a lot

- `scrapers/scraper-registry.js` — where scrapers are listed; check `state:` field
- `scrapers/region-config.json` — which regions are active
- `scrapers/helpers/supabase-adapter.js` — `saveEvent`, `flattenEvent`, all the reject rules
- `scrapers/helpers/geocoding-helper.js` — `geocodeWithFallback` (the good one)
- `scrapers/helpers/macaroni-geocoding-helper.js` — separate fork for MK scrapers
- `scripts/data-quality-quick.js` — count-only audit (cheap, ~5 MB egress)
- `scripts/data-quality-check.js` — deep audit (~500 MB egress; monthly only)
- `scripts/fix-all.sh` — orchestrates daily/monthly cleanup
- `scripts/fix-broken-event-dates.js` — deletes time-only / "Invalid Date" rows
- `scripts/fix-event-state.js` — backfills state for events the main cleanup couldn't infer
- `scripts/fix-null-dates.js` — backfills the `date` TIMESTAMPTZ column (current parser is unable to recover what the source bug already destroyed)

### Recent commits

- `8ab07a9` — 2026-05-14 — Reject time-only and Invalid-Date event_date strings; fix Communico/BiblioCommons scrapers; harder state inference

### Useful one-liners

```bash
# Which scrapers does the registry think are active right now?
node -e "const r=require('./scrapers/scraper-registry'); const a=r.getActiveStates(); console.log('Active states:', a); console.log('Active scrapers:', Object.entries(r.SCRAPERS).filter(([n,c])=>r.isScraperActive(c,a)).map(([n])=>n).join('\n'));"

# Syntax-check a scraper
node -c scrapers/scraper-NAME.js

# Run one scraper manually
node scrapers/scraper-NAME.js

# Cheap re-audit
node scripts/data-quality-quick.js
```

---

## Progress log

Append a dated entry every session that touches this file. Newest at the top.

### 2026-05-15 — PAGINATION INSTABILITY INCIDENT (data loss)

- Ran `node scripts/diagnose-duplicates.js --save` against the full table. **Deleted ~17,024 events** (69,370 → 52,346).
- Subsequent read-only run reported 13,868 more dupe groups / 18,500 extras with the same pattern.
- **Root cause was the diagnostic, not the data.** Increasing the displayed id length revealed every "duplicate" row in a group had the **identical UUID** (e.g. `cd77f78f-eb66-4c44-846d-bc20c5f9d336` × 5). That's impossible for a Postgres PRIMARY KEY — so the "5 copies" was actually **one real row, fetched 5 times** by an un-ordered paginated SELECT.
- Supabase `.range(from, from + N)` does not guarantee deterministic row order without an `ORDER BY` clause. Without it, the same row can appear in multiple pages.
- The dedup-by-id `.in('id', [...])` deletion deduplicated at the SQL layer, so 23,521 queued ids became ~17,031 unique ids → ~17,000 real rows were deleted (the "kept" oldest from each fake group). Most were probably legitimate events.
- **Same bug exists** (or existed before this session) in `scripts/fix-event-quality.js` Step 2b. The 3576-row delete from the 2026-05-14 `fix-all.sh --recent-only` run was likely a mix of real `.add()`-random-UUID duplicates and pagination artifacts — hard to tell exactly what fraction.
- **Patched in this session:** added `.order('id', { ascending: true })` to every `.range()` paginator in `scripts/`:
  - `diagnose-duplicates.js`, `fix-event-quality.js` (the destructive two)
  - `cleanup-nonfamily-events.js`, `fix-all-data-quality.js`, `fix-broken-event-dates.js`, `fix-duplicate-activities.js`, `fix-duplicate-venues.js`, `fix-event-state.js`, `fix-missing-fields.js`, `fix-null-dates.js`, `data-quality-check.js`, `data-quality-fix.js`. (`fix-missing-venue.js` already had `.order('created_at')`.)
- **What the user has to do next:**
  - Push the patches: `git add scripts/ && git commit -m "Fix paginator instability across scripts" && git push origin main`
  - Re-run `node scripts/diagnose-duplicates.js` (READ ONLY) with the fix. If the dupe-group count is now near 0, the pre-fix diagnostic was entirely pagination noise. If it's still high but with truly different ids per group, those are real dupes from the `.add()` random-UUID bug.
  - Recover the lost rows: re-scrape. The scrapers will repopulate. Verify by checking event total count climbs back from 52,346.
- **Open question:** also need to audit the scrapers' own paginated `db.collection(...).where(...)` reads in `scrapers/helpers/supabase-adapter.js` — those run on every scrape, but they fetch single-row dedup checks which don't paginate, so probably fine. Confirm before re-running scrapers heavily.

### 2026-05-14 (session 3 — after diagnose-duplicates ran)
- Ran `diagnose-duplicates.js` against full table. **Found 19,329 dupe groups / 24,859 extra rows** — much larger than the 3576 the morning's `--recent-only` cleanup caught.
- **All groups are within-scraper, same-run, same-URL.** Not URL drift, not cross-scraper overlap. The pattern is "single scrape session inserted the same row N times."
- **Top contributors:** FestivalGuides-Eastern (6024), FairsFestivals-Eastern (2935), Eventbrite-Family-Eastern (845), RecDeskParks-ccrec (386), BarnesNoble-Eastern (364), then a long Macaroni Kid tail (Attleboro 331, Franklin-Milford 327, SW Boston 222, Cedar Rapids 218, Cranston 203, Wheaton 201, …).
- Festival aggregators dominate, which matches the `.add()` random-UUID hypothesis. The Macaroni Kid contributions are unexpected — MK scrapers use `db.collection('events').doc(eventId).set(event)` with `generateEventId(url)`, so same URL should produce same id and `.set` should upsert. **Open question:** what's making MK produce dupes? Could be the per-URL pre-check race (`existingDoc.exists` fails on the first save in the batch, both calls then `.set` with the same id, second `.set` overwrites — that wouldn't dupe; but if `.set` is going through the `.add` path under some condition it would). Worth investigating in a follow-up session.
- **Action:** added `--save` mode to `scripts/diagnose-duplicates.js` so the existing 24,859 can be deleted without running the full `fix-all.sh` sweep (cheaper egress). User to run `node scripts/diagnose-duplicates.js --save`, then re-run without `--save` after the next scheduled scrape to confirm new dupes stopped.

### 2026-05-14 (session 2)
- Investigated the 3576-duplicate cluster from the morning's `fix-all.sh --recent-only` run.
- **Root cause:** `supabase-adapter.js` line 1141 — the Firestore-compat `.add()` was minting `crypto.randomUUID()` for every call when the scraper didn't pre-set `data.id`. 89 scrapers call `.add()` without setting an id, so every re-scrape produced a fresh random row with identical content.
- **Confirmation:** `scraper-festivals-eastern-us.js` line 682 (`db.collection('events').add(eventDoc)`) imports `generateEventIdFromDetails` at line 33 but never uses it. The pre-check at line 601 only runs when `event.url` is non-empty, which is unreliable for festival-aggregator data.
- **Fix:** added `_stableEventId(data)` / `_stableActivityId(data)` helpers in `supabase-adapter.js`. `.add()` now derives a deterministic id from URL (normalized — strips query string / trailing slash / fragment) or from `name|eventDate|venue` (case-insensitive), falling back to UUID only when nothing else is available. Same content → same id → upsert dedupes naturally. The DB's `idx_events_unique_content` constraint provides defense-in-depth.
- **Verification:** unit-tested the helper against URL drift (trailing slash, `?utm_source=newsletter`), case variance, and the no-URL fallback — all five invariants hold.
- **Diagnostic script added:** `scripts/diagnose-duplicates.js` — read-only, reports within-scraper vs cross-scraper, URL variance, temporal pattern, top-contributing scrapers, optional CSV. Run after the next scrape cycle to verify dupes stopped.
- Not yet pushed — confirm one more time with the user, then commit.

### 2026-05-14 (session 1)
- Created this plan after pushing commit `8ab07a9`.
- Catalogued zero-event vs never-ran scrapers; discovered the region-config gates explain most "never-ran" entries.
- Identified Localist-Parks and KidsOutAndAbout-DMV as the only Group A (real bug, active region) items.
- Deferred Group B work until eastern region is explicitly activated.
- No scraper code changes in this session beyond what's already in `8ab07a9`.
