# Register FunHive scrapers as Windows Scheduled Tasks
# Replaces the Mac launchd plists in scrapers/launchd/
#
# Run ONCE from an elevated (admin) PowerShell:
#   .\scrapers\task-scheduler\setup-tasks.ps1
#
# To remove all tasks:
#   Unregister-ScheduledTask -TaskName "FunHive-Scrapers","FunHive-Monitor","FunHive-DataQuality","FunHive-Macaroni" -Confirm:$false
#
# 2026-07-12: a bad -DisallowStartIfOnBatteries/-StopIfGoingOnBatteries
# parameter name (New-ScheduledTaskSettingsSet doesn't have those - the real
# ones are -AllowStartIfOnBatteries/-DontStopIfGoingOnBatteries, both
# switches, not $true/$false-valued) made both Register-ScheduledTask calls
# fail, but the script kept going and printed "Registered: ..." anyway since
# nothing was checking for errors.
#
# $ErrorActionPreference = 'Stop' alone does NOT fix that, despite what this
# comment used to claim. Register-ScheduledTask is a CDXML/CIM cmdlet and its
# errors do not honor the preference variable - verified 2026-07-17 by running
# an unelevated repro: the Register call printed "Access is denied", the script
# sailed straight past it to the next line, and a surrounding try/catch did not
# catch it either. Only an explicit per-call -ErrorAction Stop actually aborts,
# so both Register calls below pass it. The preference is still set for the
# non-CIM cmdlets in this script (Get-Command, New-Item).
$ErrorActionPreference = 'Stop'

# Fail fast and legibly if not elevated. Without this, Register-ScheduledTask
# throws a bare "Access is denied" (HRESULT 0x80070005) per call, which reads
# like a bug in the script rather than a missing admin prompt.
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$isAdmin = (New-Object Security.Principal.WindowsPrincipal($identity)).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "This script must run from an ELEVATED PowerShell." -ForegroundColor Red
    Write-Host "Right-click PowerShell -> 'Run as administrator', then re-run:" -ForegroundColor Red
    Write-Host "  cd $PSScriptRoot; .\setup-tasks.ps1" -ForegroundColor Red
    Write-Host "(An admin account is not enough - the window itself has to be elevated;" -ForegroundColor Red
    Write-Host " its title bar will read 'Administrator: Windows PowerShell'.)" -ForegroundColor Red
    exit 1
}

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
# its own, see the note at the bottom of this file).
#
# 2026-07-11 to 2026-08-22 this batch ALSO chained scripts\fix-all.ps1
# --recent-only after the scraper run. That is now Task 3 (FunHive-DataQuality)
# instead. See the block above Task 3 for why - in short, the chain had stopped
# running entirely and the failure was invisible.
#
# ExecutionTimeLimit is 36h, raised from 12h on 2026-08-22. The 12h value was
# chosen when runs took 5-10 hours; measured rotations are now 23-31h (Group 1
# runs on 2026-08-07/10/13/16 all exceeded 29h), so the limit had stopped
# catching stuck jobs and started terminating healthy ones every single night.
# Confirmed live: FunHive-Scrapers LastTaskResult was 267014
# (SCHED_S_TASK_TERMINATED) at 3:00 PM on 2026-08-22 while its node child was
# still happily scraping. Because Task Scheduler kills the batch but NOT the
# detached node child, the visible symptom was not a failed scrape - it was
# scraper-stdout.log accumulating "FunHive scrapers starting" markers with no
# matching "finished", and everything after the node line silently never
# happening. Same reasoning as the original note: a limit tighter than real
# runtimes catches healthy jobs, not stuck ones.
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
# 2026-07-17 follow-up. The incident above is REAL - re-verified in
# scrapers\logs\scraper-summary.log, which is the authoritative record of what
# the scrapers did (Task Scheduler metadata is not; check the log first):
#   10:00:01Z  scheduled run starts (6:00:01 AM local)
#   11:05:20Z  last scraper completes (Communico-PA) - 65.3 min in
#              ...no completion line. Run died here.
#   11:47:59Z  second run header - the manual --resume
#   16:05:52Z  "40 succeeded, 0 failed, 257.9 min" - that's the RESUME's
#              duration (11:47:59Z -> 16:05:52Z = 258 min), NOT the full day
# 7/12 shows 40 scrapers where neighbouring days show 50-52, and 257.9 min
# where they show ~460. Those two outliers are the fingerprint of the
# interruption. Anyone re-checking this: grep the day's *run headers*, not
# just its completion line - 7/12 has two, and 7/14 has five.
#
# What is NOT the cause: the 7/12 power outage (System log Kernel-Power 41 +
# 6008, recovery boot 7/13 6:54 AM, last event before the gap 7/12 3:26 PM).
# That landed ~8 hours after the run died. Unrelated.
#
# What the cause was: almost certainly the console window being closed from
# the interactive desktop. Not the battery - that inference only ever rested on
# StopIfGoingOnBatteries being *set*, which is no evidence it *fired*, and the
# host is a desktop anyway (no battery device, chassis type 3, no UPS), so that
# pair is inert here and kept only for portability.
#
# The evidence that does line up:
#   - 0xC000013A is STATUS_CONTROL_C_EXIT. A console process gets that from
#     exactly three things: Ctrl+C, its window being closed, or session logoff.
#     Nothing else produces it.
#   - Nothing crashed. Application log is clean 7:00-7:50 on 7/12; the runner
#     logged no error because it was killed with no chance to. It died mid-
#     scraper (started BiblioCommons-MA 11:05:22.927Z, then 42 min of silence),
#     and that same scraper ran fine in 315s on the resume.
#   - The task was LogonType=Interactive, so cmd.exe ran in the user's desktop
#     session with a VISIBLE console window. Confirmed empirically 2026-07-17:
#     the in-flight run's cmd.exe/node.exe were both SessionId 1, the same
#     session as the interactive shell.
#   - The user was at the machine around that time.
#
# So: a console window sat on the desktop and something closed it. This is why
# S4U is the fix, and the reason is NOT "survives logoff" as earlier notes here
# claimed - it's that S4U runs the task in session 0, with no window on the
# desktop to close, Ctrl+C, or lose to a logoff. All three modes go away.
#
# Caveat worth keeping: this was never confirmed against the Security log
# (4634/4647 around 07:05), which needs an elevated read. It's a strong
# convergence of evidence, not a logged fact.
#
# Same follow-up found the tasks had been firing 3 hours late (6:00 AM and
# 11:00 AM instead of 3:00 and 8:00). Task Scheduler bakes a fixed UTC offset
# into each trigger's StartBoundary; these were registered as 03:00:00-07:00
# (Pacific) and kept that instant after the host moved to Eastern. Re-running
# this script rewrites StartBoundary to the current zone, which is what fixed
# it. If the host ever changes timezone again, re-run this script - the tasks
# will NOT follow the clock on their own.
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
    -ExecutionTimeLimit (New-TimeSpan -Hours 36) `
    -Priority 7 `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries
Register-ScheduledTask `
    -TaskName "FunHive-Scrapers" `
    -Action $action1 `
    -Trigger $trigger1 `
    -Settings $settings1 `
    -Principal $principal `
    -Force `
    -ErrorAction Stop | Out-Null
Write-Host "Registered: FunHive-Scrapers (daily 3:00 AM, scrapers only - 36h limit)"

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
    -Force `
    -ErrorAction Stop | Out-Null
Write-Host "Registered: FunHive-Monitor (daily 8:00 AM)"

# ── Task 3: Daily data-quality pass at 1:00 PM ───────────────────────────────
# Added 2026-08-22. This work used to be the second line of run-scrapers.bat.
#
# WHY IT MOVED. Rotations grew to 23-31 hours while FunHive-Scrapers carried a
# 12-hour ExecutionTimeLimit, so Task Scheduler terminated that batch every
# night before it reached the fix-all line. Crucially the kill does NOT take the
# detached node child with it, so the scrape completed normally and the run
# tables looked perfectly healthy - the only trace was scraper-stdout.log
# collecting "FunHive scrapers starting" with no matching "finished". Measured
# 2026-08-22: 7 starts since 2026-08-12, ZERO finishes, and fix-all had last run
# 2026-08-20 03:11 - only 4 times in 11 days, exactly the days a run happened to
# fit inside 12 hours. The backlog that had silently accumulated was 8,206 stale
# or junk rows plus 723 unrepaired fields.
#
# So the requirement is not "a longer timeout" - it is that the data-quality
# pass must not be downstream of the rotation AT ALL. Its own task with its own
# trigger fires whether the rotation is still running, already finished, or was
# never triggered that day.
#
# WHY 1:00 PM. The rotation now occupies most of the clock, so there is no quiet
# window to aim for and overlap is the normal case, not the exception. 1:00 PM
# gives the rotation a 10-hour head start (so the window has real data in it)
# and lands ~70 minutes before the 2:12 PM funhive-scraper-diagnosis task, which
# therefore reads freshly-cleaned data and a freshly-regenerated
# reports/site-report.html rather than yesterday's.
#
# OVERLAP IS SAFE. fix-all does database work plus Nominatim geocoding and
# launches no Chrome, so it does not contend with the scrapers' browsers - the
# hazard recorded in reports/fix-notes.json is specifically concurrent heavy
# CHROME workloads. Verified empirically 2026-08-22: a full catch-up ran to
# completion (exit 0) while the MacaroniKid Group 1 rotation was mid-scrape.
#
# MultipleInstances is left at the default (IgnoreNew) deliberately: if a pass
# ever overruns into the next day's trigger, skip that day rather than stacking
# two concurrent full-table sweeps against the Supabase egress budget.
#
# 4h limit: observed 3-15 min on a normal 24h window, ~35 min clearing a 3-day
# backlog. 4h is generous headroom without being the kind of over-tight limit
# that created this bug in the first place.
$action3  = New-ScheduledTaskAction `
    -Execute "cmd.exe" `
    -Argument "/c `"$scraperDir\run-fix-all.bat`"" `
    -WorkingDirectory $scraperDir
$trigger3 = New-ScheduledTaskTrigger -Daily -At "1:00PM"
$settings3 = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Hours 4) `
    -Priority 7 `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries
Register-ScheduledTask `
    -TaskName "FunHive-DataQuality" `
    -Action $action3 `
    -Trigger $trigger3 `
    -Settings $settings3 `
    -Principal $principal `
    -Force `
    -ErrorAction Stop | Out-Null
Write-Host "Registered: FunHive-DataQuality (daily 1:00 PM, fix-all --recent-only)"

# ── Task 4: Daily MacaroniKid pass at 3:00 PM ────────────────────────────────
# Added 2026-08-31 (ROTATION-STARVATION-LOG.md). This work used to be the TAIL
# of run-scrapers.bat's rotation, and that is exactly why rotations were being
# silently deleted: MacaroniKid Group 1 alone takes ~15h, welding it onto an
# ~11h regular pass made the task ~26h against a 24h trigger, and with
# MultipleInstances=IgnoreNew + StartWhenAvailable=False the next day's trigger
# was discarded with no error anywhere (2026-08-26 and 2026-08-29 had no
# rotation at all; Group 2 ran every 5-6 days instead of every 3).
#
# As its own task, MacaroniKid overrunning can delay the next rotation but can
# never delete it - MultipleInstances is evaluated per task. The two runner
# processes serialize on scrapers/helpers/run-lock.js: whichever starts second
# waits (bounded, loud on timeout) instead of being dropped. The waiter runs
# LATE, never never - the exact inverse of the failure being fixed.
#
# WHY 3:00 PM. The Group 1 regular pass (the longest) ends ~2:25 PM; Groups 2/3
# end late morning. 3:00 PM starts MacaroniKid just after the rotation is
# normally done, so the lock wait is minutes, not hours, on a typical day.
#
# WHY 30h. Longest healthy run is ~15.5h (Group 1) plus a worst-case 8h lock
# wait = ~23.5h. 30h kills genuinely stuck jobs without terminating healthy
# ones - the same reasoning as FunHive-Scrapers' 36h note above. If a run does
# overrun its own next trigger, IgnoreNew drops one MacaroniKid day and the
# starvation catch-up in macaroni-daily-runner.js (macaroni-last-run.json
# ledger) repairs it on the following day.
$action4  = New-ScheduledTaskAction `
    -Execute "cmd.exe" `
    -Argument "/c `"$scraperDir\run-macaroni.bat`"" `
    -WorkingDirectory $scraperDir
$trigger4 = New-ScheduledTaskTrigger -Daily -At "3:00PM"
$settings4 = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Hours 30) `
    -Priority 7 `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries
Register-ScheduledTask `
    -TaskName "FunHive-Macaroni" `
    -Action $action4 `
    -Trigger $trigger4 `
    -Settings $settings4 `
    -Principal $principal `
    -Force `
    -ErrorAction Stop | Out-Null
Write-Host "Registered: FunHive-Macaroni (daily 3:00 PM, MacaroniKid via macaroni-daily-runner.js - 30h limit)"

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

# ExecutionTimeLimit is asserted per task because it is now load-bearing, not
# cosmetic. A limit shorter than the job's real runtime is exactly what silently
# broke the fix-all chain between 2026-08-12 and 2026-08-22: Task Scheduler
# terminated the batch mid-run every night, the detached node child survived to
# finish the scrape, and nothing anywhere reported an error.
#
# Compare as TimeSpans, NEVER as strings. Task Scheduler NORMALISES the ISO 8601
# duration it stores, rolling any whole days out of the hours component: ask for
# 36 hours and it reads back "P1DT12H", not "PT36H". The first version of this
# check compared strings and failed the whole script on 2026-08-22 against a
# task that was in fact registered exactly as intended - a false alarm, and the
# precise inverse of the silent-wrong-state bug this block exists to catch.
# Limits under 24h (PT1H, PT4H) round-trip unchanged, which is why only the
# 36-hour one tripped it. XmlConvert parses every form Task Scheduler emits.
$expectedLimit = @{
    "FunHive-Scrapers"    = New-TimeSpan -Hours 36
    "FunHive-Monitor"     = New-TimeSpan -Hours 1
    "FunHive-DataQuality" = New-TimeSpan -Hours 4
    "FunHive-Macaroni"    = New-TimeSpan -Hours 30
}
$bad = @()
foreach ($name in @("FunHive-Scrapers", "FunHive-Monitor", "FunHive-DataQuality", "FunHive-Macaroni")) {
    $t = Get-ScheduledTask -TaskName $name -ErrorAction Stop
    if ($t.Principal.LogonType -ne $expected.LogonType)                        { $bad += "$name LogonType=$($t.Principal.LogonType) (want $($expected.LogonType))" }
    if ($t.Settings.StopIfGoingOnBatteries -ne $expected.StopIfGoingOnBatteries)         { $bad += "$name StopIfGoingOnBatteries=$($t.Settings.StopIfGoingOnBatteries) (want $($expected.StopIfGoingOnBatteries))" }
    if ($t.Settings.DisallowStartIfOnBatteries -ne $expected.DisallowStartIfOnBatteries) { $bad += "$name DisallowStartIfOnBatteries=$($t.Settings.DisallowStartIfOnBatteries) (want $($expected.DisallowStartIfOnBatteries))" }
    # An empty/absent limit means "run indefinitely" and would throw in ToTimeSpan,
    # so treat it as zero and let the comparison below report it as the mismatch it is.
    $rawLimit = $t.Settings.ExecutionTimeLimit
    $actualLimit = if ([string]::IsNullOrWhiteSpace($rawLimit)) { [TimeSpan]::Zero } else { [System.Xml.XmlConvert]::ToTimeSpan($rawLimit) }
    if ($actualLimit -ne $expectedLimit[$name]) { $bad += "$name ExecutionTimeLimit=$rawLimit ($($actualLimit.TotalHours)h, want $($expectedLimit[$name].TotalHours)h)" }
}
if ($bad) {
    Write-Host ""
    Write-Host "VERIFICATION FAILED - tasks registered but not with the intended settings:" -ForegroundColor Red
    $bad | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    throw "Scheduled task settings did not take. See above."
}
Write-Host "Verified: all four tasks are S4U, battery-kill disabled, time limits as intended."

Write-Host ""
Write-Host "Done. To verify: Get-ScheduledTask | Where-Object { `$_.TaskName -like 'FunHive*' }"
Write-Host "Logs will be written to: $logDir"
Write-Host ""
Write-Host "NOTE: Task Scheduler itself does not capture stdout/stderr - the .bat files do."
Write-Host "run-scrapers.bat and run-macaroni.bat both redirect into logs\scraper-stdout.log"
Write-Host "and logs\scraper-stderr.log (the diagnosis parses per-site lines from there);"
Write-Host "run-fix-all.bat redirects into logs\fix-all-recent.log."
Write-Host "FunHive-Scrapers (3:00 AM) and FunHive-Macaroni (3:00 PM) serialize on"
Write-Host "scrapers\logs\runner.lock - if one is still running when the other starts, the"
Write-Host "second WAITS (up to 8h, logged) rather than being dropped. That wait is the"
Write-Host "designed behavior, not a hang."
Write-Host "FunHive-Monitor (8:00 AM) and FunHive-DataQuality (1:00 PM) both run while the"
Write-Host "rotation is usually still in progress. That is expected: the monitor only reports"
Write-Host "current state, and fix-all does DB + geocoding work with no Chrome, so it does not"
Write-Host "contend with the scrapers' browsers."
Write-Host ""
Write-Host "HEALTH CHECK - if data quality ever looks stale again, check this FIRST:"
Write-Host "  Get-ScheduledTaskInfo -TaskName FunHive-DataQuality | Select LastRunTime,LastTaskResult"
Write-Host "  Get-Content logs\fix-all-recent.log -Tail 5"
Write-Host "LastTaskResult 267014 means SCHED_S_TASK_TERMINATED - the task hit its time limit."
