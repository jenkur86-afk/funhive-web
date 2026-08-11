# Run data quality fix scripts (Windows equivalent of fix-all.sh)
#
# CADENCE (run from project root):
#   Daily:   .\scripts\fix-all.ps1 --recent-only
#            Cheap (~15-50 MB egress) -- checks last 24h of new rows only.
#            Set $env:FIX_WINDOW_HOURS before running to override the 24h window.
#   Monthly: .\scripts\fix-all.ps1
#            Full table sweep (~1.5-2 GB egress). Catches accumulated drift.
#
# RETIRED SCRIPTS (not included here):
#   fix-duplicate-dates.js  — Retired April 2026; Communico date-format bug was fixed upstream.
#   fix-cancelled-events.js — Retired; saveEvent() now rejects cancelled events at scrape time.
#   fix-duplicate-venues.js — One-off run to strip room suffixes; not needed regularly.

$passArgs = $args
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Steps 1-4 used to `exit 1` the moment one of them failed, which skipped STEP 5
# entirely — so reports/site-report.html went stale exactly when something had
# gone wrong and the report was most worth reading. Failures are now recorded
# and re-raised at the very end, after the report has been refreshed.
$failedSteps = @()

function Invoke-Step {
    param([string]$Name, [scriptblock]$Body)
    Write-Host ""
    Write-Host "==================================================="
    Write-Host "  $Name"
    Write-Host "==================================================="
    # Check $LASTEXITCODE, NOT $?. For a native command like `node` invoked
    # through a scriptblock, $? reports whether the process could be started,
    # not what it exited with — a step that exits 1 leaves $? true and the
    # failure goes unrecorded. Verified: the $? form missed a deliberate exit 3.
    $global:LASTEXITCODE = 0
    & $Body
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  !! $Name FAILED (exit $LASTEXITCODE) - continuing so the report still refreshes" -ForegroundColor Yellow
        $script:failedSteps += $Name
    }
}

Invoke-Step "STEP 1: fix-all-data-quality.js (age ranges, adult events, past events, dates)" {
    node "$scriptDir\fix-all-data-quality.js" --save @passArgs
}

Invoke-Step "STEP 2: cleanup-nonfamily-events.js (sexy, burlesque, cannabis, 21+ -- tier 1 auto-delete)" {
    node "$scriptDir\cleanup-nonfamily-events.js" --save @passArgs
}

Invoke-Step "STEP 3: fix-event-quality.js (events + activities: geohash, city, location, times, junk titles)" {
    node "$scriptDir\fix-event-quality.js" --save @passArgs
}

Invoke-Step "STEP 4: fix-missing-fields.js (activities: missing address via reverse geocode)" {
    node "$scriptDir\fix-missing-fields.js" --save --addresses @passArgs
}

Write-Host ""
Write-Host "==================================================="
Write-Host "  STEP 5: generate-site-report.js"
Write-Host "  (refresh reports/site-report.html from the run"
Write-Host "   that just finished - local files only, no egress)"
Write-Host "  ALWAYS RUNS, even if a step above failed."
Write-Host "==================================================="
node "$scriptDir\generate-site-report.js"
# Deliberately not gated on $? : a report failure must never fail the data-quality chain.

Write-Host ""
Write-Host "==================================================="
if ($failedSteps.Count -gt 0) {
    Write-Host "  COMPLETED WITH FAILURES"
    foreach ($f in $failedSteps) { Write-Host "    - $f" }
    Write-Host "  reports\site-report.html was still refreshed."
    Write-Host "==================================================="
    exit 1
}
Write-Host "  ALL FIXES COMPLETE"
Write-Host "  Run: node scripts\data-quality-quick.js  (cheap audit)"
Write-Host "  or:  node scripts\data-quality-check.js  (monthly full audit)"
Write-Host "==================================================="
