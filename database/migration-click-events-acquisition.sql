-- Migration: Acquisition tracking for click_events
-- Run this in the Supabase SQL Editor BEFORE deploying the client changes.
-- Date: 2026-07-17
--
-- Adds referrer + UTM columns so we can answer "how did visitors find the
-- site?" and attribute signups/conversions to a channel. The client logs a
-- `session_start` row per visit carrying these values (see src/lib/track-click.ts).
-- Because inserts are fire-and-forget and errors are swallowed, deploying the
-- client first would silently drop these fields until the columns exist — so
-- run this migration first.

ALTER TABLE click_events ADD COLUMN IF NOT EXISTS referrer     TEXT;
ALTER TABLE click_events ADD COLUMN IF NOT EXISTS utm_source   TEXT;
ALTER TABLE click_events ADD COLUMN IF NOT EXISTS utm_medium   TEXT;
ALTER TABLE click_events ADD COLUMN IF NOT EXISTS utm_campaign TEXT;

-- Helps the acquisition roll-ups in scripts/analytics-dashboard.js.
CREATE INDEX IF NOT EXISTS idx_click_events_utm_source ON click_events (utm_source);

-- Note: new interaction_type values ('session_start', 'signup', 'signin',
-- 'checkout_start', 'subscribe_success') need no schema change — the column is
-- plain TEXT with no CHECK constraint.
