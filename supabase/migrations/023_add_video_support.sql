-- Add media_type to generation_jobs (default 'image' for backward compat)
ALTER TABLE generation_jobs
  ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'image'
    CHECK (media_type IN ('image', 'video'));

-- Add video-specific fields
ALTER TABLE generation_jobs
  ADD COLUMN IF NOT EXISTS video_duration INT,
  ADD COLUMN IF NOT EXISTS video_model TEXT;

-- Create generated_videos table
CREATE TABLE IF NOT EXISTS generated_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  prompt TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'veo-3-fast',
  aspect_ratio TEXT NOT NULL DEFAULT '16:9',
  duration_seconds INT NOT NULL DEFAULT 4,
  video_ad_style TEXT,
  headline_ref TEXT,
  subheadline_ref TEXT,
  cta_text TEXT,
  language TEXT DEFAULT 'English',
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  job_id UUID REFERENCES generation_jobs(id) ON DELETE CASCADE,
  generation_index INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generated_videos_user ON generated_videos(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_videos_job ON generated_videos(job_id);
CREATE INDEX IF NOT EXISTS idx_generated_videos_campaign ON generated_videos(campaign_id);

ALTER TABLE generated_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generated videos"
  ON generated_videos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own generated videos"
  ON generated_videos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own generated videos"
  ON generated_videos FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access to generated videos"
  ON generated_videos FOR ALL USING (auth.role() = 'service_role');

-- Storage bucket for generated videos
INSERT INTO storage.buckets (id, name, public)
  VALUES ('generated-videos', 'generated-videos', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload generated videos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'generated-videos' AND auth.role() = 'authenticated');
CREATE POLICY "Anyone can view generated videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'generated-videos');
CREATE POLICY "Service role full access generated videos storage"
  ON storage.objects FOR ALL
  USING (bucket_id = 'generated-videos' AND auth.role() = 'service_role');
