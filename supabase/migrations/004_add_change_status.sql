-- Add status and void_reason columns to changes table
-- status: 'active' (default), 'voided' (didn't happen / cancelled)
ALTER TABLE changes ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE changes ADD COLUMN IF NOT EXISTS void_reason text;

-- Create index for filtering by status
CREATE INDEX IF NOT EXISTS idx_changes_status ON changes(status);
