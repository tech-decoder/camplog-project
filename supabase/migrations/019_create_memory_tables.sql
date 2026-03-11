-- image_ratings: thumbs up/down per image per user
CREATE TABLE IF NOT EXISTS image_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID NOT NULL REFERENCES generated_images(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating IN (-1, 1)),  -- -1 = thumbs down, 1 = thumbs up
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(image_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_image_ratings_user ON image_ratings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_image_ratings_image ON image_ratings(image_id);

ALTER TABLE image_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own image ratings"
  ON image_ratings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access to image ratings"
  ON image_ratings FOR ALL
  USING (auth.role() = 'service_role');

-- creative_memory: synthesized learnings from rated images
CREATE TABLE IF NOT EXISTS creative_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name TEXT,  -- NULL = global cross-brand learning
  memory_type TEXT CHECK (memory_type IN ('style_learning', 'copy_learning', 'composition_learning', 'brand_insight')),
  content TEXT NOT NULL,
  source_job_id UUID REFERENCES generation_jobs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creative_memory_user ON creative_memory(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creative_memory_brand ON creative_memory(user_id, brand_name);

ALTER TABLE creative_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own creative memory"
  ON creative_memory FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access to creative memory"
  ON creative_memory FOR ALL
  USING (auth.role() = 'service_role');
