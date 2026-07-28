-- ============================================================================
-- Migration 014: User profile fields + CFD membership fields
-- Run against Supabase via psql (pooler port 6543)
-- ============================================================================

-- ── Profile fields visible to every user ──────────────────────────────────────

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS first_name     text,
  ADD COLUMN IF NOT EXISTS last_name      text,
  ADD COLUMN IF NOT EXISTS age            integer,
  ADD COLUMN IF NOT EXISTS location       text,
  ADD COLUMN IF NOT EXISTS certifications text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS mobile_number  text;

ALTER TABLE user_settings
  DROP CONSTRAINT IF EXISTS user_settings_age_check;
ALTER TABLE user_settings
  ADD CONSTRAINT user_settings_age_check CHECK (age IS NULL OR (age BETWEEN 0 AND 130));

-- ── CFD membership fields — only meaningful (and only shown in the UI) when
-- is_cfd_member is true; a regular user never sees this section ────────────────

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS is_cfd_member        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS chapter              text,
  ADD COLUMN IF NOT EXISTS diocese              text,
  ADD COLUMN IF NOT EXISTS cfd_id_image_path    text,
  ADD COLUMN IF NOT EXISTS membership_date      date,
  ADD COLUMN IF NOT EXISTS membership_expiration date;

-- ── Storage: avatars (public — displayed directly via <img src>) ─────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ── Storage: CFD ID card images (private — served via signed URL only, since
-- these are personal ID documents) ────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cfd-id-cards',
  'cfd-id-cards',
  false,
  5242880, -- 5 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;
