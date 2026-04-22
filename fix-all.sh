#!/bin/bash
# Run ALL data quality fix scripts in order
# Usage: bash fix-all.sh

set -e

echo "═══════════════════════════════════════════════════"
echo "  STEP 1: fix-all-data-quality.js"
echo "  (age ranges, adult events, past events, dates)"
echo "═══════════════════════════════════════════════════"
node fix-all-data-quality.js --save

echo ""
echo "═══════════════════════════════════════════════════"
echo "  STEP 2: cleanup-nonfamily-events.js"
echo "  (sexy, burlesque, cannabis, 21+ — tier 1 auto-delete)"
echo "═══════════════════════════════════════════════════"
node cleanup-nonfamily-events.js --save

echo ""
echo "═══════════════════════════════════════════════════"
echo "  STEP 3: fix-event-quality.js"
echo "  (events + activities: geohash, city, location,"
echo "   descriptions, times, junk titles, past events)"
echo "═══════════════════════════════════════════════════"
node fix-event-quality.js --save

echo ""
echo "═══════════════════════════════════════════════════"
echo "  ✅ ALL FIXES COMPLETE"
echo "  Run: node data-quality-check.js to verify"
echo "═══════════════════════════════════════════════════"
