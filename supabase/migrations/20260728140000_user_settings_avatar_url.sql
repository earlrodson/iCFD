-- ============================================================================
-- Migration 015: Add missing avatar_url column to user_settings
-- ============================================================================
--
-- app/api/profile/avatar/route.ts and lib/supabase/sync.ts have referenced
-- user_settings.avatar_url since the profile feature shipped, but the column
-- was never actually created on the live table (only in drizzle/schema.ts,
-- which does not drive live schema). This made every fetchProfileFromCloud()
-- select fail with "column avatar_url does not exist", silently returning
-- null — so the profile form reset to blank on every page load even though
-- saves to the other profile columns were succeeding underneath.

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS avatar_url text;
