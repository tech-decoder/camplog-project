-- Style preferences: profile-level (campaign_id IS NULL) or per-campaign override
CREATE TABLE style_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  styles JSONB NOT NULL DEFAULT '[]',
  default_language TEXT DEFAULT 'English',
  default_format_split JSONB DEFAULT '{"square":6,"portrait":6}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_style_preferences_unique
  ON style_preferences(user_id, COALESCE(campaign_id, '00000000-0000-0000-0000-000000000000'));

CREATE INDEX idx_style_preferences_user ON style_preferences(user_id);

ALTER TABLE style_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own style preferences"
  ON style_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access to style preferences"
  ON style_preferences FOR ALL
  USING (auth.role() = 'service_role');
