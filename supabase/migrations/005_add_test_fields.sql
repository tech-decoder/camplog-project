-- Add test tracking fields to changes
ALTER TABLE changes ADD COLUMN IF NOT EXISTS test_category TEXT;
ALTER TABLE changes ADD COLUMN IF NOT EXISTS hypothesis TEXT;

-- Index for filtering test-tagged changes
CREATE INDEX IF NOT EXISTS idx_changes_test_category ON changes(test_category) WHERE test_category IS NOT NULL;
