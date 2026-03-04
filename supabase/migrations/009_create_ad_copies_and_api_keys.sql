-- API Keys for external tool authentication
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default',
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_keys_hash ON api_keys (key_hash) WHERE revoked_at IS NULL;
CREATE INDEX idx_api_keys_user ON api_keys (user_id);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own API keys"
  ON api_keys FOR ALL
  USING (auth.uid() = user_id);

-- Ad Copy Variants tied to campaigns
CREATE TABLE IF NOT EXISTS ad_copy_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  field_type TEXT NOT NULL CHECK (field_type IN ('headline', 'primary_text', 'description')),
  content TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_copy_variants_campaign ON ad_copy_variants (campaign_id, field_type, sort_order);
CREATE INDEX idx_ad_copy_variants_user ON ad_copy_variants (user_id);

ALTER TABLE ad_copy_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own ad copy variants"
  ON ad_copy_variants FOR ALL
  USING (auth.uid() = user_id);
