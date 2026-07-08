# FunHive Scraper Diagnosis — Work Doc

HOW TO USE:
1. Run scrapers: `npm run scraper -- --group N` (from `C:\dev\funhive-web`)
2. Open a new Claude session
3. Copy everything between PASTE START and PASTE END below
4. Paste it in, then paste your full scraper output at the bottom

<!-- ==================== PASTE START ==================== -->

I just ran FunHive scrapers on Windows (`C:\dev\funhive-web`). Analyze the full output I'm pasting below and fix ALL issues. Do not ask me questions — just fix everything you can.

### Active region context (critical — read before diagnosing)

Active scraper regions are set in `scrapers/region-config.json`. **Currently active: `dmv` + `eastern`** — 22 states total: DC, MD, VA, ME, NH, VT, MA, RI, CT, NY, NJ, PA, DE, WV, NC, SC, GA, FL, AL, MS, TN, KY.

A scraper is active if `scraper.state === 'Multi'` OR `scraper.state` is in the active list. `isScraperActive()` in `scraper-registry.js` is the source of truth. **Do not "fix" a scraper from an inactive state (OH, CA, TX, WA, etc.) — it is intentionally disabled.** Inactive scrapers produce no log output at all; they won't appear in the log you're reading.

Active scraper counts (July 2026): Group 1 = 51, Group 2 = 49, Group 3 = 45.

### What to look for and fix

**1. Zero-event scrapers (Found 0 URLs / 0 new / 0 updated)**
- Check if the scraper URL is correct by visiting the live site
- Check if the site changed platforms (e.g., Communico vs LibraryCalendar vs LibNet)
- Check if the scraper is already covered by a different scraper (remove duplicates)
- Check page rendering issues (domcontentloaded vs networkidle2 for SPAs)
- Check if CSS selectors still match the live site structure
- Check if the site now blocks scrapers (User-Agent, rate limiting, CAPTCHAs)
- **For multi-venue scrapers** (ones that loop over a VENUES array): collect all zero-event venue entries from the log, then spawn a subagent with WebFetch to check every URL simultaneously. Do not ask which to investigate — check all of them, fix all fixable issues (URL rot, wrong selectors), and list the unfixable ones (WAF-blocked, down, genuinely empty) at the end. This is the expected autonomous workflow for any scraper covering 20+ venues. See Section 13 for the full diagnosis workflow.
- **Eventbrite DOM fallback**: Eventbrite stopped serving JSON-LD on search result pages (observed 2026). If a scraper uses Eventbrite search pages and the log shows "Found N events via DOM" for every state but geocoding later fails, verify that the DOM extraction code parses `city` from the location element text (e.g., text after the `•` separator in the card's location string). An empty `city: ''` from the DOM path will cascade to state centroid geocoding for every event. See Section 12.

**2. Skipped events due to invalid dates**
- The MK summary line now exposes silent skips: `✅ N new | 🔄 M updated | ⏭️ P past | ⏩ F future | ❓ X no-date | ⚠️ W no coords` (added 2026-05-25).
  - `⏩ F future` = events beyond the 60-day scrape window. Usually fine; large numbers just mean the source publishes far ahead.
  - `❓ X no-date` = events where extraction returned no `eventDate`. This is the silent path where invalid date strings vanish — any site with consistently `❓ > 0` is a date-format issue worth investigating.
- **Scrapers built on `saveEventsWithGeocoding()`/`saveEventsSimple()` in `helpers/event-save-helper.js`** (this covers ~50 scraper files) report the breakdown in their return value as separate `duplicates` and `invalidDate` fields — do not read `skipped` alone as "duplicates". `local-scraper-runner.js`'s per-scraper table has a dedicated `INVALID` column for this; a nonzero `InvalidDate` count in the completion line or table is a real extraction bug, distinct from actual duplicate detection. (Before 2026-07-05 both were merged into one `skipped` counter and the runner mislabeled the whole bucket as "Duplicates" — fixed in that commit, but if you're diagnosing an older log line that just says `Duplicates: N` with no `InvalidDate` field, treat a suspiciously high number as possibly-actually-invalid-dates and check the raw `⚠️ Skipping event with invalid date: "..."` lines above it.)
- **Symptom: every skip line shows a bare clock time as the "date"** (e.g. `Skipping event with invalid date: "10:00 AM" - Event Name`) — this means the scraper's DOM extraction is reading an element's rendered/inner text where it should read a machine-readable date attribute. Check the extraction code for a selector like `el.querySelector('[class*="date"], time')?.innerText` — on calendar widgets that use a semantic `<time>` tag, the visible text is often just the clock time while the actual date lives in the `datetime` attribute (`<time datetime="2026-07-06T10:00:00">10:00 AM</time>`). Prefer `.getAttribute('datetime')` / `.getAttribute('data-date')` over `.innerText`. If the attribute genuinely isn't present either (real-world site), the date likely lives in a separate day-group heading/column that the per-event extraction never associates with its child event cards — that requires reading the live DOM structure (WebFetch or asking the user to paste an inspected HTML snippet of one event card) rather than guessing further.
- Check `date-normalization-helper.js` — does it handle the date format being skipped?
- Common formats to watch for: "Month Day @ Time", timezone abbreviations (EST/PST), localized day abbreviations (Sá., Lu.), periods in month abbreviations (Apr.), date ranges with dashes
- Add new normalization rules if needed, and verify all existing date tests still pass
- **Suspiciously high `past event` counts, especially "all or nearly all events skipped as past" on a single-source scraper**: `normalizeDateString()` always strips time-of-day and returns a date-only string, so the past-event check in `event-save-helper.js` builds `dateObj` at midnight local time. Before 2026-07-08 this meant ANY same-day event looked "already past" the instant the scraper ran later than 00:00 — a today's-events listing scraped at 2pm would have every single row rejected as past, even ones still hours from starting or actively ongoing. Fixed 2026-07-08 by re-checking against the event's actual `startTime`/`endTime` (whichever is available, preferring end) before confirming a same-day event is truly over — see the `timeForPastCheck` block right after `// Skip past events`. If you see this exact symptom again (one scraper's `past event` count ≈ its total found count, and the scraper covers same-day/today listings), verify the scraper is actually passing `startTime`/`endTime` fields through to `saveEventsWithGeocoding` — this fix only helps if that data reaches the helper.

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
- **State centroid end-of-chain**: If `no coords` is low but events cluster at the center of a state on the map, geocoding may have silently succeeded using the state centroid fallback (it assigns coordinates without logging "no coords"). This happens when `city: ''` in the scraped data exhausts all fallbacks. See Section 12 for detection query and cleanup steps.

**6. Fatal errors / crashes**
- Missing npm modules: Add to `scraperDependencies` in `package.json` and note what I need to `npm install`
- Protocol/connection errors: Check browser restart logic in the scraper's main loop
- Timeout errors: Consider increasing timeout or switching to `networkidle2`
- **Network outage cascades** (the runner crashes mid-state with `Requesting main frame too early!` / `TargetCloseError` / `Session closed`): as of 2026-05-25 the three `macaroni-runner-group{1,2,3}.js` files have `process.on('unhandledRejection'/'uncaughtException')` handlers that swallow those specific Puppeteer-stealth races. If you see `⚠️ Swallowed benign Puppeteer rejection` in the output, that's the guard firing — not a bug. If a NEW unrelated unhandled rejection ever pops up, add the message pattern to `BENIGN_PUPPETEER_PATTERNS` in the runner files (all three).
- States that show `❌ Error: net::ERR_INTERNET_DISCONNECTED` across every site are network-outage casualties, NOT scraper bugs. Re-run them with `node scrapers/macaroni-runner-groupN.js --state XX` once connectivity returns.

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
- MacaroniKid scrapers were the most common offenders — as of April 2026, all 43 MK state scrapers have been fixed with the `dateTimestamp` pattern (the `nc-cloud.js` and `usa-local.js` variants are separate codepaths)

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
- **Library address false positives (non-library scrapers only)**: `geocoding-helper.js` Strategy 0 calls `getLibraryAddress()` using substring matching — it can fire when any word in the venue or source name matches a library branch name (e.g., "Charlotte" matched a China Grove NC branch; "White Plains" matched a Syracuse NY branch). Fixed 2026-06-30 with `isLibrarySource` guard (`/library|libraries|lib\b|biblioth/i` test on `sourceName`) so non-library scrapers skip Strategy 0 entirely. If you see events from a non-library scraper geocoded to suspiciously specific but wrong small cities, check whether `isLibrarySource` is accidentally matching the scraper's source name.

**11. Library-system venue with no branch (MK scrapers)**
- Look for repeated `📍 Using city-level geocode for: ...` lines where the *titles* mention library activities (storytimes, BabyTime, ToddlerTime, summer reading, etc.) and the venue would be a library system name like "Denver Public Library", "Jeffco Libraries", "Sno-Isle Libraries", etc.
- Since 2026-05-25 the MK scrapers call `helpers/library-branch-detector.js` BEFORE geocoding. It scans event title + description for any branch name from `helpers/library-addresses.js` (278+ systems) and rewrites `details.venue/address/city/zipCode` to the specific branch so the next geocode hits a real address.
- Watch for `📚 Library branch detected: ${branch} (${city})` log lines — that's the helper firing successfully.
- If a library system appears repeatedly in the city-level logs but the branch detector never fires, check (in order):
  1. Is the system in `helpers/library-addresses.js`? (`grep -i "your-system-name" scrapers/helpers/library-addresses.js`)
  2. If the MK feed uses a community-known nickname (like "Jeffco Libraries" for "Jefferson County Public Library"), add it to the `ALIASES` map at the top of `helpers/library-branch-detector.js`.
  3. Is the branch name actually present in the event title or description? Some MK feeds strip it — in that case there's nothing the detector can do without source-side branch metadata.
  4. Run `node test-branch-detector.js`-style sanity case against the offending venue/title/description tuple before adding code.

**12. State/city centroid geocoding clusters**

**What it looks like**: Many events from one scraper share identical coordinates matching a state centroid. Events cluster at the geographic center of a state on the map. `city` field is empty or wrong (e.g., all Charlotte-area events at China Grove NC, all White Plains events at Syracuse NY).

**How to detect**: Look for `📍 Using state centroid for: ...` lines in the log. Or run this in the Supabase SQL editor after a scraper run:
```sql
SELECT scraper_name, state,
  ROUND(ST_Y(location::geometry)::numeric, 4) as lat,
  ROUND(ST_X(location::geometry)::numeric, 4) as lng,
  COUNT(*) as cnt
FROM events
WHERE date >= now()
  AND scraped_at > now() - interval '2 hours'
GROUP BY scraper_name, state, lat, lng
HAVING COUNT(*) > 5
ORDER BY cnt DESC;
```
If `lat/lng` matches a known state centroid in `STATE_CENTROIDS` in `scrapers/helpers/geocoding-helper.js`, the geocoding chain hit the last-resort fallback.

**Root causes (in order of likelihood)**:

a. **Empty `city` from DOM extraction** — scraper set `city: ''`; geocoding fell through Nominatim → Photon → county centroid → state centroid. Check how city is passed to `saveEvent()` or `saveEventsWithGeocoding()`. Most common: Eventbrite DOM fallback (see Section 1). Fix: parse city from the location element text.

b. **Library address false positives** — `getLibraryAddress()` fires on non-library scrapers via substring matching. Fixed 2026-06-30 with `isLibrarySource` guard. If new occurrences appear, check the scraper's source name against `/library|libraries|lib\b|biblioth/i`.

c. **Geocoding rate limiting** — 429 errors exhausted all providers; fallback reached state centroid. Fix: increase delay between geocode calls.

**Cleanup after fixing the root cause**: write a script following `scripts/fix-festivals-geocoding.js`:
- Query `events` for `scraper_name = 'X'`, `date >= now()`, `city = ''`
- Delete in batches of 100 (dry run by default; `--save` to execute)
- Re-run the scraper to recreate events with correct coordinates

Do not leave bad-coordinate events in the DB — they surface in the wrong location queries.

**13. Per-venue zero-event sites within multi-venue scrapers**

Scrapers like `scraper-gardens-nature-eastern.js` and `scraper-venue-events-childrens-museums.js` cover dozens of venues. When individual venues log `⚠️ No events found`, diagnose autonomously — do not ask which to investigate.

**Step 1**: Build the zero-venue list from the log (all entries that logged "No events found" or "0 events").

**Step 2**: Spawn a subagent with WebFetch to hit all zero-venue `eventsUrl` values simultaneously. For each report: HTTP status, whether event titles/dates are visible in the raw HTML, and what CSS classes are on event containers.

**Root causes and fixes**:

| Root cause | WebFetch signal | Fix |
|---|---|---|
| URL rot (404) | 404 response | Update `eventsUrl` in VENUES array; find correct path from site's nav |
| Domain rebrand | 404 or redirect to new domain | Update both `url` and `eventsUrl` |
| Wrong CSS selectors (site updated TEC version, or uses Squarespace/Webflow) | 200 + events in HTML | Add observed CSS classes to Strategy A/B in `tryHTMLScraping()` |
| WAF-blocked (403) | 403 from all paths | Note as known issue; Puppeteer stealth can't reliably bypass |
| Site down (ECONNREFUSED / SSL error) | Error | Note; recheck on next run |
| Genuinely empty | 200 + "No upcoming events" text | Correct behavior; leave as-is |

**TEC selector coverage** — Strategy A should cover both modern TEC (`.tribe-events-calendar-list__event`) and older variants (`.tribe-events-list article`, `.tribe-events-list-event`, `.tribe_events article`). For WordPress+TEC sites returning 0, also try the REST API: `GET {siteUrl}/wp-json/tribe/events/v1/events/?per_page=50&start_date=now`.

**Non-WordPress platforms to add to Strategy B if missing**:
- Squarespace: `.eventlist-event`, `.eventlist-title`, `.eventlist-datetag`
- Webflow CMS: `.w-dyn-item`
- CivicPlus (govt CMS): `.cal_container`, `.cat_container`

Fix URL rot and selector issues without asking. List WAF-blocked, down, and genuinely empty sites at the end.

**14. [TEMPORARY — verify then delete this section] WordPress library domain cleanup fallout**

Commits `6734fe7`, `4b388ee`, `cf70bb1`, `4f3718f` (2026-07-07) removed ~5,500 fabricated `{city}library.org`-pattern domains across all 44 `scraper-wordpress-libraries-{state}.js` files and repointed ~900 more to a real calendar/events page found via an automated homepage crawl. That cleanup only verified each domain responds over HTTP — it did **not** confirm the generic-parser selectors (`[class*="event"]`, `[class*="program"]`, etc.) actually extract real event cards from the repointed pages. A homepage-crawl fix can land on a page that mentions "library" and returns 200 but isn't actually a calendar (e.g. a reading-program blurb page).

**What to check in this log**: for every `WordPress-{state}` scraper, confirm it reports `Found: N` with a plausible N, not a crash or a suspicious `0` across every remaining library. Prioritize the states that lost the largest share of entries in the cleanup, since those have the most repointed URLs to validate: CA (911→199), TX (600→170), NY (792→422), PA (543→213), WA (288→59), FL (324→65), SC (158→44), WV (164→45), MN (333→108), NC (300→89), KY (165→69).

If a state's scraper returns 0 (or near-0) events across most of its libraries, check whether the repointed `eventsUrl` for those libraries actually lands on a real events listing vs. a generic page that only happened to pass the "mentions library" sanity check during cleanup. Fix by finding the real calendar path manually (same approach as the original cleanup: look for a nav link containing "calendar" or "events").

**Group tracking** (WordPress-{state} scrapers are split across the 3-day rotation by state) — check off as each group is diagnosed against this item:
- [x] Group 1 checked (2026-07-07 run: VA, GA, NC, CT, TN, AL, VT, RI all reported healthy nonzero Found counts, e.g. WordPress-GA 1953 found/99 new)
- [x] Group 2 checked (2026-07-08 run: MD, NY, FL, NJ, MS, ME all reported healthy nonzero Found counts, e.g. WordPress-NY 6097 found/451 new)
- [ ] Group 3 checked (PA, MA, KY, SC, WV, DE, NH — not yet run since the cleanup; next Group 3 day is 2026-07-09)

**Once all three boxes above are checked, delete this entire section (14) from this file** — it's a one-time verification for the 2026-07-07 cleanup, not a permanent diagnosis category.

### Bandwidth management (Supabase free plan — 5.5 GB egress limit)

- The venue cache in `venue-matcher.js` is the single largest egress source. It loads all activities into memory with a **30-minute TTL** and selective columns (id, name, city, state, address, location, geohash, category). Do NOT reduce the TTL or add more columns to the cache query.
- When writing new scrapers or fix scripts that read from Supabase, always use `.select('column1, column2, ...')` with only the columns you need — never `select('*')`.
- If a scraper needs to check for duplicates, use the existing `checkDuplicate()` in `supabase-adapter.js` which selects only `id, name`.
- **Firestore-compat read wrapper (`db.collection(...).where(...).limit(N).get()` and `db.collection(...).doc(id).get()`) defaults to a LEAN projection** — it drops `description`, `image_url`, and `location` (GEOMETRY) from the returned rows because the 141 dedup-check call sites only need to know whether a row exists. If you actually need those fat columns, opt in: `.select('*')` for everything, or `.select('id, description, location')` for a custom set. The wrapper also now honors `.limit(n)` and `.orderBy(field, dir)` (both were silent no-ops before; `.limit(1)` did nothing). The `'in'` operator is supported in `.where()`. Do not "fix" a scraper by adding `.select('*')` back unless the scraper is actually reading a column not in the default projection — defaulting to `*` is what blew through Supabase egress in the first place.
- **The events table does NOT have `min_age`, `max_age`, or `is_free` columns** — only `activities` does. If you see PostgREST 400 errors `column events.min_age does not exist` (or similar) in the API Gateway logs, that's the root cause. Never include `min_age`, `max_age`, or `is_free` in the events default projection or in an explicit `.select(...)` on the events table. A May 2026 incident traced ~1 GB/day of egress to broken-query churn from this exact mistake (every dedup query 400'd, every event still inserted, scrapers retried on duplicate-key, repeat). For events, use `age_range` (TEXT) and detect free events from name/description text.
- Data quality runs on a tiered cadence (Apr 2026):
  - **Daily**: `node scripts/data-quality-quick.js` (count-only audit, ~5 MB) and `.\scripts\fix-all.ps1 --recent-only` (last 72h, ~50–150 MB). Git Bash: `bash scripts/fix-all.sh --recent-only`.
  - **Monthly**: `.\scripts\fix-all.ps1` (full sweep, ~1.5–2 GB) and `node scripts/data-quality-check.js` (deep audit, ~500 MB). Git Bash: `bash scripts/fix-all.sh`.
  - Override window with `FIX_WINDOW_HOURS=N` (e.g., 168 for a week-long catch-up).
- The scrapers' `saveEvent()` and `saveActivity()` now do almost all validation at scrape time: junk-title rejection (`isJunkTitle()`), non-family rejection (including sexy/cannabis/420/firearms/gambling/nightclub patterns synced from `cleanup-nonfamily-events.js`), cancelled rejection, past-event rejection, age normalization, adult-only rejection, time extraction, venue cleaning, geohash compute from lat/lng, and `event_date` text → `date` TIMESTAMPTZ parsing. Most rows no longer need backfill — daily fix runs do very little work.
- **As of 2026-05-14, saveEvent/flattenEvent also reject time-only `event_date` strings** (e.g. `"2:00pm–3:00pm"` — Communico fallback bug) and **literal `"Invalid Date"` strings** (BiblioCommons malformed `def.start`). The scraper-side root causes are fixed in `scraper-communico-libraries-CA-CO-DC-FL-GA-IL-MA-MD-TX-VA.js` (now derives date from `item.raw_start_time` when `datestring`/`date` are missing) and `scraper-bibliocommons-libraries-CA-CO-IL-MA-TX-VA-WA.js` (now guards `new Date(def.start)` with `isNaN`).
- **`.add()` now derives a stable content-based id.** Previously `db.collection('events').add(eventDoc)` minted `crypto.randomUUID()` when the scraper didn't pre-set `data.id` — 89 scrapers were doing this, so every re-scrape created new rows. The Firestore-compat wrapper now calls `_stableEventId(data)` (URL hash → `name|date|venue` hash → UUID fallback) so re-scrapes of the same event upsert in place. If you find a scraper still creating dupes, check its save path: setting `data.id` explicitly is fine; not setting it now also works.

### Paginator gotcha — pagination MUST be ordered

⚠️ Supabase paginated SELECT (`.range(from, to)`) does NOT guarantee deterministic row order without ORDER BY. The 2026-05-15 incident: `scripts/diagnose-duplicates.js --save` deleted ~17,000 legitimate events because every page returned overlapping rows, the script grouped them as "duplicates," and the by-id delete fired on the one underlying row. Every paginated read of events/activities (in `scripts/` AND in `scrapers/`) must include `.order('id', { ascending: true })` (or another stable column) before `.range()`. Patched across scripts in commit `35a724c`; if you write a new paginator, follow the same pattern. When investigating reported duplicates, inspect a sample group's full ids before deleting — identical ids across rows in the same group means paginator bug, not duplicates.

### How to fix

- Read the relevant scraper file(s) and helper files before making changes
- Apply fixes directly — edit the code
- When fixing MacaroniKid scrapers, remember all **43 state files** (`scrapers/scraper-macaroni-{ak..wv}.js` — excluding `nc-cloud.js` and `usa-local.js` which are variants) share the same structure. Use a script to apply changes to all of them if the fix applies broadly. **Anchor on stable string contents, not line numbers** — the promo-pattern block lives at different line numbers in different files (range observed: 258–307).
- The standard MK pattern-injection anchors are:
  - Promo regex list: insert after `/^plan\s+your\s+family\s+fun\b/i,` (or the most recently added pattern).
  - New `require` lines: insert after `const { normalizeDateString } = require('./date-normalization-helper');`.
  - State literal per file: read it from the `state: 'XX'` literal in the existing `findMatchingVenue({...})` call.
- Run `node -c filename.js` syntax check on every modified file
- For date normalization changes, verify against the test cases in the date helper
- For library-branch-detector changes, run a sanity test like `outputs/test-branch-detector.js` covering at least one positive case, one negative case, and the wrong-state guard.
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

<!-- ==================== PASTE END ==================== -->

### Scraper output

(paste full output below)
