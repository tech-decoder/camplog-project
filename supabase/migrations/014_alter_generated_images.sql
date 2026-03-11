-- Add job tracking and ad-style metadata to generated_images
ALTER TABLE generated_images
  ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES generation_jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ad_style TEXT,
  ADD COLUMN IF NOT EXISTS cta_text TEXT,
  ADD COLUMN IF NOT EXISTS subheadline TEXT,
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'English',
  ADD COLUMN IF NOT EXISTS generation_index INT;

CREATE INDEX IF NOT EXISTS idx_generated_images_job ON generated_images(job_id, generation_index);
