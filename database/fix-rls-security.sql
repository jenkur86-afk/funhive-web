-- ============================================================================
-- FUNHIVE — Fix "Row-Level Security not enabled" Supabase security alert
-- ============================================================================
-- Paste this entire file into: Supabase Dashboard → SQL Editor → New Query → Run
-- It is SAFE to run multiple times (idempotent).
--
-- What it does, in order:
--   1. STEP 1 — shows which tables in `public` currently have RLS DISABLED
--      (run STEP 1 by itself first if you want to see the list before fixing)
--   2. STEP 2 — enables RLS on every public-schema table that's missing it
--   3. STEP 3 — re-applies FunHive's known-good RLS policies (idempotent)
--   4. STEP 4 — verifies all public tables now have RLS enabled
--
-- Service role keys (used by scrapers + server code) BYPASS RLS automatically,
-- so this will NOT break scraping or server-side queries. It only affects
-- client-side (anon / authenticated) access — which is exactly what we want.
-- ============================================================================


-- ============================================================================
-- STEP 1 — Diagnostic: list public-schema tables with RLS disabled
-- ============================================================================
-- Skips PostGIS system tables (spatial_ref_sys) and anything not owned by you —
-- those belong to extensions and are managed by Supabase, not by us.
SELECT
  schemaname,
  tablename,
  tableowner,
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED ❌' END AS rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns', 'raster_columns', 'raster_overviews')
ORDER BY rowsecurity ASC, tablename;


-- ============================================================================
-- STEP 2 — Enable RLS on every public table that doesn't have it
-- ============================================================================
-- Skips:
--   • PostGIS extension tables (spatial_ref_sys etc.) — owned by supabase_admin
--   • Any table not owned by current_user (can't ALTER what you don't own)
-- Each ALTER is wrapped in its own exception block so one failure doesn't halt
-- the whole script.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename, tableowner
    FROM pg_tables
    WHERE schemaname = 'public'
      AND rowsecurity = false
      AND tablename NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns', 'raster_columns', 'raster_overviews')
      AND tableowner = current_user
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
      RAISE NOTICE 'Enabled RLS on public.% (owner=%)', r.tablename, r.tableowner;
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'Skipped public.% — not owner (%)', r.tablename, r.tableowner;
    END;
  END LOOP;
END $$;


-- ============================================================================
-- STEP 3 — Re-apply FunHive's canonical RLS policies (safe to re-run)
-- ============================================================================
-- Each CREATE POLICY uses `IF NOT EXISTS`-equivalent idioms via DROP-then-CREATE
-- so it can be re-run safely.

-- ---- events: public read, no public write ----
DROP POLICY IF EXISTS "Events are publicly readable" ON events;
CREATE POLICY "Events are publicly readable"
  ON events FOR SELECT USING (true);

-- ---- activities: public read, no public write ----
DROP POLICY IF EXISTS "Activities are publicly readable" ON activities;
CREATE POLICY "Activities are publicly readable"
  ON activities FOR SELECT USING (true);

-- ---- event_series: public read ----
DROP POLICY IF EXISTS "Event series are publicly readable" ON event_series;
CREATE POLICY "Event series are publicly readable"
  ON event_series FOR SELECT USING (true);

-- ---- reviews: public read, authed users can manage their own ----
DROP POLICY IF EXISTS "Reviews are publicly readable" ON reviews;
CREATE POLICY "Reviews are publicly readable"
  ON reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create their own reviews" ON reviews;
CREATE POLICY "Users can create their own reviews"
  ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own reviews" ON reviews;
CREATE POLICY "Users can update their own reviews"
  ON reviews FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own reviews" ON reviews;
CREATE POLICY "Users can delete their own reviews"
  ON reviews FOR DELETE USING (auth.uid() = user_id);

-- ---- helpful_votes: public read, authed users can manage their own ----
DROP POLICY IF EXISTS "Helpful votes are publicly readable" ON helpful_votes;
CREATE POLICY "Helpful votes are publicly readable"
  ON helpful_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create their own votes" ON helpful_votes;
CREATE POLICY "Users can create their own votes"
  ON helpful_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own votes" ON helpful_votes;
CREATE POLICY "Users can delete their own votes"
  ON helpful_votes FOR DELETE USING (auth.uid() = user_id);

-- ---- user_favorites: strict per-user access ----
DROP POLICY IF EXISTS "Users can read their own favorites" ON user_favorites;
CREATE POLICY "Users can read their own favorites"
  ON user_favorites FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own favorites" ON user_favorites;
CREATE POLICY "Users can create their own favorites"
  ON user_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own favorites" ON user_favorites;
CREATE POLICY "Users can delete their own favorites"
  ON user_favorites FOR DELETE USING (auth.uid() = user_id);

-- ---- user_settings: strict per-user access ----
DROP POLICY IF EXISTS "Users can read their own settings" ON user_settings;
CREATE POLICY "Users can read their own settings"
  ON user_settings FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;
CREATE POLICY "Users can update their own settings"
  ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can modify their own settings" ON user_settings;
CREATE POLICY "Users can modify their own settings"
  ON user_settings FOR UPDATE USING (auth.uid() = user_id);

-- ---- scraper_logs: no public policy = no public access (service role bypass RLS) ----
-- RLS is ON but no policy = nobody except service_role can SELECT.
-- This is intentional — scraper logs shouldn't be readable by anons.


-- ============================================================================
-- STEP 4 — Verify: list public tables with rls_status + policy count
-- ============================================================================
SELECT
  t.tablename,
  t.tableowner,
  CASE WHEN t.rowsecurity THEN 'ENABLED ✓' ELSE 'DISABLED ❌' END AS rls_status,
  COALESCE(p.policy_count, 0) AS policy_count
FROM pg_tables t
LEFT JOIN (
  SELECT tablename, COUNT(*) AS policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  GROUP BY tablename
) p ON p.tablename = t.tablename
WHERE t.schemaname = 'public'
  AND t.tablename NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns', 'raster_columns', 'raster_overviews')
ORDER BY t.rowsecurity ASC, t.tablename;

-- Any row showing 'DISABLED ❌' means RLS is still off — inspect that table.
-- Any table with rls_status='ENABLED ✓' and policy_count=0 is locked down
-- to service_role only (that's fine for scraper_logs, but review others).
