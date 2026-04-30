# FunHive Script-Writing Prompt

Copy everything below the line and paste it into a new conversation when you want Claude to write a new script in `scripts/` (one-off backfill, recurring fix, audit, migration, etc.). Tell Claude what you want the script to do, and the rules below tell it *how*.

---

## Instructions

You are writing a new script in the FunHive project (`/Users/jenniferkurtz/Desktop/funhive-web`). Every script you write must:

1. Run on the user's local machine — not in the sandbox. The user runs it; you do not.
2. Connect to Supabase via the shared adapter — never directly to Postgres.
3. Default to dry-run; only write to the DB when `--save` is passed.
4. Use selective `.select()` columns to keep Supabase egress under the 5.5 GB free-plan limit.
5. Be syntax-clean (`node -c <file>` passes).

Read this entire document before writing the first line of code. The rules here exist because past sessions burned through egress, broke the schema, or shipped silent bugs.

---

## Decide first: scraper change or new script?

Before reaching for a new script, ask: **could this run inside `saveEvent()` / `saveActivity()` in `scrapers/helpers/supabase-adapter.js` instead?**

A check belongs at save time (in the adapter) when:
- It rejects bad rows (junk titles, non-family content, cancelled events, past events, adult content)
- It derives a field that was missing (geohash from lat/lng, parsed date from text, normalized age range)
- The same logic would otherwise need to run repeatedly in a fix script every day

A standalone script is the right answer when:
- It's a one-off cleanup tied to a closed bug ("the Communico scraper produced doubled date strings between Mar 1 and Apr 15")
- It's an audit that reads the DB but never writes
- It does work no scraper has the context for (cross-row dedup, reverse-geocode for missing addresses, scraper-health reports)
- It's a migration (renaming a field, splitting a column, etc.)

**If your script duplicates logic that already runs in `saveEvent()`, your script is wrong. Move the logic upstream.**

The current save-time validations (don't re-implement these) are: `isJunkTitle`, `isNonFamilyEvent` with `NON_FAMILY_PATTERNS` + `FAMILY_RESCUE_PATTERNS` + `NON_FAMILY_VENUE_PATTERNS`, `isCancelledEvent`, placeholder-venue rejection, past-event rejection, age-range normalization, adult-only rejection, time extraction (`extractTimeFromDateString`), venue cleaning (`cleanVenueName`), geohash compute from lat/lng (via `ngeohash.encode`), parsed date backfill (`parseEventDateText`), field truncation, and PostGIS location encoding.

---

## Where scripts live and how they're named

- Scripts go in `scripts/`.
- Daily/monthly recurring fix scripts: `scripts/fix-<thing>.js`.
- One-off cleanups: `scripts/fix-<specific-bug>.js`. Move to `scripts/archive/` after the bug is fixed in the scraper or the cleanup is permanent.
- Audits (read-only): `scripts/data-quality-<scope>.js`.
- Migrations: `scripts/migrate-<change>.js`.
- Run them all from the project root (`bash scripts/<file>.sh` or `node scripts/<file>.js`).
- Add to `scripts/fix-all.sh` only if it should run on the daily/monthly cadence. Otherwise it's a manual tool.

---

## Required scaffolding (copy this into every new script)

```js
#!/usr/bin/env node

/**
 * <SCRIPT TITLE>
 *
 * What it does in 2-3 sentences.
 *
 * Usage:
 *   node scripts/<filename>.js              # Dry run
 *   node scripts/<filename>.js --save       # Write changes to DB
 *   node scripts/<filename>.js --recent-only  # Last FIX_WINDOW_HOURS only (default 72h)
 *   FIX_WINDOW_HOURS=168 node scripts/<filename>.js --recent-only  # 7-day window
 */

const { supabase } = require('../scrapers/helpers/supabase-adapter');

const SAVE = process.argv.includes('--save');
const RECENT_ONLY = process.argv.includes('--recent-only');
const FIX_WINDOW_HOURS = parseInt(process.env.FIX_WINDOW_HOURS || '72', 10);
const RECENT_THRESHOLD_ISO = RECENT_ONLY
  ? new Date(Date.now() - FIX_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
  : null;

async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  <SCRIPT TITLE> ${SAVE ? '(SAVING)' : '(DRY RUN)'}`);
  if (RECENT_ONLY) console.log(`  Mode: --recent-only (last ${FIX_WINDOW_HOURS}h, since ${RECENT_THRESHOLD_ISO})`);
  console.log(`${'═'.repeat(60)}\n`);

  // ... your work here ...

  console.log(`\n✅ Done. ${SAVE ? 'Wrote changes to DB.' : 'Dry run — re-run with --save to commit.'}`);
}

main().then(() => process.exit(0)).catch(e => { console.error('❌ Fatal:', e); process.exit(1); });
```

Read-only audits omit `SAVE`. One-off migrations may omit `RECENT_ONLY` if the whole point is to scan the full table. If you omit `RECENT_ONLY`, say so in the docstring.

---

## Bandwidth rules — the single most important section

The Supabase project is on the free 5.5 GB/month egress plan. A careless `select('*')` on the events table (~500k rows) burns ~500 MB in one shot. Don't do that.

**Always:**
- Specify columns explicitly: `.select('id, name, city, state')`. List only what you read.
- For audits that just need counts, use `.select('id', { count: 'exact', head: true })` — `head: true` returns the count without any rows.
- Paginate large fetches. The standard pattern below uses 1000-row pages.
- Filter at the DB, not in JS. `.eq()`, `.is()`, `.lt()`, `.gte()`, `.or()` push the filter to Postgres.

**Never:**
- `.select('*')` on `events` or `activities` for list/search queries. Detail pages reading a single row by id are fine.
- Reduce the venue cache TTL in `scrapers/venue-matcher.js` below 30 minutes. That cache is the single largest egress source during scraper runs.
- Pull rows just to count them. Use `count: 'exact', head: true`.

### Standard paginated fetch

```js
async function fetchAll(table, select, filters = {}) {
  let all = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    let q = supabase.from(table).select(select);
    if (filters.eq) q = q.eq(filters.eq[0], filters.eq[1]);
    if (filters.is) q = q.is(filters.is[0], filters.is[1]);
    if (filters.or) q = q.or(filters.or);
    if (filters.lt) q = q.lt(filters.lt[0], filters.lt[1]);
    if (filters.not) q = q.not(filters.not[0], filters.not[1], filters.not[2]);
    if (RECENT_THRESHOLD_ISO && !filters.skipRecentFilter) {
      q = q.gte('created_at', RECENT_THRESHOLD_ISO);
    }
    const { data, error } = await q.range(from, from + pageSize - 1);
    if (error) { console.error(`Error: ${error.message}`); break; }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}
```

### When `--recent-only` should NOT apply (skipRecentFilter)

Some scans must always full-scan even in recent-only mode — anything that *deletes* stale junk that breaks display regardless of when it was scraped:
- Past events
- Junk-title events
- Dateless events
- Cancelled events

These pass `{ skipRecentFilter: true }` so they bypass the recent gate. They use selective columns (`'id, name'` typically) so the egress is small even on full scans.

---

## Database column gotchas

Check `database/schema.sql` before assuming a column name. The most common screw-ups:

| Column          | `events`                | `activities`            | Notes |
|-----------------|-------------------------|-------------------------|-------|
| Source URL      | `source_url`            | (no equivalent)         | Activities use `source` instead. |
| Source/site     | (no equivalent)         | `source` (TEXT)         | |
| Display date    | `event_date` (TEXT)     | n/a                     | Scraper-provided text. **Never sort or filter by this — it sorts alphabetically.** |
| Sortable date   | `date` (TIMESTAMPTZ)    | n/a                     | Always use this for date filters and `order()`. |
| Geohash         | `geohash` (CHAR(7))     | `geohash`               | Compute via `ngeohash.encode(lat, lng, 7)`. |
| Coordinates     | `location` (GEOMETRY)   | `location` (GEOMETRY)   | Store as `SRID=4326;POINT(lng lat)` WKT. |
| Reported flag   | `reported` (BOOLEAN)    | `reported`              | Filter with `.eq('reported', false)` for visible-only. |
| Created at      | `created_at`            | `created_at`            | DB-managed; use this for `--recent-only`. |

Other gotchas:
- The reports table is `event_reports` (defined in `database/migration-reports.sql`).
- The `nearby_events` and `nearby_activities` RPCs return **all columns** (`SETOF table`). Keep `max_results` reasonable.

---

## Date handling — every script gets this wrong at least once

- **Never** parse a date-only ISO string with `new Date("2026-04-23")`. JavaScript treats it as UTC midnight, which lands on the previous day in US timezones. Append `T00:00:00`: `new Date("2026-04-23T00:00:00")`.
- **Never** sort or filter by `event_date` (TEXT). Use `date` (TIMESTAMPTZ).
- When comparing dates, normalize both sides to date-only at midnight before comparing — see `_isDateInPast` in `supabase-adapter.js`.
- For "today" in queries: `new Date().toISOString().split('T')[0]` gives `'YYYY-MM-DD'`, which Postgres compares cleanly against TIMESTAMPTZ.
- Many events have `event_date` text but no parsed `date`. `saveEvent()` now backfills this at save time via `parseEventDateText`. If you're writing an audit that needs a date, fall back to `event_date` parsed client-side when `date` is null.

---

## Geocoding (Nominatim)

If your script reverse- or forward-geocodes:
- Rate limit ≥ 2.5 seconds between requests. The Nominatim ToS requires it; less than that and you get banned.
- Use a descriptive User-Agent: `'FunHive/1.0 (admin@funhive.com)'` — not the default `node-fetch` UA.
- Cache results in-process (`{}` keyed by city+state or by lat/lng rounded). Geocoding the same city 200 times is wasteful.
- If geocoding fails, fall back through: full address → city-level → venue cache lookup → county centroid → state centroid. Each step guarded by `if (!coords)`.
- Never overwrite original `details.city` or `details.address` with centroid data — preserve what the scraper supplied even when geocoding fails.

---

## Deletes and updates

### Batched deletes (for cleanup-style scripts)

```js
if (SAVE && idsToDelete.length > 0) {
  for (let i = 0; i < idsToDelete.length; i += 100) {
    const batch = idsToDelete.slice(i, i + 100);
    const { error } = await supabase.from('events').delete().in('id', batch);
    if (error) console.error(`  Error: ${error.message}`);
  }
  console.log(`✅ Deleted ${idsToDelete.length} rows`);
}
```

### Updates

For 1-100 rows: row-by-row `await supabase.from('events').update({ field: val }).eq('id', id)` is fine. For 1000+ rows, group by the new value and use `.in('id', batch)`:

```js
// Group by new value, then issue one update per group
const groups = {};
for (const u of toUpdate) {
  if (!groups[u.newValue]) groups[u.newValue] = [];
  groups[u.newValue].push(u.id);
}
for (const [newValue, ids] of Object.entries(groups)) {
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    await supabase.from('events').update({ field: newValue }).in('id', batch);
  }
}
```

### Upserts (for save-style work)

`await supabase.from('events').upsert(row, { onConflict: 'id' })`. On unique-constraint conflicts (`idx_events_unique_content` — name+date+venue), retry the failing batch row-by-row with `{ ignoreDuplicates: true }`. Pattern already implemented in `saveEvent()`.

---

## Output format conventions

Match the existing fix scripts so your output blends in:

```
══════════════════════════════════════════════════════════
  <TITLE> (DRY RUN)
  Mode: --recent-only (last 72h, since 2026-04-27T...)
══════════════════════════════════════════════════════════

🗑️  STEP 1: <step name>
───────────────────────────────────────
  Found 42 events with no geohash
  ✅ Fixed: 38/42

📝 STEP 2: <next step>
───────────────────────────────────────
  ...

✅ Done. Dry run — re-run with --save to commit.
```

- Section headers with an emoji + step number make logs scannable.
- Always print "Found N" before "Fixed M". Show progress for slow loops (`if (count % 100 === 0) console.log(...)`).
- Show 5-10 sample rows in dry-run mode so the user can sanity-check before saving.
- End with a clear one-line summary.

---

## Common script shapes — minimal templates

### A. Read-only audit

```js
const { supabase } = require('../scrapers/helpers/supabase-adapter');

async function countRows(table, filterFn) {
  let q = supabase.from(table).select('id', { count: 'exact', head: true });
  if (filterFn) q = filterFn(q);
  const { count } = await q;
  return count ?? 0;
}

async function main() {
  console.log('AUDIT REPORT');
  console.log('Total events:', await countRows('events'));
  console.log('Past events:', await countRows('events', q => q.lt('date', new Date().toISOString().split('T')[0])));
  console.log('Missing geohash:', await countRows('events', q => q.is('geohash', null)));
}
main().catch(console.error).finally(() => process.exit(0));
```

### B. Backfill missing field

```js
async function main() {
  console.log(`BACKFILL ${SAVE ? '(SAVING)' : '(DRY RUN)'}`);

  const rows = await fetchAll('events', 'id, city, state, location',
    { is: ['geohash', null] });
  console.log(`Found ${rows.length} events missing geohash`);

  let fixed = 0;
  for (const r of rows) {
    if (!r.location) continue;  // can't compute without coords
    const geohash = computeGeohashFromPostGIS(r.location);
    if (!geohash) continue;
    if (SAVE) {
      await supabase.from('events').update({ geohash }).eq('id', r.id);
    }
    fixed++;
  }
  console.log(`Fixed: ${fixed}/${rows.length}`);
}
```

### C. Cleanup with auto-delete

```js
async function main() {
  const rows = await fetchAll('events', 'id, name, description, venue, scraper_name');
  const toDelete = rows.filter(r => isJunk(r));
  console.log(`Found ${toDelete.length} junk events`);
  for (const r of toDelete.slice(0, 10)) console.log(`  - "${r.name}"`);

  if (SAVE && toDelete.length > 0) {
    const ids = toDelete.map(r => r.id);
    for (let i = 0; i < ids.length; i += 100) {
      await supabase.from('events').delete().in('id', ids.slice(i, i + 100));
    }
    console.log(`✅ Deleted ${ids.length} rows`);
  }
}
```

---

## Imports and adapter usage

```js
// Right
const { supabase } = require('../scrapers/helpers/supabase-adapter');
await supabase.from('events').select('id, name').eq('reported', false);

// Wrong — these are Firestore-compatibility wrappers, not Supabase clients
const { db } = require('../scrapers/helpers/supabase-adapter');
const { admin, db } = require('../scrapers/helpers/supabase-adapter');
```

If you need a save-time validation helper (junk title detection, age normalization, non-family check, cancelled-event check, parsed-date fallback, time extraction), import it from the same module. Don't reimplement.

---

## Testing checklist (do all of these before declaring done)

1. **Syntax**: `node -c scripts/<file>.js` returns no error.
2. **Dry run prints sensibly**: run without `--save`, confirm output is readable, counts make sense, sample rows shown.
3. **`--recent-only` honored**: if your script supports it, prove the recent gate is on the SELECT (`grep RECENT_THRESHOLD scripts/<file>.js`).
4. **Selective columns**: `grep "select(" scripts/<file>.js` — every `.select()` should list columns explicitly. Fail if you see `select('*')`.
5. **Stop-on-error**: top-level `.catch()` exits with a non-zero code. The runner script (`fix-all.sh`) uses `set -e` so a script that swallows errors silently breaks the pipeline.
6. **No new dependencies** unless you really need them. `ngeohash`, `@supabase/supabase-js`, `dotenv`, `node-fetch` are already available.

The user runs the script on their own machine (the sandbox can't reach Supabase). After they run it, expect them to share output for diagnosis.

---

## Final summary for the user — REQUIRED format

End your response with a section titled **"What I built and how to run it"**:

1. **List the file you created/modified** with absolute path.
2. **Show the exact command** the user should run, with and without `--save`. Include `--recent-only` if applicable.
3. **Estimate egress** (rough — "~50 MB" or "~5 MB"). If it's a one-off full scan, say so.
4. **Note any follow-up work** the script reveals (e.g., "if more than 5% of events still have no geohash after this runs, the root cause is in scraper X — fix the geocoding chain there").
5. **Don't tell the user to commit/push** unless they asked. Their preferred git flow lives in `SCRAPER-DIAGNOSIS-PROMPT.md`.

---

## What you are working on

(Describe the script you want Claude to write — what it should do, what tables it touches, whether it deletes/updates/audits, how often it runs.)
