@echo off
REM Daily MacaroniKid pass, run by the FunHive-Macaroni scheduled task.
REM
REM Split out of run-scrapers.bat on 2026-08-31 (ROTATION-STARVATION-LOG.md):
REM as the tail of the rotation task, MacaroniKid pushed Group 1 runs to ~26h
REM against a 24h trigger, and MultipleInstances=IgnoreNew silently deleted the
REM next day's rotation every time. As its own task it can overrun freely; it
REM serializes against the rotation via scrapers/helpers/run-lock.js (the
REM waiter runs LATE, never never).
REM
REM stdout appends to the SAME scraper-stdout.log the rotation uses, on
REM purpose: the daily diagnosis (Step 3b) parses that file for the per-site
REM "Found N events" lines, MacaroniKid's included. The run lock guarantees the
REM two writers never interleave. Do not point this at a separate file without
REM also teaching scripts/build-library-site-audit.js to read it.

cd /d C:\dev\funhive-web\scrapers
echo [%date% %time%] FunHive MacaroniKid daily starting >> logs\scraper-stdout.log
node macaroni-daily-runner.js >> logs\scraper-stdout.log 2>> logs\scraper-stderr.log
echo [%date% %time%] FunHive MacaroniKid daily finished >> logs\scraper-stdout.log
