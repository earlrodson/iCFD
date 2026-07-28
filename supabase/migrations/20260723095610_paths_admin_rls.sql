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
