# FunHive – To-Do

Feature and growth work that isn't captured in code or CLAUDE.md. Newest priorities near the top. Check items off in place (`[ ]` → `[x]`) as you go.

---

## Facebook page

Goal: a Facebook presence that drives click-throughs to myfunhive.com and builds trust in the listings. FunHive is a family event aggregator, so the whole strategy is built around a save-able "This Weekend" roundup and seasonal theme posts.

### Setup
- [ ] Create the Facebook page. Pick a clear category (e.g. "Event Planner" or "Website/Community").
- [ ] Complete the "About" section 100% — service address/area (eastern US), categories, contact info, and link to myfunhive.com. This drives local search visibility on both Facebook and Google.
- [ ] Add correctly sized images:
  - [ ] Profile picture ~170×170px (logo must read as a small circle).
  - [ ] Cover photo ~820×312px so nothing is blurry or cropped.

### Posting strategy
- [ ] Establish a consistent cadence: ~3–5 posts/week. Quality over frequency — a dormant page hurts more than no page. A workable rhythm is "3-2-1": three short videos/Reels, two feed posts, one promotional post.
- [ ] Lean into short-form video. As of mid-2025 every uploaded video is classified as a Reel, and that's the primary distribution channel. Even 15–30s clips (e.g. "5 free things to do with kids in Anne Arundel this weekend") will outperform text.
- [ ] Build the recurring **"This Weekend" roundup** — inherently save-able and share-able, matches the core value prop.
- [ ] Plan **seasonal theme posts** (summer splash pads, fall festivals) that ride predictable search interest.
- [ ] Post original content with FunHive framing — don't copy-paste event blurbs from aggregated sources. Reposted/watermarked content gets suppressed.

### Engagement & growth
- [ ] Seed initial reach by inviting friends and cross-posting to local parent groups — organic reach is near-zero until a small engaged base exists.
- [ ] Optimize for **saves and shares**, not likes — those are the strongest ranking signals.
- [ ] Respond fast to comments and DMs — genuine interaction improves ranking.
- [ ] Ask real questions ("Which of these are you taking the kids to?"). Avoid engagement bait ("Like this if…", "Share to win") — it's actively downranked.

### The link problem
- [ ] Work around link-post throttling: put the myfunhive.com link in the **first comment or bio**, not the post body. Post a native image/video with a soft "link in comments" instead of a pure link post.

**Context to keep in mind:** organic reach starts small and that's normal; the algorithm now recommends content to non-followers (up to ~half of what users see), so Reels can drive discovery without a big following; link posts that send people off-platform are deprioritized.

---

## Analytics & tracking

Goal: actually *see* who visits, who signs up, who subscribes, what they click, and how they found the site. The `click_events` table is write-only (no anon SELECT), so nothing was viewable before. Status as of 2026-07-17:

**Done**
- [x] Local analytics dashboard — `node scripts/analytics-dashboard.js` (service-role, reads `click_events` + Supabase Auth + `user_settings`). Flags: `--days=N` (default 30), `--top=N`. Reports traffic, engagement by type, accounts/signups/premium, top events + venues, outbound clicks, top searches, daily trend, and acquisition (once the columns below exist).
- [x] Vercel Web Analytics is already installed and live (`<Analytics />` in `src/app/layout.tsx`) — gives referrers, top pages, devices, countries in the Vercel dashboard.

**Tier 1 — acquisition + funnel (built 2026-07-17, pending deploy)**

Code is written and the production build passes. Two manual steps remain to make it live:
- [ ] **Apply the migration** `database/migration-click-events-acquisition.sql` in the Supabase SQL Editor. Do this FIRST — it adds `referrer`/`utm_*` columns. (Client inserts of those fields will silently drop until it runs; fire-and-forget swallows the error, so nothing breaks, but data is lost.)
- [ ] **Deploy** the `src/**` changes to Vercel (auto-deploys on push to `main`). These are frontend files, so they're left for your review per the CLAUDE.md auto-commit policy.

Already done in code:
- [x] Added `referrer`/`utm_source`/`utm_medium`/`utm_campaign` columns (migration file) + updated `database.types.ts`.
- [x] `session_start` capture per browser session with referrer + UTM parsing (`track-click.ts` → `trackSessionStart`, wired via `src/components/AcquisitionTracker.tsx` in the layout). Persists first-touch attribution in localStorage.
- [x] Funnel events: `signup` (AuthContext, attributed to first-touch), `signin` (AuthContext), `checkout_start` (pricing buttons), `subscribe_success` (profile page on Stripe `?success=true` redirect, first-touch attributed).
- [x] Extended the `InteractionType` union + `InteractionPayload` in `track-click.ts`.

> Note: `subscribe_success` fires client-side on the success redirect (keeps `session_id` for attribution) rather than in the Stripe webhook — the webhook is server-side and `click_events` has no `user_id` column to link on. Revisit if you want a server-of-record conversion count too.

**Tier 2 — when SQL/scripts aren't enough**
- [ ] Add Vercel Speed Insights (`@vercel/speed-insights/next`) — real-user Core Web Vitals (LCP, CLS, INP). One-line add to layout.
- [ ] Set up Google Search Console — the definitive "how do people find me via search" + ranking queries. Pairs with the existing sitemap/robots.
- [ ] Evaluate PostHog free tier (1M events/mo) if you want funnels/retention/session replay without hand-rolled SQL.

**Housekeeping**
- [ ] Bot filtering: the 2026-07-07/08 traffic spike (~1,280 sessions, ~1 interaction each, almost all `view_event`) looks like crawler traffic, not humans. Consider filtering obvious bots out of the dashboard's "visitors" figure.

---

## Stripe payments — configuration

The Stripe integration is **fully coded** — checkout route, webhook handler, and pricing page are all wired. It fails only because the account and env vars don't exist yet. This is configuration work, not coding.

- [ ] Create a Stripe account.
- [ ] Create two recurring products/prices matching the pricing page: monthly ($2.99) and annual ($24.99).
- [ ] Set the 6 env vars locally in `.env.local` (see `.env.local.example`):
  - [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - [ ] `STRIPE_SECRET_KEY`
  - [ ] `STRIPE_WEBHOOK_SECRET`
  - [ ] `STRIPE_PRICE_MONTHLY`
  - [ ] `STRIPE_PRICE_ANNUAL`
- [ ] Set the same env vars in Vercel production (`vercel env add ...`).
- [ ] Register the webhook endpoint in Stripe → `https://<domain>/api/webhooks/stripe`, events `checkout.session.completed` and `customer.subscription.deleted`. Paste its signing secret into `STRIPE_WEBHOOK_SECRET`.
- [ ] Test end-to-end with a Stripe test card; confirm `user_settings.is_premium` flips to true.
- [ ] Switch from test keys to live keys once verified.

Files: `src/app/pricing/page.tsx`, `src/app/api/checkout/route.ts`, `src/app/api/webhooks/stripe/route.ts`.

---

## Scraper region activation (deferred)

The phased plan for turning on the central and western scraper regions lives in `archive/SCRAPER-FIX-PLAN.md`. DMV and eastern are already active. Phases 5 (central) and 6 (western) were never started — each begins with a decision on whether to activate, given the Supabase free-plan egress limit.

- [ ] Decide whether/when to activate the **central** region.
- [ ] Decide whether/when to activate the **western** region.
