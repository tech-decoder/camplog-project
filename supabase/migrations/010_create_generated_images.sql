-- Generated images for ad creatives
CREATE TABLE generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  prompt TEXT NOT NULL,
  model TEXT NOT NULL,
  quality TEXT DEFAULT 'standard',
  style_preset TEXT,
  dimensions TEXT DEFAULT '1024x1024',
  headline_ref TEXT,
  primary_text_ref TEXT,
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_generated_images_campaign ON generated_images(campaign_id, created_at DESC);
CREATE INDEX idx_generated_images_user ON generated_images(user_id);

-- RLS
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generated images"
  ON generated_images FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generated images"
  ON generated_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own generated images"
  ON generated_images FOR DELETE
  USING (auth.uid() = user_id);

-- Service role bypass for API key auth
CREATE POLICY "Service role full access to generated images"
  ON generated_images FOR ALL
  USING (auth.role() = 'service_role');
