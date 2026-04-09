-- Add age_range column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS age_range TEXT;
