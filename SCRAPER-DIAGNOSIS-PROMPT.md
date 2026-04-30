# FunHive Scraper Diagnosis Prompt

Copy everything below the line and paste it into a new conversation after running scrapers. Paste the full scraper output after the prompt.

---

## Instructions

I just ran FunHive scrapers. Analyze the full output I'm pasting below and fix ALL issues. Do not ask me questions — just fix everything you can.

### What to look for and fix

**1. Zero-event scrapers (Found 0 URLs / 0 new / 0 updated)**
- Check if the scraper URL is correct by visiting the live site
- Check if the site changed platforms (e.g., Communico vs LibraryCalendar vs LibNet)
- Check if the scraper is already covered by a different scraper (remove duplicates)
- Check page rendering issues (domcontentloaded vs networkidle2 for SPAs)
- Check if CSS selectors still match the live site structure
- Check if the site now blocks scrapers (User-Agent, rate limiting, CAPTCHAs)

**2. Skipped events due to invalid dates**
- Check `date-normalization-helper.js` — does it handle the date format being skipped?
- Common formats to watch for: "Month Day @ Time", timezone abbreviations (EST/PST), localized day abbreviations (Sá., Lu.), periods in month abbreviations (Apr.), date ranges with dashes
- Add new normalization rules if needed, and verify all existing date tests still pass

**3. Database errors**
- `23505` duplicate key / unique constraint (`idx_events_unique_content`): Ensure row-by-row fallback with `ignoreDuplicates: true` exists in `supabase-adapter.js`
- Foreign key constraint (`activity_id_fkey`): Ensure retry-without-activity_id pattern exists in the scraper
- Index row size overflow (> 2704 bytes): Ensure field truncation exists in both `saveEvent()` and `flattenEvent()` in `supabase-adapter.js`

**4. Navigation/junk elements extracted as events**
- Look for event names that are clearly menu items, headers, or footer links
- Add filtering patterns to the scraper's extraction function (like the NAV_JUNK_PATTERNS filter)

**5. Geocoding failures**
- 429 rate limiting: Check delay between requests (should be ≥2.5s for Nominatim)
- Excessive "no coords" counts: Check geocoding fallback chain (address → venue → city → county centroid)
- Check User-Agent string is descriptive (not generic)

**6. Fatal errors / crashes**
- Missing npm modules: Add to `scraperDependencies` in `package.json` and note what I need to `npm install`
- Protocol/connection errors: Check browser restart logic in the scraper's main loop
- Timeout errors: Consider increasing timeout or switching to `networkidle2`

**7. Data quality issues**
- Events with no description, no venue, no age range
- Promotional/newsletter events that slipped through filters
- Events with "See website" as venue when a real venue exists on the page

**8. Missing `date` TIMESTAMPTZ column in eventDoc**
- Open the scraper file and check if the eventDoc includes a `date` field (not just `eventDate`)
- `eventDate` maps to the TEXT column — needed for display but sorts alphabetically
- `date` maps to the TIMESTAMPTZ column — needed for all date filtering and sorting queries
- The correct pattern is: `date: admin.firestore.Timestamp.fromDate(dateObj)` where dateObj is a parsed Date object
- If `date` is missing, events won't appear in date-filtered queries (supplementary location queries, non-location queries, custom date ranges)
- The `nearby_events` RPC only checks `event_date IS NOT NULL`, so events may appear in location searches but vanish when a date range is applied
- MacaroniKid scrapers were the most common offenders — as of April 2026, all 44 MK scrapers have been fixed with the `dateTimestamp` pattern

**9. Missing county centroids for scraper sites**
- Open `scrapers/utils/county-centroids.js` and cross-reference against every `county` value used in the scraper's site list
- If a county is missing, events that fail address/venue/city geocoding have no geometry fallback → invisible to `nearby_events` RPC
- Look for high `noLocation` counts in the scraper summary — this signals the centroid fallback isn't working
- Also check that the centroid coordinates are reasonable (not swapped lat/lng, not in the wrong state)

**10. Generic venue fallback (all events geocoded to one location)**
- Look for geocoding lines like `Geocoding failed for "XYZ State Parks, XYZ State Parks, ST"` where the venue name matches the generic scraper config name rather than a specific park, museum, library branch, etc.
- This means per-event venue names extracted from the DOM are being discarded at save time — the scraper passes a single generic venue to `saveEventsWithGeocoding` instead of one venue per unique location
- **Symptoms**: All events from a source share the same coordinates (usually a state centroid). The geocoding log shows the generic source name repeated for every batch. Events cluster at the geographic center of the state on the map instead of spreading across actual venues.
- **The fix** is always in how the scraper builds its `venues` array (or `libraries` array) for `saveEventsWithGeocoding` — it should create one venue entry per unique `event.venueName` or `event.location`, not one per state/source
- Check that extraction functions actually populate the `location` field from DOM elements (park names, branch names, venue fields) rather than leaving it empty and falling back to the config-level name

### Bandwidth management (Supabase free plan — 5.5 GB egress limit)

- The venue cache in `venue-matcher.js` is the single largest egress source. It loads all activities into memory with a **30-minute TTL** and selective columns (id, name, city, state, address, location, geohash, category). Do NOT reduce the TTL or add more columns to the cache query.
- When writing new scrapers or fix scripts that read from Supabase, always use `.select('column1, column2, ...')` with only the columns you need — never `select('*')`.
- If a scraper needs to check for duplicates, use the existing `checkDuplicate()` in `supabase-adapter.js` which selects only `id, name`.
- Data quality runs on a tiered cadence (Apr 2026):
  - **Daily**: `node scripts/data-quality-quick.js` (count-only audit, ~5 MB) and `bash scripts/fix-all.sh --recent-only` (last 72h, ~50–150 MB).
  - **Monthly**: `bash scripts/fix-all.sh` (full sweep, ~1.5–2 GB) and `node scripts/data-quality-check.js` (deep audit, ~500 MB).
  - Override window with `FIX_WINDOW_HOURS=N` (e.g., 168 for a week-long catch-up).
- The scrapers' `saveEvent()` and `saveActivity()` now do almost all validation at scrape time: junk-title rejection (`isJunkTitle()`), non-family rejection (including sexy/cannabis/420/firearms/gambling/nightclub patterns synced from `cleanup-nonfamily-events.js`), cancelled rejection, past-event rejection, age normalization, adult-only rejection, time extraction, venue cleaning, geohash compute from lat/lng, and `event_date` text → `date` TIMESTAMPTZ parsing. Most rows no longer need backfill — daily fix runs do very little work.

### How to fix

- Read the relevant scraper file(s) and helper files before making changes
- Apply fixes directly — edit the code
- When fixing MacaroniKid scrapers, remember all 44 files share the same structure. Use a script to apply changes to all of them if the fix applies broadly
- Run `node -c filename.js` syntax check on every modified file
- For date normalization changes, verify against the test cases in the date helper
- Summarize what you fixed and what I need to do (e.g., `npm install`, re-run a specific scraper)

### Final summary — REQUIRED format

End your response with a section titled **"Changes to push"** that I cannot miss. Be explicit and prescriptive:

1. **List every file you modified**, in two groups:
   - **Scraper changes** (`scrapers/**`, `database/**`, `scripts/**`) — these run locally; pushing is for backup/version control only and does **not** trigger a Vercel deploy.
   - **Website changes** (`src/**`, `public/**`, `next.config.*`, `package.json`, `package-lock.json`) — pushing **WILL** auto-deploy to Vercel from `main`. Call this out loudly so I can review the diff before pushing if I want.

2. **Run `git status` for me first** before recommending any commit. If the working tree contains files I didn't ask you to touch (other uncommitted edits from prior sessions, the `.geocode-cache.json` file, etc.), list them under a separate heading "Other uncommitted changes — review before staging". Do not assume I want them committed.

3. **Give me copy-paste-ready git commands**, one per line (no backslash continuations — they break in pasted blocks). Use a single `git add` per file or per small group. Avoid parentheses in commit messages (zsh chokes on them). Example shape:

   ```
   git add scrapers/helpers/foo.js scrapers/helpers/bar.js
   git add scrapers/scraper-baz.js
   git commit -m "Short imperative summary - no parens"
   git push origin main
   ```

4. **State whether `npm install` is needed.** If you added a dependency to `scrapers/package.json` or the root `package.json`, say so and tell me which directory to run it in. If no new deps, say "No `npm install` needed."

5. **State which scrapers I should re-run** to confirm the fixes worked, and what specific log line to look for (e.g. "Master line should now show `Found: N, New: M, Duplicates: K` instead of `0/0/0`").

6. If any change does NOT need to be pushed (e.g. the fix only affects scraper behavior locally and I run scrapers from this machine), say so explicitly. Default assumption: I want changes committed and pushed for backup.

Do not bury push instructions in prose. Make them a checklist I can follow without re-reading the rest of the response.

### Scraper output

(paste full output below)
