-- Generation jobs: tracks the multi-step AI creative generation pipeline
CREATE TABLE generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('ai_takeover', 'custom', 'winning_variants')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'strategizing', 'strategy_ready', 'generating', 'completed', 'failed')),
  brand_name TEXT NOT NULL,
  model TEXT NOT NULL,
  quality TEXT DEFAULT 'standard',
  language TEXT DEFAULT 'English',
  total_count INT,
  format_split JSONB DEFAULT '{"square":6,"portrait":6}',
  reference_images TEXT[] DEFAULT '{}',
  strategy JSONB,
  images_requested INT DEFAULT 0,
  images_completed INT DEFAULT 0,
  images_failed INT DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_generation_jobs_user ON generation_jobs(user_id, created_at DESC);

ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own generation jobs"
  ON generation_jobs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access to generation jobs"
  ON generation_jobs FOR ALL
  USING (auth.role() = 'service_role');
