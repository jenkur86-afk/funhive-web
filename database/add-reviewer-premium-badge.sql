-- Adds a denormalized "was this reviewer premium at write time" flag to reviews,
-- so ReviewsList (client-side, anon key) can show a verified badge without
-- needing to read other users' user_settings rows (blocked by RLS: user_settings
-- SELECT policy only allows auth.uid() = user_id).
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewer_is_premium BOOLEAN DEFAULT FALSE;
