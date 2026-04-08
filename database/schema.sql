-- FunHive PostgreSQL Schema for Supabase
-- Requires PostGIS extension for geospatial queries

-- Enable PostGIS (run once in Supabase SQL editor)
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================================
-- ACTIVITIES (venues/places - equivalent to Firestore 'activities' collection)
-- ============================================================================
CREATE TABLE activities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  subcategory TEXT,
  image_url TEXT,
  url TEXT,
  phone TEXT,
  hours TEXT,
  price_range TEXT,
  is_free BOOLEAN DEFAULT FALSE,
  age_range TEXT,
  min_age INTEGER,
  max_age INTEGER,

  -- Location fields
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  location GEOMETRY(Point, 4326),  -- PostGIS point (lng, lat in WGS84)
  geohash TEXT,

  -- Metadata
  source TEXT,
  scraper_name TEXT,
  scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Review aggregation (updated by triggers)
  review_count INTEGER DEFAULT 0,
  average_rating NUMERIC(3,2) DEFAULT 0,

  -- Subscription/sponsorship
  is_sponsored BOOLEAN DEFAULT FALSE,
  sponsor_expires_at TIMESTAMPTZ
);

-- Spatial index for fast geospatial queries
CREATE INDEX idx_activities_location ON activities USING GIST (location);
CREATE INDEX idx_activities_state ON activities (state);
CREATE INDEX idx_activities_category ON activities (category);
CREATE INDEX idx_activities_sponsored ON activities (is_sponsored) WHERE is_sponsored = TRUE;

-- ============================================================================
-- EVENTS (time-based events - equivalent to Firestore 'events' collection)
-- ============================================================================
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  event_date TEXT,           -- Original date string from scraper
  date TIMESTAMPTZ,          -- Parsed timestamp for sorting/filtering
  end_date TIMESTAMPTZ,      -- Optional end time
  description TEXT,
  url TEXT,
  image_url TEXT,
  venue TEXT,
  category TEXT,

  -- Location fields
  city TEXT,
  state TEXT,
  zip_code TEXT,
  address TEXT,
  location GEOMETRY(Point, 4326),  -- PostGIS point (lng, lat in WGS84)
  geohash TEXT,

  -- Relationships
  activity_id TEXT REFERENCES activities(id) ON DELETE SET NULL,

  -- Metadata
  source_url TEXT,
  scraper_name TEXT,
  platform TEXT,
  scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Review aggregation
  review_count INTEGER DEFAULT 0,
  average_rating NUMERIC(3,2) DEFAULT 0,

  -- Sponsorship
  is_sponsored BOOLEAN DEFAULT FALSE,
  sponsor_expires_at TIMESTAMPTZ
);

CREATE INDEX idx_events_location ON events USING GIST (location);
CREATE INDEX idx_events_date ON events (date);
CREATE INDEX idx_events_state ON events (state);
CREATE INDEX idx_events_category ON events (category);
CREATE INDEX idx_events_activity ON events (activity_id);
CREATE INDEX idx_events_scraper ON events (scraper_name);
CREATE INDEX idx_events_sponsored ON events (is_sponsored) WHERE is_sponsored = TRUE;

-- Composite index for the most common query: upcoming events near a location
CREATE INDEX idx_events_date_location ON events USING GIST (location) WHERE date >= NOW();

-- ============================================================================
-- EVENT SERIES (recurring event groups)
-- ============================================================================
CREATE TABLE event_series (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  activity_id TEXT REFERENCES activities(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  review_count INTEGER DEFAULT 0,
  average_rating NUMERIC(3,2) DEFAULT 0
);

-- ============================================================================
-- REVIEWS
-- ============================================================================
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  activity_id TEXT REFERENCES activities(id) ON DELETE CASCADE,
  event_series_id TEXT REFERENCES event_series(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Aggregation
  helpful_count INTEGER DEFAULT 0
);

CREATE INDEX idx_reviews_event ON reviews (event_id);
CREATE INDEX idx_reviews_activity ON reviews (activity_id);
CREATE INDEX idx_reviews_user ON reviews (user_id);

-- ============================================================================
-- HELPFUL VOTES
-- ============================================================================
CREATE TABLE helpful_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, review_id)
);

-- ============================================================================
-- USER FAVORITES
-- ============================================================================
CREATE TABLE user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  activity_id TEXT REFERENCES activities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_id),
  UNIQUE(user_id, activity_id)
);

CREATE INDEX idx_favorites_user ON user_favorites (user_id);

-- ============================================================================
-- USER SETTINGS
-- ============================================================================
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  home_location GEOMETRY(Point, 4326),
  home_city TEXT,
  home_state TEXT,
  home_zip TEXT,
  search_radius_miles INTEGER DEFAULT 25,
  preferred_categories TEXT[],
  preferred_age_range TEXT,
  email_digest BOOLEAN DEFAULT FALSE,
  is_premium BOOLEAN DEFAULT FALSE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  premium_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SCRAPER LOGS
-- ============================================================================
CREATE TABLE scraper_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scraper_name TEXT NOT NULL,
  status TEXT NOT NULL,  -- 'success', 'error', 'partial'
  events_found INTEGER DEFAULT 0,
  events_saved INTEGER DEFAULT 0,
  events_skipped INTEGER DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER,
  run_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scraper_logs_name ON scraper_logs (scraper_name, run_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Events & activities: public read, no public write
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are publicly readable"
  ON events FOR SELECT USING (true);

CREATE POLICY "Activities are publicly readable"
  ON activities FOR SELECT USING (true);

CREATE POLICY "Event series are publicly readable"
  ON event_series FOR SELECT USING (true);

-- Reviews: public read, authenticated write (own reviews only)
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are publicly readable"
  ON reviews FOR SELECT USING (true);

CREATE POLICY "Users can create their own reviews"
  ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
  ON reviews FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
  ON reviews FOR DELETE USING (auth.uid() = user_id);

-- Helpful votes
ALTER TABLE helpful_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Helpful votes are publicly readable"
  ON helpful_votes FOR SELECT USING (true);

CREATE POLICY "Users can create their own votes"
  ON helpful_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes"
  ON helpful_votes FOR DELETE USING (auth.uid() = user_id);

-- User favorites: only own data
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own favorites"
  ON user_favorites FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own favorites"
  ON user_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
  ON user_favorites FOR DELETE USING (auth.uid() = user_id);

-- User settings: only own data
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own settings"
  ON user_settings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can modify their own settings"
  ON user_settings FOR UPDATE USING (auth.uid() = user_id);

-- Scraper logs: no public access (service role only)
ALTER TABLE scraper_logs ENABLE ROW LEVEL SECURITY;
-- No SELECT policy = no public access. Service role key bypasses RLS.

-- ============================================================================
-- FUNCTIONS: Geospatial queries
-- ============================================================================

-- Find events within radius (miles) of a point
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
    radius_miles * 1609.34  -- Convert miles to meters
  )
  AND event_date IS NOT NULL
  ORDER BY ST_Distance(
    location,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
  ) ASC
  LIMIT max_results;
$$;

-- Find activities within radius (miles) of a point
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
  ORDER BY ST_Distance(
    location,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
  ) ASC
  LIMIT max_results;
$$;

-- ============================================================================
-- TRIGGERS: Review aggregation (replaces Firebase Cloud Functions)
-- ============================================================================

-- Function to update review aggregates on the parent record
CREATE OR REPLACE FUNCTION update_review_aggregates()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_event_id TEXT;
  target_activity_id TEXT;
  target_series_id TEXT;
  new_count INTEGER;
  new_avg NUMERIC(3,2);
BEGIN
  -- Determine which IDs to update based on INSERT/DELETE
  IF TG_OP = 'DELETE' THEN
    target_event_id := OLD.event_id;
    target_activity_id := OLD.activity_id;
    target_series_id := OLD.event_series_id;
  ELSE
    target_event_id := NEW.event_id;
    target_activity_id := NEW.activity_id;
    target_series_id := NEW.event_series_id;
  END IF;

  -- Update event review stats
  IF target_event_id IS NOT NULL THEN
    SELECT COUNT(*), COALESCE(AVG(rating), 0)
    INTO new_count, new_avg
    FROM reviews WHERE event_id = target_event_id;

    UPDATE events
    SET review_count = new_count, average_rating = new_avg, updated_at = NOW()
    WHERE id = target_event_id;
  END IF;

  -- Update activity review stats
  IF target_activity_id IS NOT NULL THEN
    SELECT COUNT(*), COALESCE(AVG(rating), 0)
    INTO new_count, new_avg
    FROM reviews WHERE activity_id = target_activity_id;

    UPDATE activities
    SET review_count = new_count, average_rating = new_avg, updated_at = NOW()
    WHERE id = target_activity_id;
  END IF;

  -- Update event series review stats
  IF target_series_id IS NOT NULL THEN
    SELECT COUNT(*), COALESCE(AVG(rating), 0)
    INTO new_count, new_avg
    FROM reviews WHERE event_series_id = target_series_id;

    UPDATE event_series
    SET review_count = new_count, average_rating = new_avg, updated_at = NOW()
    WHERE id = target_series_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER review_aggregate_insert
  AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_review_aggregates();

CREATE TRIGGER review_aggregate_update
  AFTER UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_review_aggregates();

CREATE TRIGGER review_aggregate_delete
  AFTER DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_review_aggregates();

-- Function to update helpful vote count
CREATE OR REPLACE FUNCTION update_helpful_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_review_id UUID;
  new_count INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_review_id := OLD.review_id;
  ELSE
    target_review_id := NEW.review_id;
  END IF;

  SELECT COUNT(*) INTO new_count
  FROM helpful_votes WHERE review_id = target_review_id;

  UPDATE reviews SET helpful_count = new_count WHERE id = target_review_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER helpful_vote_insert
  AFTER INSERT ON helpful_votes
  FOR EACH ROW EXECUTE FUNCTION update_helpful_count();

CREATE TRIGGER helpful_vote_delete
  AFTER DELETE ON helpful_votes
  FOR EACH ROW EXECUTE FUNCTION update_helpful_count();

-- ============================================================================
-- AUTO-UPDATE updated_at TIMESTAMPS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
