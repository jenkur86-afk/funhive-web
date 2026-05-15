# FunHive – Claude Instructions

## Project Overview
FunHive is a family event and activity discovery platform. It aggregates events from 185+ sources (libraries, parks, museums, MacaroniKid, community centers) across 25+ US states and displays them on a Next.js website with Supabase (PostgreSQL + PostGIS) as the backend.

## Tech Stack
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Database**: Supabase (PostgreSQL with PostGIS extension)
- **Hosting**: Vercel (auto-deploys from `main` branch)
- **Scrapers**: Node.js + Puppeteer, run locally on a 3-day group rotation
- **Maps**: Leaflet (client-side only via `dynamic()` import)
- **Auth**: Supabase Auth (email + Google/Apple OAuth)
- **Payments**: Stripe (not yet configured)

## Key Architecture Decisions

### Database Schema
- `events` table columns: `id`, `name`, `event_date` (TEXT, scraper-provided), `date` (TIMESTAMPTZ, parsed), `end_date`, `description`, `url`, `image_url`, `venue`, `category`, `city`, `state`, `zip_code`, `address`, `location` (GEOMETRY), `geohash`, `activity_id`, `source_url`, `scraper_name`, `platform`, `scraped_at`, `created_at`, `updated_at`, `review_count`, `average_rating`, `is_sponsored`, `sponsor_expires_at`, `reported` (BOOLEAN, added by `migration-reports.sql`), `age_range` (added by `add-age-range-column.sql`), `start_time`, `end_time`. **Critical: events does NOT have `min_age`, `max_age`, or `is_free`** — those columns only exist on the `activities` table. Putting them in any `.select(...)` on the events table returns 400 from PostgREST and bleeds egress on every retry. **Note:** The column is `source_url` not `source` — the `activities` table has `source` but `events` does not.
- Always use `date` TIMESTAMPTZ for filtering/sorting, never `event_date` (TEXT sorts alphabetically, not chronologically).
- `activities` table: venues/places with `location GEOMETRY(Point, 4326)` for PostGIS queries. Has `source TEXT` column. Also has `reported BOOLEAN DEFAULT FALSE`.
- `event_reports` table: stores user reports (reason, comment, reporter_ip, status). Defined in `database/migration-reports.sql`.
- `nearby_events` RPC: `nearby_events(lng, lat, radius_miles, max_results)` uses `ST_DWithin()`. Excludes `reported` items.
- `nearby_activities` RPC: `nearby_activities(lng, lat, radius_miles, max_results)` — same pattern as `nearby_events` for venues. Excludes `reported` items.
- Location stored as `SRID=4326;POINT(lng lat)` WKT format.
- Geohash stored as 7-character string via ngeohash encoding.

### Scraper System
- 185+ scrapers in `scrapers/` directory, registered in `scrapers/scraper-registry.js`.
- `SCRAPERS` is an object (not array), keyed by scraper name.
- 3-day group rotation: Group 1 runs days 1,4,7,10...; Group 2 runs 2,5,8,11...; Group 3 runs 3,6,9,12...
- MacaroniKid scrapers: 43 state-specific files (`scraper-macaroni-{state}.js`), each with identical structure.
- All events flow through `supabase-adapter.js` → `saveEvent()` or `flattenEvent()`.
- **Supabase client import**: Use `const { supabase } = require('./scrapers/helpers/supabase-adapter')` for direct Supabase client access in fix scripts. Do NOT use `db` (that's a Firestore-style reference used internally by scrapers). Pattern: `const { supabase } = require(...)` then `supabase.from('events').select(...)`.
- Fix scripts follow a `--save` flag pattern: dry run by default, `--save` to write to DB. Always import `supabase` from `supabase-adapter.js`.

### Client-Side Patterns
- Location persisted in `localStorage` key `funhive_location` as `{lat, lng}` JSON.
- Events page reads URL params: `?category=`, `?q=`, `?date=`.
- `ACTIVE_STATES` in `src/lib/region-filter.ts` controls which states appear on the website.
- Age filtering uses numeric range intersection (not keyword matching).

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
  - **Daily**: `node scripts/data-quality-quick.js` (count-only audit, ~5 MB egress) and `bash scripts/fix-all.sh --recent-only` (last 72h only, ~50–150 MB).
  - **Monthly**: `bash scripts/fix-all.sh` (full sweep, ~1.5–2 GB) and `node scripts/data-quality-check.js` (deep audit, ~500 MB).
  - The scrapers' `saveEvent()` and `saveActivity()` now handle: junk-title rejection (`isJunkTitle()`), non-family rejection (sexy/cannabis/420/firearms/etc. all in `NON_FAMILY_PATTERNS`), cancelled rejection, past-event rejection, age-range normalization, adult-only rejection, time extraction, venue cleaning, geohash compute from lat/lng, and `event_date` text → `date` TIMESTAMPTZ parsing. Most rows no longer need backfill.
  - Override the recent-only window via `FIX_WINDOW_HOURS=N bash scripts/fix-all.sh --recent-only` (default 72).
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

### Testing Patterns
- Syntax check: `node -c scrapers/filename.js`
- Data quality: `node data-quality-check.js` (must run locally — sandbox can't reach Supabase)
- Fix scripts use `--save` flag pattern: dry run by default, `--save` to write to DB.

## File Map

### Core Application
- `src/app/page.tsx` — Homepage (server component + `HomeEvents` client component)
- `src/app/events/page.tsx` — Events listing with search, filters, location, map
- `src/app/activities/page.tsx` — Venues listing with similar filters
- `src/app/events/[id]/page.tsx` — Event detail page
- `src/app/activities/[id]/page.tsx` — Venue detail page
- `src/components/HomeEvents.tsx` — Location-aware event sections for homepage
- `src/components/Header.tsx` — Sticky nav with bee logo
- `src/lib/region-filter.ts` — `ACTIVE_STATES` array
- `src/lib/supabase.ts` — Client-side Supabase client
- `src/lib/supabase-server.ts` — Server-side Supabase client
- `src/lib/report-signing.ts` — HMAC-SHA256 signing for admin action links

### Reporting System
- `src/components/ReportButton.tsx` — Flag icon button for reporting events/venues
- `src/components/ReportModal.tsx` — Modal with report form (reason, comment, honeypot)
- `src/app/api/reports/route.ts` — POST endpoint: submit report, hide item, email admin
- `src/app/api/reports/[id]/[action]/route.ts` — GET endpoint: admin restore/remove via signed email links

### Scraper Infrastructure
- `scrapers/helpers/supabase-adapter.js` — Central save/flatten functions, venue cleaning, age detection, cancelled event filtering. Also hosts the Firestore-compat read wrapper (`db.collection(...).where(...).limit(N).get()`) with a lean default projection that drops `description`, `image_url`, and `location` GEOMETRY; `.limit()`, `.orderBy()`, `.select(cols)`, and the `'in'` operator are all honored. Override the projection per-call with `.select('*')` if a caller needs the heavy columns.
- `scrapers/helpers/event-save-helper.js` — Event saving with geocoding
- `scrapers/helpers/library-addresses.js` — Branch address lookups
- `scrapers/scraper-registry.js` — All scrapers registered with group/state
- `scrapers/utils/county-centroids.js` — County centroid fallback coordinates
- `scrapers/venue-matcher.js` — Venue deduplication matching
- `scrapers/date-normalization-helper.js` — Date string normalization

### Database
- `database/schema.sql` — Base PostgreSQL schema with PostGIS
- `database/schema-fix.sql` — Alternative `nearby_events` function
- `database/migration-reports.sql` — Adds `event_reports` table, `reported` columns, updates RPCs

### Data Quality Scripts (`scripts/` — run locally)
**Daily** (cheap, recent-only):
- `scripts/data-quality-quick.js` — Count-only audit using Postgres aggregates (~5 MB egress). No row downloads.
- `scripts/fix-all.sh --recent-only` — Runs Steps 1–4 against the last 72h only (configurable via `FIX_WINDOW_HOURS`). Deletion steps (past, junk, dateless) always full-scan.

**Monthly** (full sweep):
- `scripts/fix-all.sh` — Full sweep across all 4 steps.
- `scripts/data-quality-check.js` — Deep audit: duplicates, distributions, scraper health, sample issues.

**Individual fix scripts** (all support `--save`, `--recent-only`):
- `scripts/fix-all-data-quality.js` — Step 1: normalize age ranges, delete adult-only events, delete past events, backfill parsed dates.
- `scripts/cleanup-nonfamily-events.js` — Step 2: auto-delete non-family events (3-tier: auto-delete, keep, borderline CSV). saveEvent now rejects most of these at scrape time.
- `scripts/fix-event-quality.js` — Step 3: fix missing geohash, location, city, state, times, junk titles, past events. Description backfill removed.
- `scripts/fix-missing-fields.js` — Step 4: backfill activity addresses via reverse geocode. Description backfill disabled.
- `scripts/fix-duplicate-venues.js` — Clean room suffixes from existing venue names (one-off).
- `scripts/fix-cancelled-events.js` — Remove cancelled/closed/postponed events (saveEvent now does this at scrape time).
- `scripts/archive/` — Retired scripts kept for reference (e.g., `fix-duplicate-dates.js` — Communico bug fixed Apr 2026).

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
