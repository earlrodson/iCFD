-- Fix: paths and path_topics had only a public SELECT policy — no
-- INSERT/UPDATE/DELETE policy existed at all, so RLS silently blocked every
-- admin write (delete included) with no error surfaced in the admin UI.
--
-- The 002_rbac_profile.sql write policies (checking user_settings.role) were
-- superseded at some point by an `admins`-table-based policy on `topics`
-- ("admins can manage topics") that was never mirrored onto paths/path_topics.
-- This migration brings paths/path_topics in line with that same convention.

DROP POLICY IF EXISTS "paths_admin_editor_insert" ON paths;
DROP POLICY IF EXISTS "paths_admin_editor_update" ON paths;
DROP POLICY IF EXISTS "paths_admin_delete" ON paths;
DROP POLICY IF EXISTS "path_topics_admin_editor_write" ON path_topics;

DROP POLICY IF EXISTS "admins can manage paths" ON paths;
CREATE POLICY "admins can manage paths"
  ON paths FOR ALL
  USING (EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid()));

DROP POLICY IF EXISTS "admins can manage path_topics" ON path_topics;
CREATE POLICY "admins can manage path_topics"
  ON path_topics FOR ALL
  USING (EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid()));
