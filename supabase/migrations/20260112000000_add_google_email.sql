-- migrate:up
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS google_email text;
