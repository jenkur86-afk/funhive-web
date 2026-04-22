# FunHive Data Quality Diagnosis Prompt

Copy everything below the line and paste it into a new conversation after running `node data-quality-check.js`. Paste the full output after the prompt.

---

## Instructions

I just ran `node data-quality-check.js` on my FunHive database. Analyze the full output I'm pasting below and fix ALL issues — both data fixes (run scripts against the DB) and scraper code fixes (so issues don't recur).

Do not ask me questions — just fix everything you can. For anything that requires running against the live DB (which you can't reach from the sandbox), write or update a fix script and tell me what to run.

### Fix scripts overview

There are three fix scripts, all run together via `bash fix-all.sh`:

1. **`fix-all-data-quality.js --save`** — age range normalization, adult event deletion (by age_range), past event deletion, date backfill (parsed TIMESTAMPTZ from event_date text)
2. **`cleanup-nonfamily-events.js --save`** — catches non-family events by name/description keywords (burlesque, cannabis, 21+, sexy, etc.) that the age-range check misses
3. **`fix-event-quality.js --save`** — junk title deletion, dateless event deletion, past event deletion, missing state, missing geohash, missing city (reverse geocode), missing location (forward geocode), missing description generation, missing start_time/end_time (parsed from event_date text), PLUS all the same fixes for the **activities table** (missing geohash, city, location, description)

The combined runner script is `fix-all.sh` — it runs all three in order and stops on any failure.

### What to look for and fix

**1. Past events still in DB**
- These need to be deleted. Both `fix-all-data-quality.js` and `fix-event-quality.js` handle this. Tell me to run `bash fix-all.sh`.

**2. Adult/non-family events**
- Should be deleted from the events table. Two scripts catch these:
  - `fix-all-data-quality.js` deletes events where age_range normalizes to "Adults"
  - `cleanup-nonfamily-events.js` deletes events matching explicit non-family keywords in name/description (burlesque, cannabis, sexy, 21+, booze, etc.)
- If new patterns are slipping through (shown in the "Adult event samples" section), add them to `cleanup-nonfamily-events.js` AUTO_DELETE_PATTERNS.
- Also check `NON_FAMILY_PATTERNS` in `supabase-adapter.js` `saveEvent()` so scrapers reject these at save time going forward.
- Check `FAMILY_RESCUE_PATTERNS` in `supabase-adapter.js` and `FAMILY_RESCUE` in `data-quality-check.js` for false positives — add rescue patterns for kid-friendly terms being misdetected.

**3. Cancelled/postponed events**
- Should be deleted. Check `fix-cancelled-events.js` and `supabase-adapter.js` `isCancelledEvent()` — add any new patterns if needed.

**4. Duplicate events**
- Check the duplicate groups listed in the output. Determine root cause: is it a scraper saving the same event with different IDs? Missing dedup logic? The `idx_events_unique_content` constraint should catch most, but scrapers may generate different IDs for the same event.
- Fix the scraper's ID generation or add URL-based dedup. Write a cleanup script to remove extra copies.

**5. Missing critical fields (events)**
- **Missing geohash / missing location**: These events won't show on the map. `fix-event-quality.js` computes geohash from existing coordinates and geocodes location from city+state.
- **Missing state / invalid state**: Fix in the scraper that produced them (check the "By scraper/source" section to identify which). Also handled by `fix-event-quality.js`.
- **Missing event_date**: Events without dates are useless — `fix-event-quality.js` deletes them.
- **Missing parsed date (TIMESTAMPTZ)**: The `date` column is null but `event_date` text exists. `fix-all-data-quality.js` parses and backfills these.

**6. Missing important fields (events)**
- **Missing description**: `fix-event-quality.js` generates from name + category + venue + city.
- **Missing venue**: Check if the scraper is failing to extract it. Fix the scraper's extraction logic.
- **Missing city**: `fix-event-quality.js` reverse-geocodes from coordinates if available.
- **Missing category**: Run categorization using `event-categorization-helper.js` on events with null category.
- **Missing age_range**: Run `fix-all-data-quality.js --save` to normalize. Check if scrapers are failing to extract age ranges.
- **Missing start_time / end_time**: `fix-event-quality.js` parses times from `event_date` text (e.g., "April 21 at 10:00 AM - 12:00 PM"). If new date formats aren't being parsed, add patterns to `parseTimesFromEventDate()` in `fix-event-quality.js`.
- **Junk titles**: `fix-event-quality.js` deletes events with very short, all-caps gibberish, or navigation-junk titles.

**7. Missing fields (activities table)**
- **Missing geohash, city, location, description** in the activities table are ALL handled by `fix-event-quality.js` Steps 9-12.

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
- If there are many non-standard age_range values (anything other than the 5 brackets, multi-bracket combos like "Kids (6-8), Tweens (9-12)", or "All Ages"), the normalization in `fix-all-data-quality.js` needs new patterns. Add them and tell me to re-run.

**11. State/category distribution skew**
- If "MISSING" or "Uncategorized" appear high in the distribution, trace which scrapers are producing them and fix those scrapers.

### How to fix

- Read the relevant scraper files, helper files, and fix scripts before making changes
- For **scraper code fixes** (prevent future issues): edit the scraper files directly
- For **database fixes** (clean up existing data): update the appropriate `fix-*.js` script and tell me exactly what to run
- When fixing MacaroniKid scrapers, remember all 45 files share the same structure — use a script to apply changes to all of them
- Run `node -c filename.js` syntax check on every modified file
- At the end, do NOT tell me to run `bash fix-all.sh` or `node data-quality-check.js` — I already run those myself before and after using this prompt. Just list any scraper code fixes or new patterns you added.

### Data quality check output

(paste full output below)
