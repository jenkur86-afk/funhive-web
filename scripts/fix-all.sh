#!/bin/bash
# Run data quality fix scripts.
#
# CADENCE (run from project root):
#   Daily:    bash scripts/fix-all.sh --recent-only
#             Cheap (~50–150 MB egress) — checks last 72h of new rows only.
#             Set FIX_WINDOW_HOURS=N to override the 72h window.
#   Monthly:  bash scripts/fix-all.sh
#             Full table sweep (~1.5–2 GB egress). Catches accumulated drift.
#
# Notes:
#  • saveEvent() in supabase-adapter.js now rejects junk titles, non-family events,
#    cancelled events, past events, and adult content at scrape time, AND computes
#    geohash from coordinates and parses event_date → date TIMESTAMPTZ. Most rows
#    no longer need backfill, so daily --recent-only runs do very little work.
#  • fix-duplicate-dates.js was retired Apr 2026 (Communico scraper bug fixed).
#    Old copy lives in scripts/archive/ for reference.

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ARGS="$@"  # forward --recent-only and any other flags

echo "═══════════════════════════════════════════════════"
echo "  STEP 1: fix-all-data-quality.js"
echo "  (age ranges, adult events, past events, dates)"
echo "═══════════════════════════════════════════════════"
node "$SCRIPT_DIR/fix-all-data-quality.js" --save $ARGS

echo ""
echo "═══════════════════════════════════════════════════"
echo "  STEP 2: cleanup-nonfamily-events.js"
echo "  (sexy, burlesque, cannabis, 21+ — tier 1 auto-delete)"
echo "  (saveEvent now rejects most of these at scrape time;"
echo "   this remains as a backstop)"
echo "═══════════════════════════════════════════════════"
node "$SCRIPT_DIR/cleanup-nonfamily-events.js" --save $ARGS

echo ""
echo "═══════════════════════════════════════════════════"
echo "  STEP 3: fix-event-quality.js"
echo "  (events + activities: geohash, city, location,"
echo "   times, junk titles, past events)"
echo "  Description backfill removed — descriptions stay empty."
echo "═══════════════════════════════════════════════════"
node "$SCRIPT_DIR/fix-event-quality.js" --save $ARGS

echo ""
echo "═══════════════════════════════════════════════════"
echo "  STEP 4: fix-missing-fields.js"
echo "  (activities: missing address via reverse geocode)"
echo "  ⏱️  ~80 min for full sweep (Nominatim rate limit);"
echo "      seconds in --recent-only mode."
echo "═══════════════════════════════════════════════════"
node "$SCRIPT_DIR/fix-missing-fields.js" --save --addresses $ARGS

echo ""
echo "═══════════════════════════════════════════════════"
echo "  ✅ ALL FIXES COMPLETE"
echo "  Run: node scripts/data-quality-quick.js  (cheap audit)"
echo "  or:  node scripts/data-quality-check.js  (monthly full audit)"
echo "═══════════════════════════════════════════════════"
