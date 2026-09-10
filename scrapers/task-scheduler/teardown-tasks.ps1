# Stop the FunHive automation. Counterpart to setup-tasks.ps1.
#
# Run ONCE from an ELEVATED (admin) PowerShell:
#   .\scrapers\task-scheduler\teardown-tasks.ps1
#
# DEFAULT IS DISABLE, NOT DELETE, and that is deliberate: the project is being
# closed with the intention that it may start again, and a disabled task keeps
# its trigger, its wrapper path, its 36h/30h execution limits and its
# IgnoreNew/StartWhenAvailable settings exactly as tuned. Those settings are not
# incidental - they are the outcome of the rotation-starvation work recorded in
# ROTATION-STARVATION-LOG.md, and re-deriving them from scratch would repeat
# months of measurement. Re-enabling is one command; re-tuning is not.
#
#   .\teardown-tasks.ps1            # disable (reversible, recommended)
#   .\teardown-tasks.ps1 -Remove    # unregister completely
#   .\teardown-tasks.ps1 -Restore   # re-enable everything
#
# WHY THIS VERIFIES EVERYTHING BY READ-BACK: setup-tasks.ps1's own header
# records that Register-ScheduledTask is a CIM cmdlet whose failures ignore
# $ErrorActionPreference AND slip past a surrounding try/catch, so on 2026-07-12
# the setup script printed "Registered: ..." for two tasks it had entirely
# failed to create. Disable-ScheduledTask is the same class of cmdlet. So this
# script never reports what it *asked* for - it re-reads the task state
# afterwards and reports what is actually true.

[CmdletBinding()]
param(
    [switch]$Remove,
    [switch]$Restore
)

$ErrorActionPreference = 'Stop'

$TASKS = @('FunHive-Scrapers', 'FunHive-Macaroni', 'FunHive-DataQuality', 'FunHive-Monitor')

# Same fail-fast as setup-tasks.ps1. Without it, each call throws a bare
# "Access is denied" that reads like a script bug rather than a missing prompt.
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$isAdmin = (New-Object Security.Principal.WindowsPrincipal($identity)).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "This script must run from an ELEVATED PowerShell." -ForegroundColor Red
    Write-Host "Right-click PowerShell -> 'Run as administrator', then re-run:" -ForegroundColor Red
    Write-Host "  cd $PSScriptRoot; .\teardown-tasks.ps1" -ForegroundColor Red
    Write-Host "(An admin account is not enough - the window itself has to be elevated;" -ForegroundColor Red
    Write-Host " its title bar will read 'Administrator: Windows PowerShell'.)" -ForegroundColor Red
    exit 1
}

if ($Remove -and $Restore) {
    Write-Host "-Remove and -Restore are mutually exclusive." -ForegroundColor Red
    exit 1
}

function Get-TaskOrNull($name) {
    try { return Get-ScheduledTask -TaskName $name -ErrorAction Stop }
    catch { return $null }
}

# ---------------------------------------------------------------- RESTORE ----
if ($Restore) {
    Write-Host "`nRE-ENABLING FunHive tasks`n" -ForegroundColor Cyan
    foreach ($name in $TASKS) {
        $t = Get-TaskOrNull $name
        if (-not $t) {
            Write-Host ("  {0,-22} NOT REGISTERED - run setup-tasks.ps1 instead" -f $name) -ForegroundColor Yellow
            continue
        }
        try { Enable-ScheduledTask -TaskName $name -ErrorAction Stop | Out-Null } catch { }
        $after = Get-TaskOrNull $name
        $ok = $after -and $after.State -ne 'Disabled'
        Write-Host ("  {0,-22} {1}" -f $name, $after.State) -ForegroundColor ($(if ($ok) { 'Green' } else { 'Red' }))
    }
    Write-Host "`nCheck the next fire times with:  Get-ScheduledTaskInfo -TaskName FunHive-Scrapers`n"
    exit 0
}

# --------------------------------------------------------------- TEARDOWN ----
$verb = if ($Remove) { 'UNREGISTERING' } else { 'DISABLING' }
Write-Host "`n$verb FunHive scheduled tasks`n" -ForegroundColor Cyan

# STOP RUNNING INSTANCES FIRST, but only after disabling below would be wrong:
# a task stopped while still enabled can be re-triggered moments later. So the
# order is disable -> stop. Both scraper tasks are routinely mid-run when this
# is called (a rotation takes ~8h and a MacaroniKid group up to ~16h).
#
# Stopping mid-run is SAFE and is not a special case: events already written
# stay written, `_stableEventId` makes any re-scrape upsert in place, and
# completion is recorded from the results file rather than from an exit code,
# so a killed group correctly reads as "not completed" rather than as success.
# The one visible artefact is a stale scrapers/logs/runner.lock, which the next
# full-group run detects and breaks by design - see run-lock.js.

$results = @()

foreach ($name in $TASKS) {
    $t = Get-TaskOrNull $name
    if (-not $t) {
        $results += [pscustomobject]@{ Task = $name; State = 'not registered'; Ok = $true }
        continue
    }

    if ($Remove) {
        try { Unregister-ScheduledTask -TaskName $name -Confirm:$false -ErrorAction Stop } catch { }
    } else {
        try { Disable-ScheduledTask -TaskName $name -ErrorAction Stop | Out-Null } catch { }
    }

    # Now stop any in-flight instance.
    $mid = Get-TaskOrNull $name
    if ($mid -and $mid.State -eq 'Running') {
        try { Stop-ScheduledTask -TaskName $name -ErrorAction Stop } catch { }
    }

    # READ BACK. Never trust the call above to have worked.
    $after = Get-TaskOrNull $name
    if ($Remove) {
        $ok = ($null -eq $after)
        $state = if ($ok) { 'unregistered' } else { "STILL PRESENT ($($after.State))" }
    } else {
        $ok = ($after -and $after.State -eq 'Disabled')
        $state = if ($after) { $after.State } else { 'vanished' }
    }
    $results += [pscustomobject]@{ Task = $name; State = $state; Ok = $ok }
}

Write-Host ""
foreach ($r in $results) {
    $colour = if ($r.Ok) { 'Green' } else { 'Red' }
    $mark = if ($r.Ok) { 'ok  ' } else { 'FAIL' }
    Write-Host ("  [{0}] {1,-22} {2}" -f $mark, $r.Task, $r.State) -ForegroundColor $colour
}

$failed = @($results | Where-Object { -not $_.Ok })
Write-Host ""
if ($failed.Count -gt 0) {
    Write-Host "$($failed.Count) task(s) did NOT reach the expected state. Do not assume the" -ForegroundColor Red
    Write-Host "automation is stopped - re-run and check, or inspect in taskschd.msc." -ForegroundColor Red
    exit 1
}

Write-Host "All FunHive scheduled tasks are $(if ($Remove) { 'unregistered' } else { 'disabled' })." -ForegroundColor Green
Write-Host ""
Write-Host "Still to do by hand (this script deliberately does not touch them):" -ForegroundColor Yellow
Write-Host "  - The Claude Code task 'funhive-scraper-diagnosis' is scheduled separately"
Write-Host "    inside the Claude app, not in Task Scheduler."
Write-Host "  - The Vercel deployment keeps serving the site; nothing here changes it."
Write-Host ""
Write-Host "To bring the automation back:" -ForegroundColor Cyan
if ($Remove) {
    Write-Host "  .\setup-tasks.ps1        (re-registers from scratch)"
} else {
    Write-Host "  .\teardown-tasks.ps1 -Restore"
}
Write-Host "  Then read PROJECT-CONTINUITY.md before running anything - a cold start has"
Write-Host "  ordering constraints that are not obvious."
Write-Host ""
