-- Add is_admin flag to profiles (default false for all users)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Grant admin access to bill@ltv.so
UPDATE profiles
  SET is_admin = TRUE
  WHERE email = 'bill@ltv.so';
