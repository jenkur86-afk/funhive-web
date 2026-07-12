@echo off
cd /d C:\dev\funhive-web\scrapers
echo [%date% %time%] FunHive scrapers starting >> logs\scraper-stdout.log
node local-scraper-runner.js >> logs\scraper-stdout.log 2>> logs\scraper-stderr.log
echo [%date% %time%] FunHive scrapers finished >> logs\scraper-stdout.log

echo [%date% %time%] fix-all --recent-only starting >> logs\fix-all-recent.log
powershell -NoProfile -ExecutionPolicy Bypass -File "..\scripts\fix-all.ps1" --recent-only >> logs\fix-all-recent.log 2>&1
echo [%date% %time%] fix-all --recent-only finished >> logs\fix-all-recent.log
