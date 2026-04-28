#!/bin/bash
# Run ALL data quality fix scripts in order
# Usage: bash scripts/fix-all.sh  (from project root)
# Schedule: Run WEEKLY, not after every scraper run (saves ~10+ GB/month egress)

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "═══════════════════════════════════════════════════"
echo "  STEP 1: fix-all-data-quality.js"
echo "  (age ranges, adult events, past events, dates)"
echo "═══════════════════════════════════════════════════"
node "$SCRIPT_DIR/fix-all-data-quality.js" --save

echo ""
echo "═══════════════════════════════════════════════════"
echo "  STEP 2: cleanup-nonfamily-events.js"
echo "  (sexy, burlesque, cannabis, 21+ — tier 1 auto-delete)"
echo "═══════════════════════════════════════════════════"
node "$SCRIPT_DIR/cleanup-nonfamily-events.js" --save

echo ""
echo "═══════════════════════════════════════════════════"
echo "  STEP 3: fix-event-quality.js"
echo "  (events + activities: geohash, city, location,"
echo "   descriptions, times, junk titles, past events)"
echo "═══════════════════════════════════════════════════"
node "$SCRIPT_DIR/fix-event-quality.js" --save

echo ""
echo "═══════════════════════════════════════════════════"
echo "  STEP 4: fix-duplicate-dates.js"
echo "  (events with doubled date strings from scraper bug)"
echo "═══════════════════════════════════════════════════"
node "$SCRIPT_DIR/fix-duplicate-dates.js" --save

echo ""
echo "═══════════════════════════════════════════════════"
echo "  STEP 5: fix-missing-fields.js"
echo "  (activities: missing address via reverse geocode,"
echo "   also backfills city/state/zip from coordinates)"
echo "  ⏱️  ~80 min for 3000+ venues (Nominatim rate limit)"
echo "═══════════════════════════════════════════════════"
node "$SCRIPT_DIR/fix-missing-fields.js" --save --addresses

echo ""
echo "═══════════════════════════════════════════════════"
echo "  ✅ ALL FIXES COMPLETE"
echo "  Run: node scripts/data-quality-check.js to verify"
echo "═══════════════════════════════════════════════════"
