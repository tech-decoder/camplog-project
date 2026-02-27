-- Add nickname and onboarding flag to profiles
ALTER TABLE profiles ADD COLUMN nickname TEXT;
ALTER TABLE profiles ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- Create user_sites junction table
CREATE TABLE user_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  site_abbreviation TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_user_sites_user_site ON user_sites(user_id, site_abbreviation);
CREATE INDEX idx_user_sites_user ON user_sites(user_id);

ALTER TABLE user_sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own user_sites" ON user_sites FOR ALL USING (auth.uid() = user_id);

-- Mark existing users with data as already onboarded
UPDATE profiles SET onboarding_completed = true
WHERE id IN (SELECT DISTINCT user_id FROM changes);
