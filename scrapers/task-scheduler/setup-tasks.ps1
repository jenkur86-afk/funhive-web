# Register FunHive scrapers as Windows Scheduled Tasks
# Replaces the Mac launchd plists in scrapers/launchd/
#
# Run ONCE from an elevated (admin) PowerShell:
#   .\scrapers\task-scheduler\setup-tasks.ps1
#
# To remove all tasks:
#   Unregister-ScheduledTask -TaskName "FunHive-Scrapers","FunHive-Monitor" -Confirm:$false
#
# 2026-07-12: a bad -DisallowStartIfOnBatteries/-StopIfGoingOnBatteries
# parameter name (New-ScheduledTaskSettingsSet doesn't have those - the real
# ones are -AllowStartIfOnBatteries/-DontStopIfGoingOnBatteries, both
# switches, not $true/$false-valued) made both Register-ScheduledTask calls
# fail, but the script kept going and printed "Registered: ..." anyway since
# nothing was checking for errors. $ErrorActionPreference below makes any
# cmdlet failure stop the script immediately instead of silently lying about
# what happened.
$ErrorActionPreference = 'Stop'

$nodeExe = (Get-Command node -ErrorAction Stop).Source
$projectRoot = "C:\dev\funhive-web"
$scraperDir  = "$projectRoot\scrapers"
$logDir      = "$scraperDir\logs"

New-Item -ItemType Directory -Force $logDir | Out-Null

# ── Task 1: Daily scraper runner at 3:00 AM ──────────────────────────────────
# Equivalent: com.funhive.scrapers.plist
#
# Action points at run-scrapers.bat, NOT node directly - the bat file is what
# actually captures stdout/stderr to logs\ (Task Scheduler doesn't do this on
# its own, see the note at the bottom of this file) and, as of 2026-07-11,
# chains scripts\fix-all.ps1 --recent-only after the scraper run finishes so
# same-day data quality issues get cleaned up automatically each morning
# instead of requiring a separate manual/scheduled pass.
#
# ExecutionTimeLimit is 12h, not 4h: observed group runs have taken 5-10+
# hours depending on how much content changed since the last rotation, and
# the fix-all step adds more time on top of that. A tighter limit risks
# Task Scheduler killing a legitimately-still-running job (and skipping the
# fix-all step entirely that day) rather than catching a genuinely stuck one.
#
# 2026-07-12 incident: the 2026-07-12 run died silently ~66 minutes in with
# no crash trace - Task Scheduler's own LastTaskResult (3221225786 /
# 0xC000013A, a forced-termination code) plus StopIfGoingOnBatteries=True on
# the previously-registered task pointed at the machine switching to battery
# power mid-run and Task Scheduler killing the whole process tree. Explicitly
# disabled both battery-related settings below - a scraper run has no
# business being killed because a laptop got unplugged for a minute.
# LogonType S4U also added so the task survives the interactive session
# ending (lock/logoff/RDP disconnect) instead of dying with it; requires the
# "Log on as a batch job" right, which local admins have by default.
#
# 2026-07-17: the S4U change above was originally written as -LogonType S4U
# passed straight to Register-ScheduledTask, which has no such parameter (it
# lives on New-ScheduledTaskPrincipal) - the same wrong-parameter-name bug
# this file's header describes, and with $ErrorActionPreference = 'Stop' now
# set it would have aborted before registering EITHER task. Build a principal
# instead. -RunLevel moves onto the principal too: Register-ScheduledTask's
# -Principal parameter set doesn't accept -RunLevel alongside it.
$principal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType S4U `
    -RunLevel Highest

$action1  = New-ScheduledTaskAction `
    -Execute "cmd.exe" `
    -Argument "/c `"$scraperDir\run-scrapers.bat`"" `
    -WorkingDirectory $scraperDir
$trigger1 = New-ScheduledTaskTrigger -Daily -At "3:00AM"
$settings1 = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Hours 12) `
    -Priority 7 `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries
Register-ScheduledTask `
    -TaskName "FunHive-Scrapers" `
    -Action $action1 `
    -Trigger $trigger1 `
    -Settings $settings1 `
    -Principal $principal `
    -Force | Out-Null
Write-Host "Registered: FunHive-Scrapers (daily 3:00 AM, runs scrapers then fix-all --recent-only)"

# ── Task 2: Daily monitor at 8:00 AM ─────────────────────────────────────────
# Equivalent: com.funhive.monitor.plist
$action2  = New-ScheduledTaskAction `
    -Execute $nodeExe `
    -Argument "local-scraper-monitor.js" `
    -WorkingDirectory $scraperDir
$trigger2 = New-ScheduledTaskTrigger -Daily -At "8:00AM"
$settings2 = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1) `
    -Priority 7 `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries
Register-ScheduledTask `
    -TaskName "FunHive-Monitor" `
    -Action $action2 `
    -Trigger $trigger2 `
    -Settings $settings2 `
    -Principal $principal `
    -Force | Out-Null
Write-Host "Registered: FunHive-Monitor (daily 8:00 AM)"

# ── Note: com.funhive.eventseries.plist ──────────────────────────────────────
# local-create-event-series.js does not exist yet.
# When it is created, add a task here running at 0:30, 6:30, 12:30, 18:30.

# ── Verify what actually landed ───────────────────────────────────────────────
# $ErrorActionPreference = 'Stop' catches a cmdlet that *errors*, but not a task
# that registers with settings other than the ones intended. Both prior
# incidents (2026-07-12, 2026-07-17) were silent-wrong-state, not loud failures,
# so assert the three settings that matter rather than trusting the Write-Host
# above. Read back from Task Scheduler, not from our own local variables.
$expected = @{ LogonType = 'S4U'; StopIfGoingOnBatteries = $false; DisallowStartIfOnBatteries = $false }
$bad = @()
foreach ($name in @("FunHive-Scrapers", "FunHive-Monitor")) {
    $t = Get-ScheduledTask -TaskName $name -ErrorAction Stop
    if ($t.Principal.LogonType -ne $expected.LogonType)                        { $bad += "$name LogonType=$($t.Principal.LogonType) (want $($expected.LogonType))" }
    if ($t.Settings.StopIfGoingOnBatteries -ne $expected.StopIfGoingOnBatteries)         { $bad += "$name StopIfGoingOnBatteries=$($t.Settings.StopIfGoingOnBatteries) (want $($expected.StopIfGoingOnBatteries))" }
    if ($t.Settings.DisallowStartIfOnBatteries -ne $expected.DisallowStartIfOnBatteries) { $bad += "$name DisallowStartIfOnBatteries=$($t.Settings.DisallowStartIfOnBatteries) (want $($expected.DisallowStartIfOnBatteries))" }
}
if ($bad) {
    Write-Host ""
    Write-Host "VERIFICATION FAILED - tasks registered but not with the intended settings:" -ForegroundColor Red
    $bad | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    throw "Scheduled task settings did not take. See above."
}
Write-Host "Verified: both tasks are S4U with battery-kill disabled."

Write-Host ""
Write-Host "Done. To verify: Get-ScheduledTask | Where-Object { `$_.TaskName -like 'FunHive*' }"
Write-Host "Logs will be written to: $logDir"
Write-Host ""
Write-Host "NOTE: Task Scheduler itself does not capture stdout/stderr - run-scrapers.bat"
Write-Host "handles that by redirecting into logs\scraper-stdout.log, logs\scraper-stderr.log,"
Write-Host "and (as of 2026-07-11) logs\fix-all-recent.log for the chained data-quality pass."
Write-Host "FunHive-Monitor (8:00 AM) may run while a still-in-progress scraper batch is"
Write-Host "running past its usual window - that's fine, it just reports current state."
