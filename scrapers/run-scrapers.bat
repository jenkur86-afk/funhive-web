@echo off
REM Nightly scraper rotation, run by the FunHive-Scrapers scheduled task.
REM
REM Task Scheduler does not capture stdout/stderr on its own, which is why this
REM batch exists rather than pointing the task straight at node.
REM
REM 2026-08-22: the fix-all --recent-only chain that used to run here was moved
REM out into its own task (FunHive-DataQuality -> run-fix-all.bat). It could not
REM survive here: rotations now take 23-31 hours against this task's 12-hour
REM ExecutionTimeLimit, so Task Scheduler terminated this batch every night
REM before it ever reached that line, while the detached node child below kept
REM running to completion. The result was a rotation that looked perfectly
REM healthy with no data-quality pass behind it for days at a time. Do NOT
REM re-chain it here - the whole point is that data quality must not depend on
REM how long the rotation takes.

cd /d C:\dev\funhive-web\scrapers
echo [%date% %time%] FunHive scrapers starting >> logs\scraper-stdout.log
node local-scraper-runner.js >> logs\scraper-stdout.log 2>> logs\scraper-stderr.log
echo [%date% %time%] FunHive scrapers finished >> logs\scraper-stdout.log
