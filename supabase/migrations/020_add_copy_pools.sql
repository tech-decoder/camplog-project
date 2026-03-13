ALTER TABLE style_preferences
ADD COLUMN IF NOT EXISTS copy_pools JSONB DEFAULT '{}';
