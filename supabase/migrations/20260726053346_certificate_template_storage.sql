-- Duplicate retry of 20260726051729 — identical statements (ON CONFLICT DO
-- NOTHING, idempotent). Kept as a separate file so this repo's migration
-- history matches supabase_migrations.schema_migrations exactly.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certificate-templates',
  'certificate-templates',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;
