-- Migration: Event/Venue Reporting System
-- Run this in Supabase SQL Editor
-- Date: 2026-04-22

-- 1. Create event_reports table
CREATE TABLE IF NOT EXISTS event_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  activity_id TEXT REFERENCES activities(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  comment TEXT,
  reporter_ip TEXT,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | resolved | dismissed
  resolution TEXT,                         -- 'restored' | 'removed' | null
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (
    (event_id IS NOT NULL AND activity_id IS NULL) OR
    (event_id IS NULL AND activity_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_reports_event ON event_reports (event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reports_activity ON event_reports (activity_id) WHERE activity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reports_status ON event_reports (status);

-- 2. Add reported column to events and activities
ALTER TABLE events ADD COLUMN IF NOT EXISTS reported BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS reported BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_events_reported ON events (reported) WHERE reported = TRUE;
CREATE INDEX IF NOT EXISTS idx_activities_reported ON activities (reported) WHERE reported = TRUE;

-- 3. RLS policies for event_reports
ALTER TABLE event_reports ENABLE ROW LEVEL SECURITY;

-- Anyone can insert reports (anonymous reporting)
CREATE POLICY "Anyone can create reports"
  ON event_reports FOR INSERT WITH CHECK (true);

-- Only service role can read/update/delete (admin actions via API)
-- No SELECT/UPDATE/DELETE policies = no public access

-- 4. Update nearby_events to exclude reported items
CREATE OR REPLACE FUNCTION nearby_events(
  lng DOUBLE PRECISION,
  lat DOUBLE PRECISION,
  radius_miles INTEGER DEFAULT 25,
  max_results INTEGER DEFAULT 100
)
RETURNS SETOF events
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM events
  WHERE ST_DWithin(
    location,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    radius_miles * 1609.34
  )
  AND event_date IS NOT NULL
  AND NOT reported
  ORDER BY ST_Distance(
    location,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
  ) ASC
  LIMIT max_results;
$$;

-- 5. Update nearby_activities to exclude reported items
CREATE OR REPLACE FUNCTION nearby_activities(
  lng DOUBLE PRECISION,
  lat DOUBLE PRECISION,
  radius_miles INTEGER DEFAULT 25,
  max_results INTEGER DEFAULT 100
)
RETURNS SETOF activities
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM activities
  WHERE ST_DWithin(
    location,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    radius_miles * 1609.34
  )
  AND NOT reported
  ORDER BY ST_Distance(
    location,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
  ) ASC
  LIMIT max_results;
$$;
