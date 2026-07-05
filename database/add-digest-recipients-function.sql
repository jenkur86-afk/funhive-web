-- Powers the weekly Premium email digest (src/app/api/cron/email-digest/route.ts).
-- Extracts lng/lat out of the PostGIS home_location column so the API route
-- doesn't need to parse raw geometry output — mirrors how nearby_events already
-- takes lng/lat as plain doubles. lng/lat are NULL for users who haven't shared
-- a location yet (home_location is populated client-side in HomeEvents.tsx
-- whenever a signed-in user grants browser geolocation); the API route falls
-- back to a non-personalized "top upcoming events" digest for those users.
CREATE OR REPLACE FUNCTION get_digest_recipients()
RETURNS TABLE (
  user_id UUID,
  lng DOUBLE PRECISION,
  lat DOUBLE PRECISION,
  radius_miles INTEGER,
  preferred_categories TEXT[]
) AS $$
  SELECT
    user_id,
    CASE WHEN home_location IS NOT NULL THEN ST_X(home_location) END AS lng,
    CASE WHEN home_location IS NOT NULL THEN ST_Y(home_location) END AS lat,
    search_radius_miles,
    preferred_categories
  FROM user_settings
  WHERE is_premium = TRUE
    AND email_digest = TRUE;
$$ LANGUAGE sql STABLE;
