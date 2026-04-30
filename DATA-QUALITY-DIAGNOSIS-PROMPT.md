# FunHive Data Quality Diagnosis Prompt

Copy everything below the line and paste it into a new conversation after running `node scripts/data-quality-check.js`. Paste the full output after the prompt.

---

## Instructions

I just ran `node scripts/data-quality-check.js` on my FunHive database. Analyze the full output I'm pasting below and fix ALL issues — both data fixes (run scripts against the DB) and scraper code fixes (so issues don't recur).

Do not ask me questions — just fix everything you can. For anything that requires running against the live DB (which you can't reach from the sandbox), write or update a fix script and tell me what to run.

### Fix scripts overview

The pipeline runs on a tiered cadence (Apr 2026):

**Daily** (~5 MB + 50–150 MB egress):
- `node scripts/data-quality-quick.js` — Count-only audit using Postgres aggregates (no row downloads).
- `bash scripts/fix-all.sh --recent-only` — Runs all four fix steps against the last 72h only (configurable via `FIX_WINDOW_HOURS=N`). Deletion-style steps (past events, junk titles, dateless events) always full-scan because those queries use selective columns and we always want stale junk gone.

**Monthly** (~2.5 GB egress):
- `bash scripts/fix-all.sh` — Full sweep across all four steps.
- `node scripts/data-quality-check.js` — Deep audit (this prompt) with duplicates, distributions, scraper health, and sample issues.

**Steps inside fix-all.sh:**

1. **`scripts/fix-all-data-quality.js --save [--recent-only]`** — age range normalization, adult event deletion (by age_range), past event deletion, date backfill (parsed TIMESTAMPTZ from event_date text)
2. **`scripts/cleanup-nonfamily-events.js --save [--recent-only]`** — catches non-family events by name/description keywords (burlesque, cannabis, 21+, sexy, etc.). saveEvent now rejects most of these at scrape time; this remains as a backstop.
3. **`scripts/fix-event-quality.js --save [--recent-only]`** — junk title deletion, dateless event deletion, past event deletion, missing state, missing geohash, missing city (reverse geocode), missing location (forward geocode), missing start_time/end_time (parsed from event_date text), PLUS the same fixes for the **activities table** (missing geohash, city, location). **Description backfill removed** — descriptions stay empty if the scraper didn't supply one.
4. **`scripts/fix-missing-fields.js --save --addresses [--recent-only]`** — backfill activity addresses via reverse geocode (Nominatim). Description backfill disabled.

`scripts/fix-duplicate-dates.js` was retired Apr 2026 (Communico scraper bug fixed); old copy in `scripts/archive/`.

### Bandwidth management (Supabase free plan — 5.5 GB egress limit)

- Stick to the tiered cadence above. Daily `--recent-only` runs are cheap because saveEvent/saveActivity now do almost all validation at scrape time (junk titles, non-family, cancelled, past, age normalization, geohash compute from lat/lng, parsed date from event_date text). Most rows have nothing left to fix by the time the script gets to them.
- When writing or modifying fix scripts, always use `.select('column1, column2, ...')` with only the columns the script actually reads — never `select('*')`. Each full-table scan of events (~500k rows) with all columns costs ~100-500 MB of egress.
- The `fetchAll()` pattern in existing scripts already uses selective columns — preserve this when making changes. Each script's `fetchAll` also accepts a `skipRecentFilter: true` flag on filter objects so deletion-style steps can full-scan even in `--recent-only` mode.
- Prefer batched updates over individual row updates to minimize round-trips.

### What to look for and fix

**1. Past events still in DB**
- These need to be deleted. Both `scripts/fix-all-data-quality.js` and `scripts/fix-event-quality.js` handle this. Tell me to run `bash fix-all.sh`.

**2. Adult/non-family events**
- Should be deleted from the events table. Two scripts catch these:
  - `scripts/fix-all-data-quality.js` deletes events where age_range normalizes to "Adults"
  - `scripts/cleanup-nonfamily-events.js` deletes events matching explicit non-family keywords in name/description (burlesque, cannabis, sexy, 21+, booze, etc.)
- If new patterns are slipping through (shown in the "Adult event samples" section), add them to `scripts/cleanup-nonfamily-events.js` AUTO_DELETE_PATTERNS.
- Also check `NON_FAMILY_PATTERNS` in `supabase-adapter.js` `saveEvent()` so scrapers reject these at save time going forward.
- Check `FAMILY_RESCUE_PATTERNS` in `supabase-adapter.js` and `FAMILY_RESCUE` in `data-quality-check.js` for false positives — add rescue patterns for kid-friendly terms being misdetected.

**3. Cancelled/postponed events**
- Should be deleted. Check `scripts/fix-cancelled-events.js` and `supabase-adapter.js` `isCancelledEvent()` — add any new patterns if needed.

**4. Duplicate events**
- Check the duplicate groups listed in the output. Determine root cause: is it a scraper saving the same event with different IDs? Missing dedup logic? The `idx_events_unique_content` constraint should catch most, but scrapers may generate different IDs for the same event.
- Fix the scraper's ID generation or add URL-based dedup. Write a cleanup script to remove extra copies.

**5. Missing critical fields (events)**
- **Missing geohash / missing location**: These events won't show on the map. `scripts/fix-event-quality.js` computes geohash from existing coordinates and geocodes location from city+state. **Check the "By scraper" breakdown** — if one scraper dominates, the root cause is in that scraper's geocoding chain. Common causes: (a) missing county in `scrapers/utils/county-centroids.js` so the last-resort fallback fails, (b) the scraper doesn't pass city/address to the location object, (c) the scraper's geocoding helper is broken. Cross-reference each scraper's site list counties against the centroids file.
- **Missing state / invalid state**: Fix in the scraper that produced them (check the "By scraper/source" section to identify which). Also handled by `scripts/fix-event-quality.js`.
- **Missing event_date**: Events without dates are useless — `scripts/fix-event-quality.js` deletes them.
- **Missing parsed date (TIMESTAMPTZ)**: The `date` column is null but `event_date` text exists. `scripts/fix-all-data-quality.js` parses and backfills these. **Check the "By scraper" breakdown** — if a scraper family (e.g., all MacaroniKid scrapers) dominates, the root cause is that the scraper's eventDoc never sets a `date` field. The correct pattern is `date: admin.firestore.Timestamp.fromDate(dateObj)`. The backfill script is a safety net, not a substitute for fixing the scraper — without `date`, events are invisible to date-filtered queries until the backfill runs.

**6. Missing important fields (events)**
- **Missing description**: `scripts/fix-event-quality.js` generates from name + category + venue + city.
- **Missing venue**: Check if the scraper is failing to extract it. Fix the scraper's extraction logic.
- **Missing city**: `scripts/fix-event-quality.js` reverse-geocodes from coordinates if available.
- **Missing category**: Run categorization using `event-categorization-helper.js` on events with null category.
- **Missing age_range**: Run `scripts/fix-all-data-quality.js --save` to normalize. Check if scrapers are failing to extract age ranges.
- **Missing start_time / end_time**: `scripts/fix-event-quality.js` parses times from `event_date` text (e.g., "April 21 at 10:00 AM - 12:00 PM"). If new date formats aren't being parsed, add patterns to `parseTimesFromEventDate()` in `scripts/fix-event-quality.js`.
- **Junk titles**: `scripts/fix-event-quality.js` deletes events with very short, all-caps gibberish, or navigation-junk titles.

**7. Missing fields (activities table)**
- **Missing geohash, city, location, description** in the activities table are ALL handled by `scripts/fix-event-quality.js` Steps 9-12.

**8. Zero-event scrapers (from Scraper Health section)**
- For each zero-event scraper listed, investigate:
  - Is the URL still valid? Visit the live site to check.
  - Did the site change platforms? (e.g., Communico vs LibraryCalendar vs LibNet)
  - Is the scraper already covered by a different scraper? (remove duplicates from registry)
  - Is it a page rendering issue? (domcontentloaded vs networkidle2 for SPAs)
  - Do CSS selectors still match the live site?
- Fix the scraper code or remove it from the registry if it's a duplicate.

**9. Failed scrapers**
- Read the error messages in the output. Common causes:
  - Missing npm module → add to `scraperDependencies` in `package.json`, tell me to `npm install`
  - Timeout → increase timeout or switch to `networkidle2`
  - Protocol/connection error → check browser restart logic
  - Rate limiting (429) → increase delay between requests

**10. Age range distribution anomalies**
- If there are many non-standard age_range values (anything other than the 5 brackets, multi-bracket combos like "Kids (6-8), Tweens (9-12)", or "All Ages"), the normalization in `scripts/fix-all-data-quality.js` needs new patterns. Add them and tell me to re-run.

**11. State/category distribution skew**
- If "MISSING" or "Uncategorized" appear high in the distribution, trace which scrapers are producing them and fix those scrapers.

### How to fix

- Read the relevant scraper files, helper files, and fix scripts before making changes
- For **scraper code fixes** (prevent future issues): edit the scraper files directly
- For **database fixes** (clean up existing data): update the appropriate `scripts/fix-*.js` script and tell me exactly what to run
- When fixing MacaroniKid scrapers, remember all 45 files share the same structure — use a script to apply changes to all of them
- When missing location/geohash is high for a scraper, cross-reference its site list counties against `scrapers/utils/county-centroids.js` and add any missing counties
- Run `node -c filename.js` syntax check on every modified file
- At the end, do NOT tell me to run `bash fix-all.sh` or `node scripts/data-quality-check.js` — I already run those myself before and after using this prompt. Just list any scraper code fixes or new patterns you added.

### Final summary — REQUIRED format

End your response with a section titled **"Changes to push"** that I cannot miss. Be explicit and prescriptive:

1. **List every file you modified**, in two groups:
   - **Scraper / script changes** (`scrapers/**`, `database/**`, `scripts/**`) — pushing is for backup/version control only and does **not** trigger a Vercel deploy.
   - **Website changes** (`src/**`, `public/**`, `next.config.*`, `package.json`, `package-lock.json`) — pushing **WILL** auto-deploy to Vercel from `main`. Call this out loudly so I can review the diff before pushing if I want.

2. **Run `git status` for me first** before recommending any commit. If the working tree contains files I didn't ask you to touch (other uncommitted edits from prior sessions, etc.), list them under a separate heading "Other uncommitted changes — review before staging". Do not assume I want them committed.

3. **Give me copy-paste-ready git commands**, one per line (no backslash continuations — they break in pasted blocks). Use a single `git add` per file or per small group. Avoid parentheses in commit messages (zsh chokes on them). Example shape:

   ```
   git add scripts/fix-foo.js scripts/fix-bar.js
   git commit -m "Short imperative summary - no parens"
   git push origin main
   ```

4. **State whether `npm install` is needed** and in which directory.

5. If a fix only updates a `scripts/fix-*.js` file, remind me that running it locally is what actually cleans the DB — pushing alone changes nothing in Supabase.

6. If any change does NOT need to be pushed, say so explicitly. Default assumption: I want changes committed and pushed for backup.

Do not bury push instructions in prose. Make them a checklist I can follow without re-reading the rest of the response.

### Data quality check output

(paste full output below)
