<#
  run-platform-discovery.ps1 - one-off job wrapper for discover-platform-host.js.

  WHY A WRAPPER: the discovery run drives Chrome, and reports/fix-notes.json
  records concurrent heavy Chrome workloads as the leading suspect for a
  37-scraper launch failure. So this refuses to start while a scraper task is
  running and EXITS NON-ZERO, which is what makes Task Scheduler's
  restart-on-failure retry it 15 minutes later. A "failure" here usually means
  "not now", and the log says which.

  HEADROOM GUARD: FunHive-Macaroni starts at 15:00 local and runs for hours. A
  discovery pass takes 25-45 minutes, so starting one after $LatestStart would
  run straight into it - exactly the contention this wrapper exists to avoid.
  After that cutoff it stops trying and says so, rather than causing the problem.

  NOT part of the standing maintenance set. scrapers/task-scheduler/setup-tasks.ps1
  remains the source of truth for the four FunHive-* tasks; this is a one-off and
  is deliberately not registered there.
#>

$ErrorActionPreference = 'Stop'
$Repo    = 'C:\dev\funhive-web'
$LogDir  = Join-Path $Repo 'scrapers\logs'
$Log     = Join-Path $LogDir 'platform-discovery.log'
$Todo    = Join-Path $LogDir 'platform-mismatch-todo.json'
$Sites   = Join-Path $LogDir 'platform-mismatch-sites.txt'
$Out     = Join-Path $Repo 'reports\platform-hosts.tsv'

# Last clock time a NEW run may begin. 14:00 leaves an hour before MacaroniKid.
$LatestStart = 14

function Say($msg) {
  $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
  Add-Content -Path $Log -Value $line -Encoding utf8
  Write-Output $line
}

if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Force -Path $LogDir | Out-Null }
Say "--- attempt starting ---"

# 1. Already done? Then stop cleanly so retries don't repeat the work.
if (Test-Path $Out) {
  Say "SUCCESS ALREADY RECORDED: $Out exists. Nothing to do; delete it to force a re-run."
  exit 0
}

# 2. Too late in the day to fit before FunHive-Macaroni at 15:00.
$hourNow = [int](Get-Date -Format 'HH')
if ($hourNow -ge $LatestStart) {
  Say "GIVING UP FOR TODAY: it is past ${LatestStart}:00 and a run takes 25-45 min, so starting now would collide with FunHive-Macaroni at 15:00. Re-schedule for the next quiet window."
  exit 0
}

# 3. Busy check - the real reason to defer. Exit 1 so the scheduler retries.
foreach ($t in @('FunHive-Scrapers', 'FunHive-Macaroni')) {
  try {
    $state = (Get-ScheduledTask -TaskName $t -ErrorAction Stop).State
    if ($state -eq 'Running') {
      Say "BUSY: $t is Running. Deferring; the scheduler will retry in 15 minutes."
      exit 1
    }
  } catch {
    Say "WARN: could not read task $t ($($_.Exception.Message)) - continuing on the process check."
  }
}

$chrome = @(Get-Process chrome -ErrorAction SilentlyContinue).Count
if ($chrome -gt 6) {
  Say "BUSY: $chrome chrome processes are live, which suggests a scrape is still winding down. Deferring; retry in 15 minutes."
  exit 1
}
Say "Clear to run (chrome=$chrome). Building the current worklist."

# 4. Rebuild the worklist from the CURRENT verdict store, never a stale snapshot.
Set-Location $Repo
& node (Join-Path $Repo 'scripts\build-platform-mismatch-todo.js') "--out=$Todo" 2>&1 | ForEach-Object { Say $_ }
if ($LASTEXITCODE -ne 0) { Say "FAILED building todo (exit $LASTEXITCODE)"; exit 1 }

& node (Join-Path $Repo 'scripts\build-verify-input.js') "--in=$Todo" "--out=$Sites" 2>&1 | ForEach-Object { Say $_ }
if ($LASTEXITCODE -ne 0) { Say "FAILED building sites input (exit $LASTEXITCODE)"; exit 1 }

# NO-URL rows cannot be fetched; drop them here so they are not counted as failures.
$fetchable = Join-Path $LogDir 'platform-mismatch-fetchable.txt'
Get-Content $Sites | Where-Object { $_ -notmatch 'NO-URL' } | Set-Content -Path $fetchable -Encoding utf8
$n = @(Get-Content $fetchable).Count
Say "fetchable sites: $n"
if ($n -eq 0) { Say "nothing to fetch - stopping"; exit 0 }

# 5. The discovery pass. Concurrency stays at 2, below the documented default.
Say "running discover-platform-host.js at concurrency 2"
& node (Join-Path $Repo 'scripts\discover-platform-host.js') "--in=$fetchable" "--out=$Out" '--concurrency=2' 2>&1 |
  ForEach-Object { Say $_ }
$code = $LASTEXITCODE

if ($code -eq 0 -and (Test-Path $Out)) {
  Say "DONE. Wrote $Out"
  exit 0
}
Say "FAILED: discover-platform-host.js exited $code. Will retry in 15 minutes."
if (Test-Path $Out) { Remove-Item $Out -Force }   # partial output must not look like success
exit 1
