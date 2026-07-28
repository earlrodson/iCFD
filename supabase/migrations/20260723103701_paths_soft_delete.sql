ALTER TABLE paths
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

DROP POLICY IF EXISTS "paths_public_read" ON paths;
CREATE POLICY "paths_public_read"
  ON paths FOR SELECT USING (deleted_at IS NULL);
