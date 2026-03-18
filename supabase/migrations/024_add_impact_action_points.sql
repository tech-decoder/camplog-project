-- Add structured action points column to store CampLog's expert recommendations
ALTER TABLE changes
ADD COLUMN IF NOT EXISTS impact_action_points JSONB DEFAULT NULL;
