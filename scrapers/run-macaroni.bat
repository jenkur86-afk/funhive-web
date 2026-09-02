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
REM 2026-09-02: this batch used to append to the SAME scraper-stdout.log as
REM run-scrapers.bat, and that DELETED the 2026-09-02 rotation outright.
REM cmd.exe opens a ">>" target at process start and does not share it with a
REM second cmd process, so when FunHive-Scrapers triggered at 03:00 while this
REM task still held logs\scraper-stdout.log open, run-scrapers.bat could not
REM open its redirect: its very first echo failed, node NEVER LAUNCHED, and the
REM task exited 1 (LastTaskResult=1, no scraper-run-2026-09-02.log, no
REM "FunHive scrapers starting" marker). Reproduced deliberately before fixing.
REM
REM run-lock.js cannot prevent this. The lock lives inside node; cmd opens the
REM redirect BEFORE node exists, so the rotation dies before it can ever wait.
REM The two tasks therefore need two separate capture files. Both are parsed by
REM scripts/build-library-site-audit.js, which reads BOTH by default - if you
REM rename either file, update its DEFAULT_LOGS list in the same commit.

cd /d C:\dev\funhive-web\scrapers
echo [%date% %time%] FunHive MacaroniKid daily starting >> logs\macaroni-stdout.log
node macaroni-daily-runner.js >> logs\macaroni-stdout.log 2>> logs\macaroni-stderr.log
echo [%date% %time%] FunHive MacaroniKid daily finished >> logs\macaroni-stdout.log
