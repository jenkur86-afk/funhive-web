---
name: funhive-data-quality
description: "Run FunHive database data quality checks and automatic corrections. Use this skill whenever the user mentions: data check, data quality, data cleanup, database audit, scraper health, missing fields, duplicate events, stale events, event cleanup, venue enrichment, or anything related to checking and maintaining the FunHive events and activities database. Also trigger when user says 'run data checks' or 'clean up the database'."
---

# FunHive Data Quality Check & Correction

This skill runs a comprehensive data quality audit on the FunHive Supabase database, automatically fixes common issues, and reports findings. It covers both the `events` and `activities` tables.

## When to Use

Run this skill daily (via schedule) or on-demand when the user asks about data quality, database health, or after a batch of scrapers have run.

## How It Works

Execute the data quality script, which connects to the Supabase database and performs all checks and fixes in sequence:

```bash
node /path/to/funhive-web/.claude/skills/funhive-data-quality/scripts/data-quality-check.js
```

The script will output a structured report. After running it, summarize the findings for the user in a concise format.

## What the Script Does

### Automatic Fixes (safe, idempotent)

1. **Extract embedded times** - Moves times stuck in `event_date` (e.g. "April 21, 2026 6:00pm") into the proper `start_time` column
2. **Delete past events** - Removes events where `event_date` is before today
3. **Remove adult-only events** - Deletes events matching patterns like "21+", "adults only", "happy hour", "bar crawl", etc.
4. **Delete malformed dates** - Removes events with unparseable date strings
5. **Assign missing categories** - Uses venue name and event name keyword matching to assign categories (Storytimes & Library, Outdoor & Nature, Arts & Culture, etc.)
6. **Backfill missing state** - Infers state from linked activity, zip code prefix patterns, or venue location
7. **Enrich venue data** - Pulls URL, description, and address from linked events into activities that are missing those fields
8. **Normalize category names** - Ensures consistent naming (no "Community Events" vs "Community" duplicates)

### Audit Checks (report only)

9. **Field completeness** - Counts missing values for all display-critical fields in both tables
10. **True duplicates** - Finds events with identical name + date + venue
11. **Duplicate venues** - Finds activities with identical name + address
12. **Orphaned references** - Events linked to non-existent activities
13. **Unlocatable events** - Events with no location, city, or zip code
14. **Scraper activity** - Which scrapers ran recently and how many events they produced
15. **Event date coverage** - Checks if upcoming events exist for the next 2-4 weeks

## Interpreting Results

The script outputs JSON with a `fixes` section (what was changed) and an `audit` section (current state). Key thresholds to watch:

- **missing_category > 10%**: Scraper adapter may need updating
- **missing_state > 5%**: New zip code patterns may need adding
- **missing_location > 20%**: Geocoding service may be failing
- **duplicate_events > 0**: Scraper deduplication logic needs review
- **past_events > 0 after fix**: Date format the script doesn't handle
- **scraper_inactive > 7 days**: Scraper may be broken or rate-limited

## Database Connection

The script uses the Supabase project credentials from the environment or from the `.env.local` file in the funhive-web root directory. It needs the service role key for write operations.
