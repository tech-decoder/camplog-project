-- Waitlist table for early access signups
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  profession TEXT NOT NULL,
  years_experience TEXT NOT NULL,
  company TEXT,
  referral_source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allow public inserts (no auth required for waitlist)
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert into waitlist"
  ON waitlist FOR INSERT
  WITH CHECK (true);

-- Only service role can read waitlist entries
CREATE POLICY "Service role can read waitlist"
  ON waitlist FOR SELECT
  USING (auth.role() = 'service_role');
