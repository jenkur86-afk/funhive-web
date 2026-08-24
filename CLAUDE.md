# FunHive – Claude Instructions

## Project Overview
FunHive is a family event and activity discovery platform. It aggregates events from 185+ sources (libraries, parks, museums, MacaroniKid, community centers) across the eastern US (22 states: DC, MD, VA + ME, NH, VT, MA, RI, CT, NY, NJ, PA, DE, WV, NC, SC, GA, FL, AL, MS, TN, KY) and displays them on a Next.js website with Supabase (PostgreSQL + PostGIS) as the backend.

## Tech Stack
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Database**: Supabase (PostgreSQL with PostGIS extension)
- **Hosting**: Vercel (auto-deploys from `main` branch)
- **Scrapers**: Node.js + Puppeteer, run locally on a 3-day group rotation (Windows: Task Scheduler; see `scrapers/task-scheduler/`)
- **Maps**: Leaflet (client-side only via `dynamic()` import)
- **Auth**: Supabase Auth (email + Google/Apple OAuth)
- **Payments**: Stripe (not yet configured)

## Key Architecture Decisions

### Database Schema
- `events` table columns: `id`, `name`, `event_date` (TEXT, scraper-provided), `date` (TIMESTAMPTZ, parsed), `end_date`, `description`, `url`, `image_url`, `venue`, `category`, `city`, `state`, `zip_code`, `address`, `location` (GEOMETRY), `geohash`, `activity_id`, `source_url`, `scraper_name`, `platform`, `scraped_at`, `created_at`, `updated_at`, `review_count`, `average_rating`, `is_sponsored`, `sponsor_expires_at`, `reported` (BOOLEAN, added by `migration-reports.sql`), `age_range` (added by `add-age-range-column.sql`), `start_time`, `end_time`. **Critical: events does NOT have `min_age`, `max_age`, or `is_free`** — those columns only exist on the `activities` table. Putting them in any `.select(...)` on the events table returns 400 from PostgREST and bleeds egress on every retry. **Note:** The column is `source_url` not `source` — the `activities` table has `source` but `events` does not.
- Always use `date` TIMESTAMPTZ for filtering/sorting, never `event_date` (TEXT sorts alphabetically, not chronologically).
- `activities` table: venues/places with `location GEOMETRY(Point, 4326)` for PostGIS queries. Has `source TEXT` column. Also has `reported BOOLEAN DEFAULT FALSE`.
- `event_reports` table: stores user reports (reason, comment, reporter_ip, status). Defined in `database/migration-reports.sql`.
- `event_series` table: recurring event groups, linked to an `activity_id`. Has `review_count` and `average_rating` aggregations.
- `reviews` table: user ratings (1–5) on events, activities, or event_series. Has `helpful_count`. `helpful_votes` table tracks per-user upvotes on reviews (unique constraint `user_id + review_id`).
- `user_favorites` table: links `auth.users` to events or activities. Free-plan cap is 10 favorites (enforced in `FavoritesContext.tsx`). RLS: users see only their own rows.
- `user_settings` table: keyed by `auth.users.id`. Stores `display_name`, `home_location GEOMETRY`, `home_city/state/zip`, `search_radius_miles` (default 25), `preferred_categories TEXT[]`, `preferred_age_range`, `email_digest`, `is_premium` (bool), `stripe_customer_id`, `stripe_subscription_id`, `premium_expires_at`. RLS: users see only their own row.
- `scraper_logs` table: per-run telemetry (`scraper_name`, `status`, `events_found/saved/skipped`, `error_message`, `duration_ms`, `run_at`).
- `click_events` table: user interaction analytics (`interaction_type`, `event_id`/`activity_id`, `search_query`, `search_location`, `category`, `age_range`, `date_filter`, `radius_miles`, `user_lat/lng`, `session_id`, `created_at`). Defined in `database/migration-click-events.sql`. Populated client-side via `logInteraction()` in `src/lib/track-click.ts` (fire-and-forget, errors swallowed). RLS allows anonymous INSERT only — no SELECT policy, so it can't be queried from the app; view it via the Supabase SQL Editor (or a service-role script) only. See "Viewing click analytics" below.
- `nearby_events` RPC: `nearby_events(lng, lat, radius_miles, max_results)` uses `ST_DWithin()`. Excludes `reported` items.
- `nearby_activities` RPC: `nearby_activities(lng, lat, radius_miles, max_results)` — same pattern as `nearby_events` for venues. Excludes `reported` items.
- Location stored as `SRID=4326;POINT(lng lat)` WKT format.
- Geohash stored as 7-character string via ngeohash encoding.

### Scraper System
- 185+ scrapers in `scrapers/` directory, registered in `scrapers/scraper-registry.js`.
- `SCRAPERS` is an object (not array), keyed by scraper name.
- 3-day group rotation: Group 1 runs days 1,4,7,10...; Group 2 runs 2,5,8,11...; Group 3 runs 3,6,9,12...
- **Active region**: `scrapers/region-config.json` controls which states run. Currently `dmv` + `eastern` are active (22 states). `isScraperActive(scraper, activeStates)` returns true if `scraper.state === 'Multi'` OR if the scraper's state is in the active list. Scrapers for inactive regions are registered but never run — do not "fix" them.
- **Active state counts (July 2026)**: Group 1 = 50, Group 2 = 52, Group 3 = 49 (151 active of 221 registered; the other 70 are inactive-region entries). Recompute with `isScraperActive(scraper, getActiveStates())` over `SCRAPERS` rather than trusting this line — it drifts as scrapers are added.
- **Anything reading the registry for health/coverage reporting must filter by `isScraperActive` first.** The 70 inactive-region entries have no `scraper_logs` rows by design, so an unfiltered pass reports them as broken. `data-quality-check.js` had this bug until July 2026 and flagged 51 of them as "registered but never ran". `fix-event-state.js` is the deliberate exception — it parses the registry for `scraper_name` → state hints and must stay unfiltered to resolve pre-existing rows scraped when a region was active.
- MacaroniKid scrapers: 43 state-specific files (`scraper-macaroni-{2-letter-state}.js`, e.g. `scraper-macaroni-al.js`), each with identical structure. They run through **separate** runner files (`scrapers/macaroni-runner-group{1,2,3}.js`), one per rotation group, not through `local-scraper-runner.js`'s per-scraper loop directly.
  - **2026-04-15 to 2026-08-04 incident**: `local-scraper-runner.js`'s `runMacaroniGroup()` was a dead stub for ~4 months — it only logged instructions to run the group file manually and never actually invoked it, and no scheduled task called the group runners either. All 43 states of MacaroniKid coverage silently went stale except one manual catch-up on 2026-07-09. Fixed 2026-08-04: `runMacaroniGroup()` now spawns the correct `macaroni-runner-group{N}.js` as a child process (`child_process.spawnSync`, `stdio: 'inherit'`), restoring it to the regular nightly rotation. If you ever see zero `MacaroniKid-*` activity in `scraper-summary.log` for an extended period again, check that this wiring is still intact before assuming the sites themselves are down.
  - Per-state results from the group runners are written into the same `scrapers/logs/scraper-summary.log` table as every other scraper, via the shared `scrapers/helpers/scraper-summary-logger.js` module (`logSummary`/`formatSummaryRow`) — both `local-scraper-runner.js` and the three `macaroni-runner-group*.js` files import it so the column format can't drift between them. The group runners also still keep their own more detailed per-run log at `logs/macaroni-group{N}-<date>.log` (project root, not `scrapers/logs/`).
- **Automated OpenStreetMap/Overpass venue discovery was attempted twice and abandoned both times — removed 2026-08-04.** `OSM_SCRAPERS` (11 registry entries: `OSM-Batch1`–`10` + `OSM-California`) pointed at `scraper-osm-batch-activities.js` / `scraper-osm-california.js`, neither of which ever existed in the repo (confirmed via `git log` back to the initial commit) — a placeholder feature that was never built. A second, real attempt existed unregistered: `scraper-activities-openstreetmap-usa.js` (top-5-cities-per-state Overpass queries) and `scraper-activities-osm-state-boundary.js` (whole-state-boundary Overpass queries), both using the same 19-venue-type schema (libraries, museums, parks, playgrounds, zoos, bowling alleys, etc.) but never wired into `scraper-registry.js`, and explicitly called "dead scraper files" in a 2026-07-07 commit. Deleted both orphaned files along with the dead `OSM_SCRAPERS` registry block, `getOSMScrapersForDay()`/`getOSMScrapersForDayByRegion()`, `runOSMScrapers()` in `local-scraper-runner.js`, and the `--osm` CLI flag. **The same venue categories these would have covered are already served by the `VenueList-{Category}-DMV` family** (`VenueList-BowlingAlleys-DMV`, `VenueList-SwimmingPools-DMV`, etc., expanded 2026-07-02 to all 22 active eastern states) plus `VenueList-Eastern-US` — but those are hand-curated, hardcoded venue lists (see each file's own header comment), not live automated discovery. A new venue won't appear until someone notices it and adds it manually. If genuine self-updating OSM-based discovery is wanted again, it needs a fresh implementation and registry wiring from scratch, not a revival of either abandoned attempt.
- All events flow through `supabase-adapter.js` → `saveEvent()` or `flattenEvent()`.
- **Supabase client import**: Use `const { supabase } = require('./scrapers/helpers/supabase-adapter')` for direct Supabase client access in fix scripts. Do NOT use `db` (that's a Firestore-style reference used internally by scrapers). Pattern: `const { supabase } = require(...)` then `supabase.from('events').select(...)`.
- Fix scripts follow a `--save` flag pattern: dry run by default, `--save` to write to DB. Always import `supabase` from `supabase-adapter.js`.
- **Event ID deduplication** (`_stableEventId` in `supabase-adapter.js`): IDs are deterministic hashes so re-scraping upserts instead of inserting duplicates. Priority: (1) normalized URL hash — strip query/fragment/trailing slash, lowercase; (2) `name|eventDate|venue` hash; (3) random UUID fallback. Activities use same pattern with `name|city|state` as the fallback key.

### Client-Side Patterns
- Location persisted in `localStorage` key `funhive_location` as `{lat, lng}` JSON.
- Events page reads URL params: `?category=`, `?q=`, `?date=`.
- `ACTIVE_STATES` in `src/lib/region-filter.ts` controls which states appear on the website. Currently includes all 22 eastern states + OH/IN/MI/IL/WI (Midwest bordering the eastern region). Already correct as of July 2026.
- Age filtering uses numeric range intersection (not keyword matching).
- **localStorage keys in use**: `funhive_location` ({lat,lng}), `hidden_venues` (array of {id,name} — used by events/page, activities/page, HideVenueButton, settings/page), `funhive_kids` (array of {name, birthMonth, birthYear} — profile/page.tsx), `funhive_push_notifications` / `funhive_review_reminders` / `funhive_event_recommendations` / `funhive_show_free_only` (settings toggles).

## Critical Rules

### Never Do
- Never sort or filter by `event_date` TEXT column at the database level — use `date` TIMESTAMPTZ instead.
- Never use `.gte('event_date', ...)` in Supabase queries — the TEXT comparison fails for most date formats.
- Never add room/department suffixes to venue names (e.g., "Library - Meeting Room"). The `cleanVenueName()` function in `supabase-adapter.js` strips these automatically.
- Never store county centroid coordinates without the `if (!coords)` guard — always check if geocoding already succeeded before falling back.
- Never use `order('event_date', { ascending: true })` — it sorts alphabetically ("April 1" before "April 2" before "January 1").
- Never parse ISO date strings with `new Date("2026-04-23")` — JavaScript treats date-only ISO strings as UTC midnight, which shifts to the previous day in US timezones. Always append `T00:00:00` for local time: `new Date("2026-04-23T00:00:00")`.
- Never use `{ db }` or `{ admin, db }` from `supabase-adapter.js` in fix scripts — those are Firestore-compatibility wrappers. Use `{ supabase }` for the Supabase client.
- Never assume column names — check `database/schema.sql` first. Common gotchas: `events` has `source_url` (not `source`); `activities` has `source` (not `source_url`); `events` does **not** have `min_age` / `max_age` / `is_free` (only `activities` does — querying these on events 400s every request).
- Never use `.select('*')` on the events or activities tables in list/search queries — always specify only the columns needed. Detail pages (single row) are fine.
- Never reduce the venue cache TTL in `venue-matcher.js` below 30 minutes — it's the largest source of Supabase egress bandwidth.
- Never restore the Firestore-compat read wrapper's old `select('*')` default in `supabase-adapter.js` — every per-event dedup check across 141+ scraper files goes through that wrapper. The wrapper now defaults to a lean projection (drops `description`, `image_url`, `location` GEOMETRY) and actually applies `.limit()` / `.orderBy()`. If a specific caller needs more columns, override per-call with `.select('*')` or a custom column list, not by changing the default.
- Never write a paginated `.range()` SELECT without a preceding `.order()` clause. Postgres doesn't guarantee deterministic row order without ORDER BY, so the same row can land in multiple pages. For dedup-style scripts this silently inflates "duplicate" counts and — with `--save` — destroys legitimate data. The 2026-05-15 incident lost ~17,000 events. Pattern: `await q.order('id', { ascending: true }).range(from, from + pageSize - 1)`. All paginators in `scripts/` were patched in commit `35a724c`.

### Always Do
- Use `date` TIMESTAMPTZ column for all date filtering and sorting in queries.
- When adding search with `.or()`, skip the `.gte('date', today)` filter and use client-side `isEventOnOrAfterToday()` instead — many events have `event_date` text but no parsed `date`.
- When geocoding fails, preserve the original `details.city` and `details.address` in the location object (don't overwrite with centroid data).
- Wrap `useSearchParams()` in a `<Suspense>` boundary (Next.js requirement).
- Run `node -c filename.js` to syntax-check any modified scraper file before committing.
- Filter out reported items in queries with `.eq('reported', false)` and client-side `!e.reported` for RPC results.
- Use selective `.select()` columns in all Supabase queries. Events list: `id, name, event_date, date, start_time, end_time, venue, city, state, zip_code, category, age_range, description, address, location, activity_id, reported`. Activities list: `id, name, city, state, address, location, zip_code, category, description, age_range, min_age, max_age, hours, is_free, reported`. **Never** add `min_age`, `max_age`, or `is_free` to an events `.select(...)` — those columns don't exist on events and the request will 400.
- Run data quality fix scripts on a tiered cadence:
  - **Daily**: `node scripts/data-quality-quick.js` (count-only audit, ~5 MB egress) and `bash scripts/fix-all.sh --recent-only` (last 24h only, ~15–50 MB). Windows PowerShell: `.\scripts\fix-all.ps1 --recent-only`
  - **Monthly**: `bash scripts/fix-all.sh` (full sweep, ~1.5–2 GB) and `node scripts/data-quality-check.js` (deep audit, ~500 MB). Windows: `.\scripts\fix-all.ps1`
  - The scrapers' `saveEvent()` and `saveActivity()` now handle: junk-title rejection (`isJunkTitle()`), non-family rejection (sexy/cannabis/420/firearms/etc. all in `NON_FAMILY_PATTERNS`), cancelled rejection, past-event rejection, age-range normalization, adult-only rejection, time extraction, venue cleaning, geohash compute from lat/lng, and `event_date` text → `date` TIMESTAMPTZ parsing. Most rows no longer need backfill.
  - Override the recent-only window via `FIX_WINDOW_HOURS=N bash scripts/fix-all.sh --recent-only` (default 24).
  - Deletion-style steps inside `fix-event-quality.js` (past events, junk titles, dateless events) bypass `--recent-only` and always full-scan — those checks use selective columns and are cheap, and we always want stale junk gone regardless of when it was scraped.
  - Description backfill is intentionally disabled — descriptions stay empty if the scraper didn't supply one.

### Bandwidth Management (Supabase Free Plan — 5.5 GB egress limit)
- The venue cache in `venue-matcher.js` loads all activities with a **30-minute TTL** using selective columns (id, name, city, state, address, location, geohash, category). This is the single largest egress source during scraper runs.
- Frontend list pages use selective `.select()` columns (not `select('*')`) to reduce per-request data.
- The `nearby_events` and `nearby_activities` RPCs return all columns (SETOF table) — keep `max_results` reasonable.
- Fix scripts do full-table scans — running them weekly instead of daily saves ~10+ GB/month of egress.
- When writing new queries or scripts, always use `.select('col1, col2, ...')` with only the columns actually needed.

### Scraper Conventions
- Many scrapers export a cloud function named `scrape{Name}CloudFunction`, but not all — some export plain function names like `scrapeMacaroniKidAlabama`.
- The `saveEvent()` function automatically: rejects non-family events, rejects past events, rejects cancelled events, cleans venue names, extracts time from date strings, detects age ranges.
- When modifying MacaroniKid scrapers, remember all 43 files share the same structure — changes often need to be applied to all of them via a script.
- Geocoding fallback chain: full address → city-level → venue cache → county centroid (each step guarded by `if (!coords)`).

### Scraper Naming — `scraper_name` and `source_url`

`scraper_name` is the **only** join between a database row and the registry entry that produced it. `source_url` is the only field that records **where** an event came from rather than what someone called it. Both are load-bearing: the daily audits group by `scraper_name`, `scraper-summary.log` reports registry keys, and `scripts/verify-coverage.js` establishes identity from the `source_url` host. When either drifts, those break silently.

**Measured 2026-08-05: only 143 of 434 distinct `scraper_name` values (33%) conform.** Run `node scripts/check-scraper-names.js` for the current state.

#### The two legal forms of `scraper_name`

| Scraper covers | Required `scraper_name` | Example |
|---|---|---|
| One site | exactly the registry key | `Pratt-Library` |
| Many sites | `<registryKey>-<siteSlug>` | `RecDesk-Parks-ccrec` |

**Rules, no exceptions:**

1. **The prefix must be the registry key byte-for-byte**, including case and hyphens. `wordpress-NY` is wrong — the key is `WordPress-NY`. `RecDeskParks-ccrec` is wrong — the key is `RecDesk-Parks`, so it must be `RecDesk-Parks-ccrec`.
2. **`siteSlug` is lowercase `[a-z0-9-]` only.** Derive it from the site's own hostname subdomain or an explicit `slug` in the config array — never from a display name.
3. **A multi-site scraper MUST emit one distinct `scraper_name` per site.** Never collapse them onto the bare registry key. `AGE-RANGE-AUDIT.md` groups by `scraper_name` and its "No aggregation, ever" rule requires one row per individual site; collapsing re-creates the aggregation the project owner rejected on 2026-08-04. `MacaroniKid-FL` alone covers 31 sites, `CivicRec-Parks-Eastern` ~250.
4. **Never write a library's or venue's display name.** `Durham County Library`, `Macaroni Kid Winter Park`, and `BCCLS - Bergen County Cooperative Library System` are all wrong — they cannot be joined to the registry, which is what forced the age audit into `created_at` time-window archaeology.
5. **Set it via `metadata.scraperName`.** That is what `flattenEvent()` reads first (`supabase-adapter.js`, `row.scraper_name = row.scraper_name || data.metadata.scraperName || data.metadata.sourceName || ...`). If you omit it, the adapter silently falls back to `metadata.sourceName` — which is how the display-name drift happened.

#### `source_url` must be the listing page, never the event

Set `metadata.sourceUrl` to **the site's own calendar/listing URL** — the page the scraper visits — not the individual event's URL.

```js
// CORRECT — per-site, distinctive host
metadata: { sourceUrl: site.url,  // https://apollobeach.macaronikid.com
            scraperName: `MacaroniKid-FL-${site.url.replace(/^https?:\/\//, '').split('.')[0]}` }

// WRONG — this is the event's own page
metadata: { sourceUrl: url }
```

`scraper-macaroni-md.js` did the wrong version and its stored `source_url` was byte-identical to `url` on every row. Beyond violating the field's meaning, it would have given every MacaroniKid site in every state the host `events.yodel.today`, which is useless for identity and breaks `verify-coverage.js`.

#### Default posture: build or fix it, don't just diagnose it

**When a scraper is missing, broken, or a library has no working extraction path, the default is to build or fix it — not to write it up and stop.** Diagnosis that ends in a note is only half the job, and a well-written note describing work you could have done is still undone work.

Build/fix by default when all of these hold, which is the usual case:
- The target is **verified live** (right institution, right state, real events present).
- The extraction path is **known to be reachable** — an ICS feed that returns data, a platform the codebase already parses, a DOM you have actually inspected.
- It sits in an **active region** and does not require a judgement only the owner can make.

Stop and ask **only** for genuinely owner-level calls: deleting coverage on a "covered elsewhere" claim you cannot prove, anything touching `src/**` or another Vercel-deploying path, or a change whose blast radius you cannot bound. "This is a new capability rather than a config change" is **not** a reason to stop — new scrapers are ordinary work here.

When you do build one, follow the checklist below, watch the first run, and record what it produced. An unrun scraper is not finished.

#### Checklist for a NEW scraper

Before committing a new scraper file, confirm every line:

- [ ] Registered in `scrapers/scraper-registry.js` with `file`, `exportName`, `group` (1/2/3), `state` (2-letter, or `Multi`), and `sites: N` if it covers more than one site.
- [ ] Registry key follows an existing family pattern: `Family-ST` (`LibCal-NC`), `Family-REGION` (`VenueList-BowlingAlleys-DMV`), or `Family-Words` (`Pratt-Library`).
- [ ] `metadata.scraperName` set on every event, matching one of the two legal forms above.
- [ ] Multi-site: `scraperName` includes the per-site slug — verify with `node scripts/check-scraper-names.js` that distinct-name count equals the declared `sites`.
- [ ] `metadata.sourceUrl` set to the **site's listing URL**, not the event URL, and not a domain shared with another site.
- [ ] Site URLs verified live — confirm the institution, city and state match before saving. Never a guessed `{city}library.org`; that generator produced 355 cross-state collisions.
- [ ] `county` values are real counties that resolve via `getCountyCentroid()`. Do not append `" County"` to a city name.
- [ ] `node -c scrapers/<file>.js` passes.
- [ ] Dry run first, and read the sample output.
- [ ] One `SCRAPER-FIX-LOG.jsonl` line with `category: "new-coverage"`.

### Testing Patterns
- Syntax check: `node -c scrapers/filename.js`
- Data quality: `node scripts/data-quality-check.js` (must run locally — sandbox can't reach Supabase)
- Age detection: `node scripts/test-age-detection.js` — 24-case regression suite, read-only, no DB writes. **Run it after any change to `detectAgeRange()` / `resolveAgeRange()` in `supabase-adapter.js` or to `normalizeAgeRange()`.** Age detection has broken three separate times (2026-08-01, 08-03, 08-04), each time from a change that looked correct in isolation; the suite covers both directions — missed signals AND the false-positive controls (times, registration IDs, ordinals, venue names) that caught the 2026-08-03 regression live.
- Fix scripts use `--save` flag pattern: dry run by default, `--save` to write to DB. **Always dry-run first and actually read the sample output** — the 2026-08-04 `backfill-age-range.js` dry run surfaced bad reclassifications ("Curiosity Club (3:30 PM)" → Preschool) that would otherwise have been written to 1000+ live rows.

### Viewing Click Analytics
The `click_events` table (see Database Schema above) has no SELECT policy — the app can only write to it, never read it back — so there are two ways to view the data, both outside the Next.js app:
1. **Supabase Dashboard → SQL Editor** (easiest, no setup). Paste a query and run. Useful starting queries:
   ```sql
   -- Counts by interaction type, most recent 7 days
   select interaction_type, count(*) from click_events
   where created_at > now() - interval '7 days'
   group by interaction_type order by count(*) desc;

   -- Most-viewed events
   select e.name, count(*) as views from click_events c
   join events e on e.id = c.event_id
   where c.interaction_type = 'view_event'
   group by e.name order by views desc limit 20;

   -- Most-viewed venues
   select a.name, count(*) as views from click_events c
   join activities a on a.id = c.activity_id
   where c.interaction_type = 'view_activity'
   group by a.name order by views desc limit 20;

   -- Top search terms
   select search_query, count(*) from click_events
   where interaction_type = 'search' and search_query is not null
   group by search_query order by count(*) desc limit 20;

   -- Distinct sessions (rough visitor count) per day
   select date(created_at), count(distinct session_id) from click_events
   group by date(created_at) order by date(created_at) desc;
   ```
2. **A local script using the service-role key** (for repeatable/scripted reports) — connect with `createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)` from `.env.local` (same pattern used to verify the migration when it was first added) and `.select()`/`.order()`/`.limit()` as needed. The anon key won't work here since RLS blocks anon reads by design.

## Development Environment (Windows)
- **Working directory**: `C:\dev\funhive-web` — do NOT develop from the Google Drive folder (`G:\My Drive\...`); Drive sync conflicts with npm writes
- **Two npm installs required**: `npm install` in project root AND `cd scrapers && npm install` (separate `package.json` with puppeteer-extra etc.)
- **Dev server**: `npm run dev` from project root — ready in ~2–3s after first compile
- **Scraper commands** (from project root): `npm run scraper -- --group N` (run group 1/2/3), `npm run scraper -- --scraper LibCal-MD` (specific scraper by name), `npm run scraper -- --all` (all groups, takes hours), `npm run scraper -- --resume` (resume from checkpoint), `npm run scraper:dry-run` (preview without saving), `npm run scraper:monitor` (check results)
- **Shell scripts**: `bash scripts/fix-all.sh` works in Git Bash (installed with Git for Windows); PowerShell users: `.\scripts\fix-all.ps1`
- **Scheduled tasks**: `scrapers/task-scheduler/setup-tasks.ps1` (run once as admin) replaces the Mac launchd plists

## Session Close-Out — required at the end of every task

**Every task ends with the same three-block outline, not just the scheduled diagnosis.** Run `node scripts/project-status.js --save` (zero Supabase egress — local files only) and report:

- **Block A — What I fixed this session.** One row per fix with evidence and a **Proven?** column. `✅ live` ONLY when a real run or live fetch confirmed it; anything reasoned-but-unrun is `⚠️ unverified`. A code change that has never executed must never read like one that has — "WordPress-GA is fixed" was once true of 1 of its ~90 libraries.
- **Block B — What is still broken.** The script's severity-tiered table verbatim (🔴 losing data now / 🟠 real but contained / 🟡 hygiene). Do not compress it into prose; do not drop the 🟡 rows.
- **Block C — Distance to 100%.** The 8-gate table with its Δ column, then the single next action. Gates marked `⚠stale` are DB-derived and dated in the script's `STALE_METRICS` — report them as stale, never as current.

`STATUS.md` is the trend ledger (newest first; re-running the same day replaces that day's entry). Each entry carries a machine-readable `<!-- STATUS-DATA {...} -->` snapshot — trend is read from those, never by re-parsing the human tables.

**Gate 1 reports the worst scraper family, not the fleet average, and must stay that way.** The fleet mean read 54.7% while WordPress-* alone was 4.3% — averaging hid the defect, which is the same failure `AGE-RANGE-AUDIT.md`'s "No aggregation, ever" rule exists to prevent.

## Automated Maintenance

**Four** things run on a schedule — three via Windows Task Scheduler, one via Claude Code. All three Task Scheduler entries are registered by `scrapers/task-scheduler/setup-tasks.ps1` (run once, elevated); that script is the source of truth for their settings and asserts them on read-back.

| Task | Runs | Wrapper | Time limit | Writes |
|---|---|---|---|---|
| `FunHive-Scrapers` | daily 3:00 AM | `scrapers/run-scrapers.bat` | 36h | `scrapers/logs/scraper-summary.log`, `scraper-stdout.log`, `scraper-stderr.log` |
| `FunHive-Monitor` | daily 8:00 AM | `local-scraper-monitor.js` | 1h | — |
| `FunHive-DataQuality` | daily 1:00 PM | `scrapers/run-fix-all.bat` | 4h | `scrapers/logs/fix-all-recent.log` |
| `funhive-scraper-diagnosis` | daily 2:12 PM (Claude Code) | `~/.claude/scheduled-tasks/funhive-scraper-diagnosis/SKILL.md` | — | audits, `reports/`, commits |

- **`FunHive-Scrapers`** — runs the day's rotation group. Writes the cumulative per-scraper table (FOUND/NEW/DUPES/INVALID/TIME) to `scrapers/logs/scraper-summary.log`.
  - **It does NOT run the data-quality pass. Do not re-chain it here.** It did until 2026-08-22, and that chain silently stopped executing on 2026-08-12: rotations grew to 23–31h against what was then a 12h `ExecutionTimeLimit`, so Task Scheduler terminated the batch before it reached the fix-all line — while the *detached node child survived and finished the scrape*. So the scraper tables looked perfectly healthy with no data-quality pass behind them for ten days. Measured at the time: 7 `FunHive scrapers starting` markers since 08-12 with **zero** matching `finished`, `fix-all` last run 08-20, and a backlog of 8,206 stale/junk rows plus 723 unrepaired fields. The limit is now 36h (Task Scheduler stores that as `P1DT12H`) and the data-quality pass owns its own task.
- **`FunHive-DataQuality`** — runs `scripts/fix-all.ps1 --recent-only`, independent of the rotation, so it fires whether the rotation is still running, already finished, or never triggered that day. Overlap with a live rotation is expected and safe: fix-all is database + Nominatim work and launches no Chrome, so it does not contend with the scrapers' browsers.
  - **The site report refreshes on every data-quality run.** `fix-all.ps1`/`.sh` end by running `scripts/generate-site-report.js`, so `reports/site-report.html` is regenerated daily at ~1:00 PM — roughly 70 minutes before the 2:12 PM diagnosis, which therefore reads a current report rather than yesterday's. The regeneration is deliberately not gated on the exit status of the fix steps: a report failure must never fail the data-quality chain.
  - The report's **Last run** column (Coverage tab) is parsed from `scraper-summary.log`, so it is current for every scraper regardless of when the audit files were last rebuilt. A scraper that ran today shows a green badge with FOUND / NEW / INVALID; one that has never appeared in the log shows `never`. The other tabs still project the audit files, which only Steps 3b/3c rebuild — that is why the Library sites tab carries its own per-row `current` / `refixed` / `unmatched` status.
- **`funhive-scraper-diagnosis`** — reads the tail of `scraper-summary.log`, diagnoses per `SCRAPER-DIAGNOSIS-PROMPT.md`, applies fixes, and auto-commits/pushes scraper-side files only. It will **not** commit `src/**`, `public/**`, `next.config.*`, or `package.json` — those auto-deploy to Vercel and are left for human review. Permissions in `.claude/settings.json`. Only runs while the Claude Code app is open; a missed run fires at next launch.
  - It deliberately references `CLAUDE.md` and `SCRAPER-DIAGNOSIS-PROMPT.md` rather than copying their contents. Keep it that way — an inlined copy silently forks from these files the first time either is edited.

**If data quality ever looks stale, check the task before the code** — that is the lesson of the ten-day outage above, which presented as a data problem and was a scheduling one:

```
Get-ScheduledTaskInfo -TaskName FunHive-DataQuality | Select LastRunTime,LastTaskResult
Get-Content scrapers\logs\fix-all-recent.log -Tail 5
```

`LastTaskResult` `267014` is `SCHED_S_TASK_TERMINATED` — the task hit its `ExecutionTimeLimit`.

### `SCRAPER-FIX-LOG.jsonl` (repo root)
One JSON object per line, append-only, one entry per **logical fix** (not per commit or per file). Written by the diagnosis routine and by any session that fixes a scraper; read at the start of each diagnosis so known-dead or already-diagnosed scrapers aren't re-investigated daily.

Schema: `date` (`"YYYY-MM-DD"`), `scrapers` (array of `scraper-registry.js` keys; for shared-helper fixes spanning many scrapers use a sentinel like `"event-save-helper.js"` or `"MacaroniKid-ALL"`), `category` (exactly one of `site-change` | `code-bug` | `seed-data` | `new-coverage` | `other`), `summary` (1–2 plain sentences: what broke, what was done).

Stage it in the same `git add` group as the fix it documents. `scripts/scraper-fix-trends.js` consumes it for category trends, repeat-offender detection, and a staleness gap-check.

## File Map

### Core Application
- `src/app/page.tsx` — Homepage (server component + `HomeEvents` client component)
- `src/app/events/page.tsx` — Events listing with search, filters, location, map
- `src/app/activities/page.tsx` — Venues listing with similar filters
- `src/app/events/[id]/page.tsx` — Event detail page
- `src/app/activities/[id]/page.tsx` — Venue detail page
- `src/app/favorites/page.tsx` — Saved events/venues (requires auth; enforces 10-item free-plan cap)
- `src/app/profile/page.tsx` — User profile with kids info
- `src/app/reviews/page.tsx` — User's submitted reviews list
- `src/app/reviews/write/page.tsx` — Write/edit a review for an event or activity
- `src/app/settings/page.tsx` — Notification toggles, search radius, hidden venues management
- `src/app/pricing/page.tsx` — Premium subscription page (Stripe checkout wired in code but Stripe not configured; subscribe buttons currently no-ops)
- `src/app/auth/callback/route.ts` — OAuth code exchange for Google/Apple sign-in
- `src/app/auth/change-password/page.tsx` — Password change form
- `src/components/HomeEvents.tsx` — Location-aware event sections for homepage
- `src/components/Header.tsx` — Sticky nav with bee logo
- `src/contexts/AuthContext.tsx` — Auth state + `userProfile` (`user_settings` row); exposes `signIn`, `signUp`, `signOut`, `signInWithGoogle`, `signInWithApple`, `updateProfile`
- `src/contexts/FavoritesContext.tsx` — Favorites state with `isFavorited()`, `toggleFavorite()`; enforces `FAVORITES_LIMIT_FREE = 10` for non-premium users
- `src/lib/region-filter.ts` — `ACTIVE_STATES` array
- `src/lib/supabase.ts` — Client-side Supabase client
- `src/lib/supabase-server.ts` — Server-side Supabase client
- `src/lib/report-signing.ts` — HMAC-SHA256 signing for admin action links

### Reporting System
- `src/components/ReportButton.tsx` — Flag icon button for reporting events/venues
- `src/components/ReportModal.tsx` — Modal with report form (reason, comment, honeypot)
- `src/app/api/reports/route.ts` — POST endpoint: submit report, hide item, email admin
- `src/app/api/reports/[id]/[action]/route.ts` — GET endpoint: admin restore/remove via signed email links

### Other API Routes
- `src/app/api/suggestions/route.ts` — POST: user-submitted event or venue suggestions (type must be `"event"` or `"venue"`, name required)
- `src/app/api/checkout/route.ts` — POST: creates Stripe checkout session for monthly/annual subscription (requires `STRIPE_SECRET_KEY`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL` env vars)
- `src/app/api/webhooks/stripe/route.ts` — POST: handles `checkout.session.completed` (sets `user_settings.is_premium = true`) and `customer.subscription.deleted` (sets `is_premium = false`)

### Scraper Infrastructure
- `scrapers/helpers/supabase-adapter.js` — Central save/flatten functions, venue cleaning, age detection, cancelled event filtering. Also hosts the Firestore-compat read wrapper (`db.collection(...).where(...).limit(N).get()`) with a lean default projection that drops `description`, `image_url`, and `location` GEOMETRY; `.limit()`, `.orderBy()`, `.select(cols)`, and the `'in'` operator are all honored. Override the projection per-call with `.select('*')` if a caller needs the heavy columns.
- `scrapers/helpers/event-save-helper.js` — Event saving with geocoding
- `scrapers/helpers/library-addresses.js` — Branch address lookups
- `scrapers/helpers/geocoding-helper.js` — Nominatim geocoding with persistent file cache (`.geocode-cache.json`), library-address lookup, and county-centroid fallback
- `scrapers/helpers/library-branch-detector.js` — Scans event title/description for a branch name to resolve generic library-system venue names to a specific branch address
- `scrapers/helpers/yodel-helper.js` — Handles MacaroniKid sites that migrated to the Yodel iframe widget (`data-yenabled="1"`); detects, scrapes event URLs, and extracts JSON-LD structured data
- `scrapers/helpers/age-range-normalizer.js` — Normalizes raw age strings into the 5 standard brackets (plus "All Ages" and "Adults"). Used by both `supabase-adapter.js` at save time and `fix-all-data-quality.js` at batch cleanup.
- `scrapers/scraper-registry.js` — All scrapers registered with group/state
- `scrapers/utils/county-centroids.js` — County centroid fallback coordinates
- `scrapers/venue-matcher.js` — Venue deduplication matching
- `scrapers/date-normalization-helper.js` — Date string normalization
- **Re-export stubs** (`scrapers/geocoding-helper.js`, `scrapers/event-save-helper.js`, `scrapers/event-deduplication-helper.js`, etc.) — one-line `module.exports = require('./helpers/...')` shims kept so older scrapers that `require()` from the root still resolve correctly. The `helpers/` versions are authoritative; do not delete the stubs.

### Database
- `database/schema.sql` — Base PostgreSQL schema with PostGIS
- `database/schema-fix.sql` — Alternative `nearby_events` function
- `database/migration-reports.sql` — Adds `event_reports` table, `reported` columns, updates RPCs

### Data Quality Scripts (`scripts/` — run locally)
**Daily** (cheap, recent-only):
- `scripts/data-quality-quick.js` — Count-only audit using Postgres aggregates (~5 MB egress). No row downloads.
- `bash scripts/fix-all.sh --recent-only` (Git Bash) or `.\scripts\fix-all.ps1 --recent-only` (PowerShell) — Runs Steps 1–4 against the last 24h only (configurable via `FIX_WINDOW_HOURS`). Deletion steps (past, junk, dateless) always full-scan.

**Monthly** (full sweep):
- `bash scripts/fix-all.sh` (Git Bash) or `.\scripts\fix-all.ps1` (PowerShell) — Full sweep across all 4 steps.
- `scripts/data-quality-check.js` — Deep audit: duplicates, distributions, scraper health, sample issues.

**Individual fix scripts** (all support `--save`, `--recent-only`):
- `scripts/fix-all-data-quality.js` — Step 1: normalize age ranges, delete adult-only events, delete past events, backfill parsed dates.
- `scripts/cleanup-nonfamily-events.js` — Step 2: auto-delete non-family events (3-tier: auto-delete, keep, borderline CSV). saveEvent now rejects most of these at scrape time.
- `scripts/fix-event-quality.js` — Step 3: fix missing geohash, location, city, state, times, junk titles, past events. Description backfill removed.
- `scripts/fix-missing-fields.js` — Step 4: backfill activity addresses via reverse geocode. Description backfill disabled.
- `scripts/fix-duplicate-venues.js` — Clean room suffixes from existing venue names (one-off).
- `scripts/fix-venue-title-quality.js` — Strip promo/ticket bracket cruft (e.g. "(TICKET LINK)") and extra whitespace from event titles, normalize SHOUTED all-caps titles to Title Case (guards against mangling short acronyms and dot-separated initialisms like "L.Y.E"), and null-out + re-derive venue when it exactly duplicates the event title. saveEvent()/flattenEvent() now do all three at scrape time; this is the backfill for pre-existing rows.
- `scripts/fix-cancelled-events.js` — Remove cancelled/closed/postponed events (saveEvent now does this at scrape time).
- `scripts/data-quality-fix.js` — Broader fix: past events, geohash, state codes, city, activity addresses (reverse geocode), forward-geocode for missing locations, uncategorized events, stale scraper logs. Supports `--past-only` and `--geo-only` flags.
- `scripts/fix-broken-event-dates.js` — Delete events whose `event_date` has no recoverable date (time-only strings like "2:00pm–3:00pm", literal "Invalid Date" — historical rows from Communico/BiblioCommons bugs now fixed at scrape time).
- `scripts/fix-duplicate-activities.js` — Deduplicate venues by `lower(name)+lower(city)+state`; keeps most-complete row, oldest `created_at` as tiebreak.
- `scripts/fix-event-state.js` — Infer missing state from full state name in text fields, scraper-registry lookup, or Nominatim forward-geocode on city.
- `scripts/fix-missing-venue.js` — Backfill missing venue from "at \<Venue\>" / "@ \<Venue\>" name patterns or address; falls back to city + " (general area)". Supports `--recent-only`.
- `scripts/fix-null-dates.js` — Backfill `date` TIMESTAMPTZ from `event_date` text for rows where `date IS NULL`. Useful after parser improvements to recover previously-unparseable formats.
- `scripts/diagnose-duplicates.js` — Read-only: reports which scrapers produce duplicate `name+event_date+venue` groups, whether dupes are within-scraper or cross-scraper, and URL drift patterns. Supports `--limit=N`.
- `scripts/archive/` — Retired scripts kept for reference (e.g., `fix-duplicate-dates.js` — Communico bug fixed Apr 2026).

### URL collisions (Defect A) — the `{city}library.org` guess
**83% of WordPress-\* config URLs (3,156 of 3,802) were generated as a guessed `{city}library.org`.** Where two guesses land on the same string, every claiming state scrapes the one real library behind it — `madisonlibrary.org` is in **Kentucky** and was claimed by 11 eastern states; `spartalibrary.org` is in **Wisconsin**. This put ~2,000 wrong-state rows in the database before it was found on 2026-08-21.

Four scripts, in the order you use them:
- `scripts/list-url-collisions.js` — the worklist. Turns gate 2's single number into per-host detail, worst first. Separates true single-institution collisions from multi-state platforms that legitimately share a host (`libcal.com`, `macaronikid.com`). `--check` asserts it still agrees with `project-status.js`; `--state=XX` and `--json` for filtering.
- `scripts/resolve-collision-host-state.js` — works out which state a host really serves. Tries three URL variants and nine likely paths, then weighs three signals: ZIP-anchored `ST 12345`, phone area code, and `City, Full State`. **Outputs evidence, not a decision** — it proposes a state only when signals agree and the winner doubles the runner-up, otherwise `CONFLICTED`/`UNRESOLVED`.
- `scripts/disable-collided-urls.js` — flags wrong-state entries with `urlCollision` and installs a run-time guard in the 21 active WordPress files. **Dry-run by default.**
- `scripts/purge-wrong-state-collision-rows.js` — deletes rows those entries already wrote under the wrong state. Selects the id list read-only *before* deleting, always `.order()` before `.range()`, refuses above a ceiling.

**Rules when working this defect:**
- **Identity comes from the live page only** — a street address, ZIP, or phone area code. Never name similarity: library names are mostly geography, and every town has a `{town}library.org` that might belong to any of six states.
- **An unresolved host is unknown, not safe.** Never disable on a guess; leave it in the worklist.
- **Disabling is not deleting.** The entry stays with its wrong URL recorded and the guard emits the `📍` header *and* a `Found 0 events` line, so the library keeps its row in `LIBRARY-SITE-AUDIT.md` as an explained gap. Dropping that pair is what hid BiblioCommons-\*/Communico-\* from the audit until 2026-08-20.
- **Run `node -c` on every touched config file.** A generated reason string containing an apostrophe broke four config files on 2026-08-22; only `node -c` caught it.
- **A disabled library is a real coverage gap** until someone finds its correct URL. Check `scripts/verify-coverage.js` before claiming another family already covers it.
- Gate 2 excludes `urlCollision` entries, so the number drops as you disable. That is a reduction in **risk**, not a URL being corrected — `STATUS.md` carries a methodology note saying so.

**A DNS sweep is not a valid liveness test here.** `dns.resolve4` returns `ECONNREFUSED` for every host in this sandbox, including `google.com`. Use the Puppeteer-based scripts, whose browser stack reaches these sites.

### Prompts (top-level)
- `SCRAPER-DIAGNOSIS-PROMPT.md` — Paste into Cowork after running scrapers
- `DATA-QUALITY-DIAGNOSIS-PROMPT.md` — Paste into Cowork after running data-quality-check.js
- `SCRIPT-WRITING-PROMPT.md` — Paste into Cowork when asking Claude to write a new script in `scripts/` (encodes selective `.select()`, `--save`/`--recent-only` conventions, save-time-vs-script trade-off, egress rules)

## Age Range Brackets
The platform uses 5 age brackets with numeric range overlap:
- Babies & Toddlers (0-2)
- Preschool (3-5)
- Kids (6-8)
- Tweens (9-12)
- Teens (13-18)

An event for "ages 0-5" correctly matches Babies & Toddlers, Preschool, AND Kids.

## Brand
- Colors: Orange/amber primary (#f97316 → #f59e0b → #fbbf24 gradient), amber-900 for dark accents, cream backgrounds
- Logo: Inline SVG bee in hexagon (no external image file)
- Tagline: "Discover Family Fun Near You"
- Tone: Warm, playful, parent-friendly
