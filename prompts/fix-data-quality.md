# FunHive Data Quality Diagnosis Prompt

Paste this at the start of a Cowork session along with output from data quality scripts.

---

## Prompt

I need help fixing data quality issues in my FunHive database. FunHive is a family event discovery platform using Supabase (PostgreSQL + PostGIS). The project has a CLAUDE.md with full architecture docs — read it first.

**Data quality pipeline (run in order via `bash fix-all.sh`):**
- Step 1: `fix-all-data-quality.js` — Normalize age ranges, fix mislabeled adult events, delete past events, backfill parsed dates
- Step 2: `cleanup-nonfamily-events.js` — Auto-delete non-family events (3-tier: auto-delete, keep, borderline CSV)
- Step 3: `fix-event-quality.js` — Fix missing geohash, location, city, state, descriptions, times, junk titles
- Step 4: `fix-duplicate-dates.js` — Fix events with doubled date strings from scraper bug
- Audit: `data-quality-check.js` — Full audit of completeness, duplicates, scraper health

All scripts use `--save` flag pattern: dry run by default, `--save` to write to DB.

**What to look for and fix:**

1. **Age range issues**
   - Mislabeled "Adults" events that are clearly for kids (check event name for: toddler, baby, preschool, kids, children, family, storytime, youth, teen, parent)
   - Fix the age range instead of deleting — map to the right bracket based on the event name
   - 5 brackets: Babies & Toddlers (0-2), Preschool (3-5), Kids (6-8), Tweens (9-12), Teens (13-18)

2. **Non-family event filtering**
   - Auto-delete tier: clearly non-family (burlesque, cannabis, bar crawl, gun show, drug take back, etc.)
   - False positive safeguards: events with "family", "kids", "children", "toddler" etc. in the title should NEVER be deleted
   - Events at family venues (zoo, museum, library, school, church, community center) should be kept
   - Borderline events (brewery mention, trivia night, happy hour, after dark) go to CSV for manual review — they stay on the website
   - `cleanup-nonfamily-events.js` has the 3-tier logic: `AUTO_DELETE_PATTERNS`, `isFalsePositive()`, `BORDERLINE_PATTERNS`

3. **Missing fields**
   - Events without parsed `date` TIMESTAMPTZ — try to backfill from `event_date` TEXT
   - Events without geohash, location, city, or state
   - Events with junk titles (nav elements, "Click here", single words)
   - Events without descriptions — try to backfill from scraper source

4. **Duplicate events**
   - Events with doubled date strings (e.g., "Wednesday, April 22: 5:45pm Wednesday, April 22: 5:45pm")
   - Duplicate venues with room/department suffixes ("Library - Meeting Room" → "Library")

5. **Past events**
   - Compare against `date` TIMESTAMPTZ column (not `event_date` TEXT)
   - Set hours to 0,0,0,0 for date-only comparison so today's events aren't flagged

**Key files:**
- `fix-all-data-quality.js` — Age normalization + past event deletion + date backfill
- `cleanup-nonfamily-events.js` — Non-family event filtering (3-tier)
- `fix-event-quality.js` — Field completeness fixes
- `fix-duplicate-dates.js` — Doubled date string fixes
- `scrapers/helpers/age-range-normalizer.js` — Age range normalization logic
- `scrapers/helpers/supabase-adapter.js` — Supabase client, saveEvent, flattenEvent

**Here's the output from the script I ran:**

[Paste the script output here]
