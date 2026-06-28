# Register FunHive scrapers as Windows Scheduled Tasks
# Replaces the Mac launchd plists in scrapers/launchd/
#
# Run ONCE from an elevated (admin) PowerShell:
#   .\scrapers\task-scheduler\setup-tasks.ps1
#
# To remove all tasks:
#   Unregister-ScheduledTask -TaskName "FunHive-Scrapers","FunHive-Monitor" -Confirm:$false

$nodeExe = (Get-Command node -ErrorAction Stop).Source
$projectRoot = "C:\dev\funhive-web"
$scraperDir  = "$projectRoot\scrapers"
$logDir      = "$scraperDir\logs"

New-Item -ItemType Directory -Force $logDir | Out-Null

# ── Task 1: Daily scraper runner at 3:00 AM ──────────────────────────────────
# Equivalent: com.funhive.scrapers.plist
$action1  = New-ScheduledTaskAction `
    -Execute $nodeExe `
    -Argument "local-scraper-runner.js" `
    -WorkingDirectory $scraperDir
$trigger1 = New-ScheduledTaskTrigger -Daily -At "3:00AM"
$settings1 = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Hours 4) -Priority 7
Register-ScheduledTask `
    -TaskName "FunHive-Scrapers" `
    -Action $action1 `
    -Trigger $trigger1 `
    -Settings $settings1 `
    -RunLevel Highest `
    -Force | Out-Null
Write-Host "Registered: FunHive-Scrapers (daily 3:00 AM)"

# ── Task 2: Daily monitor at 8:00 AM ─────────────────────────────────────────
# Equivalent: com.funhive.monitor.plist
$action2  = New-ScheduledTaskAction `
    -Execute $nodeExe `
    -Argument "local-scraper-monitor.js" `
    -WorkingDirectory $scraperDir
$trigger2 = New-ScheduledTaskTrigger -Daily -At "8:00AM"
$settings2 = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Hours 1) -Priority 7
Register-ScheduledTask `
    -TaskName "FunHive-Monitor" `
    -Action $action2 `
    -Trigger $trigger2 `
    -Settings $settings2 `
    -RunLevel Highest `
    -Force | Out-Null
Write-Host "Registered: FunHive-Monitor (daily 8:00 AM)"

# ── Note: com.funhive.eventseries.plist ──────────────────────────────────────
# local-create-event-series.js does not exist yet.
# When it is created, add a task here running at 0:30, 6:30, 12:30, 18:30.

Write-Host ""
Write-Host "Done. To verify: Get-ScheduledTask | Where-Object { `$_.TaskName -like 'FunHive*' }"
Write-Host "Logs will be written to: $logDir"
Write-Host ""
Write-Host "NOTE: stdout/stderr are not automatically captured by Task Scheduler."
Write-Host "To capture logs, pipe inside local-scraper-runner.js or wrap in a .bat:"
Write-Host "  node local-scraper-runner.js >> logs\scraper-stdout.log 2>> logs\scraper-stderr.log"
