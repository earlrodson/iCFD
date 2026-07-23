-- Soft-delete for paths: deleting from /admin/paths now sets deleted_at
-- instead of removing the row (and its path_topics), so it can be restored.
-- Public read policy excludes soft-deleted paths; the existing
-- "admins can manage paths" policy already covers admin SELECT of everything
-- (RLS policies for the same command are OR-combined).

ALTER TABLE paths
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

DROP POLICY IF EXISTS "paths_public_read" ON paths;
CREATE POLICY "paths_public_read"
  ON paths FOR SELECT USING (deleted_at IS NULL);
