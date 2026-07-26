-- quiz_questions had only a public SELECT policy from 005_quiz_certificates.sql
-- — no INSERT/UPDATE/DELETE policy existed, so RLS would silently block every
-- admin write via the session-based server client (same bug class fixed for
-- paths/path_topics in 006_paths_admin_rls.sql). Needed for the /admin/quiz
-- question editor.

DROP POLICY IF EXISTS "admins can manage quiz_questions" ON quiz_questions;
CREATE POLICY "admins can manage quiz_questions"
  ON quiz_questions FOR ALL
  USING (EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid()));
