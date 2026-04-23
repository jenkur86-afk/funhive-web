# FunHive Website Fix Prompt

Paste this at the start of a Cowork session when you need help fixing website issues or making updates.

---

## Prompt

I need help fixing an issue on my FunHive website (funhive-web.vercel.app). FunHive is a family event discovery platform built with Next.js 15 (App Router), TypeScript, Tailwind CSS, and Supabase (PostgreSQL + PostGIS). It auto-deploys from the `main` branch on Vercel.

The project has a CLAUDE.md with full architecture docs — read it first before making any changes.

**Key files to know:**
- `src/app/page.tsx` — Homepage
- `src/app/events/page.tsx` — Events listing (search, filters, date, location, map)
- `src/app/activities/page.tsx` — Venues listing
- `src/app/events/[id]/page.tsx` — Event detail page
- `src/app/activities/[id]/page.tsx` — Venue detail page
- `src/components/HomeEvents.tsx` — Location-aware homepage sections
- `src/components/Header.tsx` — Sticky nav with bee logo
- `src/components/ReportButton.tsx` — Flag icon to report events/venues
- `src/components/ReportModal.tsx` — Report form modal
- `src/lib/supabase.ts` — Client-side Supabase client
- `src/lib/supabase-server.ts` — Server-side Supabase client
- `src/lib/region-filter.ts` — `ACTIVE_STATES` controls which states appear on the site
- `src/app/api/reports/route.ts` — Report submission endpoint
- `src/app/api/reports/[id]/[action]/route.ts` — Admin restore/remove endpoint

**Critical rules:**
- Never filter or sort by `event_date` (TEXT) — always use `date` (TIMESTAMPTZ)
- Never parse ISO date strings with `new Date("2026-04-23")` — append `T00:00:00` to avoid UTC timezone off-by-one: `new Date("2026-04-23T00:00:00")`
- Wrap `useSearchParams()` in a `<Suspense>` boundary
- Filter out reported items with `.eq('reported', false)` in queries and `!e.reported` client-side for RPC results
- Brand colors: orange/amber primary (#f97316 → #f59e0b), amber-900 for dark accents, cream backgrounds
- Logo is an inline SVG bee in a hexagon (no external image file)

**How to fix issues:**
1. Read the relevant source files before making changes
2. Make the fix directly — edit the code
3. After editing, verify with TypeScript: `npx tsc --noEmit`
4. Tell me exactly what to run to push the fix (git add, commit, push)
5. The fix will auto-deploy to Vercel once pushed to main

**Here's the issue I need fixed:**

[Describe the issue here — what you see, what you expected, include a URL or screenshot if possible]
