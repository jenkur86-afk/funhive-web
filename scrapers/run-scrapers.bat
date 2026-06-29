@echo off
cd /d C:\dev\funhive-web\scrapers
echo [%date% %time%] FunHive scrapers starting >> logs\scraper-stdout.log
node local-scraper-runner.js >> logs\scraper-stdout.log 2>> logs\scraper-stderr.log
echo [%date% %time%] FunHive scrapers finished >> logs\scraper-stdout.log
