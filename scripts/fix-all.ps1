# Run data quality fix scripts (Windows equivalent of fix-all.sh)
#
# CADENCE (run from project root):
#   Daily:   .\scripts\fix-all.ps1 --recent-only
#            Cheap (~50-150 MB egress) -- checks last 72h of new rows only.
#            Set $env:FIX_WINDOW_HOURS before running to override the 72h window.
#   Monthly: .\scripts\fix-all.ps1
#            Full table sweep (~1.5-2 GB egress). Catches accumulated drift.

$passArgs = $args
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "==================================================="
Write-Host "  STEP 1: fix-all-data-quality.js"
Write-Host "  (age ranges, adult events, past events, dates)"
Write-Host "==================================================="
node "$scriptDir\fix-all-data-quality.js" --save @passArgs
if (-not $?) { exit 1 }

Write-Host ""
Write-Host "==================================================="
Write-Host "  STEP 2: cleanup-nonfamily-events.js"
Write-Host "  (sexy, burlesque, cannabis, 21+ -- tier 1 auto-delete)"
Write-Host "==================================================="
node "$scriptDir\cleanup-nonfamily-events.js" --save @passArgs
if (-not $?) { exit 1 }

Write-Host ""
Write-Host "==================================================="
Write-Host "  STEP 3: fix-event-quality.js"
Write-Host "  (events + activities: geohash, city, location,"
Write-Host "   times, junk titles, past events)"
Write-Host "==================================================="
node "$scriptDir\fix-event-quality.js" --save @passArgs
if (-not $?) { exit 1 }

Write-Host ""
Write-Host "==================================================="
Write-Host "  STEP 4: fix-missing-fields.js"
Write-Host "  (activities: missing address via reverse geocode)"
Write-Host "  ~80 min for full sweep; seconds in --recent-only."
Write-Host "==================================================="
node "$scriptDir\fix-missing-fields.js" --save --addresses @passArgs
if (-not $?) { exit 1 }

Write-Host ""
Write-Host "==================================================="
Write-Host "  ALL FIXES COMPLETE"
Write-Host "  Run: node scripts\data-quality-quick.js  (cheap audit)"
Write-Host "  or:  node scripts\data-quality-check.js  (monthly full audit)"
Write-Host "==================================================="
