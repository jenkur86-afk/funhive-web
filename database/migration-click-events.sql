-- Migration: Click/Interaction Analytics
-- Run this in Supabase SQL Editor
-- Date: 2026-07-03

CREATE TABLE IF NOT EXISTS click_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_type TEXT NOT NULL,  -- 'view_event' | 'view_activity' | 'click_directions' |
                                    -- 'click_source_url' | 'click_venue_link' | 'search' |
                                    -- 'filter_change' | 'favorite_add' | 'review_submit'
  event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
  activity_id TEXT REFERENCES activities(id) ON DELETE SET NULL,
  search_query TEXT,
  search_location TEXT,
  category TEXT,
  age_range TEXT,
  date_filter TEXT,
  radius_miles INTEGER,
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_click_events_type ON click_events (interaction_type);
CREATE INDEX IF NOT EXISTS idx_click_events_created_at ON click_events (created_at);
CREATE INDEX IF NOT EXISTS idx_click_events_session ON click_events (session_id);

ALTER TABLE click_events ENABLE ROW LEVEL SECURITY;

-- Anonymous inserts allowed (fire-and-forget client-side tracking)
CREATE POLICY "Anyone can log interactions"
  ON click_events FOR INSERT WITH CHECK (true);

-- No SELECT/UPDATE/DELETE policy = no anon read access.
-- Query this table via the Supabase SQL editor or a service-role script only.
-- Writes don't count against the project's egress budget; reads do — never
-- read this table back into a user-facing page (see CLAUDE.md bandwidth rules).
