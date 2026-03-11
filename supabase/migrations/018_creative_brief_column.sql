-- Add creative_brief JSONB column to generation_jobs
-- Stores the CreativeBrief output from the Creative Director agent
ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS creative_brief JSONB;
