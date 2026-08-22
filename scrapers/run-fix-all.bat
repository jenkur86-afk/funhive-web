@echo off
REM Nightly data-quality pass, run by the FunHive-DataQuality scheduled task.
REM
REM This used to be chained at the end of run-scrapers.bat. That failed silently
REM from 2026-08-12 onward: rotations grew to 23-31 hours, FunHive-Scrapers is
REM registered with a 12-hour ExecutionTimeLimit, so Task Scheduler terminated
REM the batch long before it reached the fix-all line. The detached node child
REM survived and finished the scrape, which is why the scraper tables looked
REM healthy while the data-quality pass had not run for days. Confirmed
REM 2026-08-22 from Task Scheduler itself: FunHive-Scrapers LastTaskResult was
REM 267014 (SCHED_S_TASK_TERMINATED) while node.exe was still scraping, and
REM scraper-stdout.log held 7 "FunHive scrapers starting" markers since
REM 2026-08-12 with ZERO matching "finished" markers.
REM
REM Owning this in its OWN task is the fix: data quality no longer depends on
REM how long a rotation takes, or on whether the batch survived to its last line.
REM
REM Running concurrently with a live rotation is expected and safe. fix-all does
REM database work plus Nominatim geocoding and launches no Chrome, so it does not
REM contend with the scrapers' browsers - the concurrency hazard recorded in
REM reports/fix-notes.json is specifically about concurrent heavy Chrome
REM workloads. Verified empirically 2026-08-22: a full catch-up pass ran to
REM completion (exit 0) while the MacaroniKid Group 1 rotation was mid-scrape.
REM
REM Task Scheduler does not capture stdout/stderr, so redirect here - same
REM logs\fix-all-recent.log the chained version wrote to, keeping every existing
REM staleness check and the diagnosis routine working unchanged.

cd /d C:\dev\funhive-web\scrapers

echo [%date% %time%] fix-all --recent-only starting >> logs\fix-all-recent.log
powershell -NoProfile -ExecutionPolicy Bypass -File "..\scripts\fix-all.ps1" --recent-only >> logs\fix-all-recent.log 2>&1
echo [%date% %time%] fix-all --recent-only finished >> logs\fix-all-recent.log
