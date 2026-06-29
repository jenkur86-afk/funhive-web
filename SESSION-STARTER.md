# FunHive Session Starter

Open this file, copy everything between the START and END markers, and paste it as your first message in a new Claude session. Fill in what you need help with at the bottom.

---
<!-- ==================== PASTE START ==================== -->

I'm working on FunHive, a family event discovery platform (Next.js 15 + Supabase/PostGIS).

## Environment
- **Working directory:** `C:\dev\funhive-web`
- **GitHub:** `jenkur86-afk/funhive-web` (Vercel auto-deploys from `main`)
- **OS:** Windows 11, migrated from Mac June 2026
- **Dev server:** `npm run dev` → http://localhost:3000
- **Scrapers:** Windows Task Scheduler, 3 AM daily, 3-day group rotation (Group 1/2/3)
- **Scraper logs:** `scrapers/logs/scraper-stdout.log` / `scraper-stderr.log`

## Daily maintenance commands (run from `C:\dev\funhive-web`)
```
node scripts/data-quality-quick.js           # quick audit (~5 MB egress)
.\scripts\fix-all.ps1 --recent-only          # fix last 72h (~50-150 MB egress)
npm run scraper -- --group N                 # run scraper group N manually
npm run scraper:monitor                      # check scraper results
```

## Key reference files
- `CLAUDE.md` — full project rules, schema, architecture (Claude reads automatically)
- `SCRAPER-DIAGNOSIS-PROMPT.md` — paste into Claude after running scrapers
- `DATA-QUALITY-DIAGNOSIS-PROMPT.md` — paste into Claude after running data-quality-check.js
- `SCRIPT-WRITING-PROMPT.md` — paste into Claude when asking it to write a fix/audit script

## Tech stack summary
- **Frontend:** Next.js 15 App Router, TypeScript, Tailwind CSS
- **DB:** Supabase (PostgreSQL + PostGIS). Free plan — 5.5 GB/month egress limit.
- **Scrapers:** 185+ Node.js scrapers in `scrapers/`, 43 MacaroniKid state files (`scraper-macaroni-{2-letter-code}.js`)
- **Auth:** Supabase Auth (email + Google/Apple OAuth)
- **Key DB tables:** `events` (has `age_range`, NOT `min_age`/`max_age`/`is_free`), `activities` (venues), `event_reports`
- **Key RPCs:** `nearby_events(lng, lat, radius_miles, max_results)`, `nearby_activities(...)`

## What I need help with today

(describe your question or task here)

<!-- ==================== PASTE END ==================== -->
