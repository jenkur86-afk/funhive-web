-- Create suggestions table for user-submitted events and venues
CREATE TABLE IF NOT EXISTS suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('event', 'venue')),
  name TEXT NOT NULL,
  location TEXT,
  url TEXT,
  notes TEXT,
  submitter_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

-- Index for reviewing pending suggestions
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON suggestions (status, submitted_at DESC);

-- Enable RLS
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (no auth required for submitting suggestions)
CREATE POLICY "Anyone can submit suggestions"
  ON suggestions FOR INSERT
  WITH CHECK (true);

-- Only authenticated service role can read/update (for admin review)
CREATE POLICY "Service role can manage suggestions"
  ON suggestions FOR ALL
  USING (auth.role() = 'service_role');
