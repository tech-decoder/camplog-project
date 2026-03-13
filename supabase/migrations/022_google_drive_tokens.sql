-- Add Google Drive OAuth tokens to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS google_drive_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS google_drive_connected_at TIMESTAMPTZ;
