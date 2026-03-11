ALTER TABLE style_preferences
ADD COLUMN IF NOT EXISTS copy_pool JSONB DEFAULT '{"headlines":[],"subheadlines":[],"ctas":[]}';
