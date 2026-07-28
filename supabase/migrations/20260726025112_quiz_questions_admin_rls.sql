-- Duplicate retry of 20260726022404 — identical statements, applied twice
-- against the live DB (idempotent DROP POLICY IF EXISTS / CREATE POLICY).
-- Kept as a separate file so this repo's migration history matches
-- supabase_migrations.schema_migrations exactly.
DROP POLICY IF EXISTS "admins can manage quiz_questions" ON quiz_questions;
CREATE POLICY "admins can manage quiz_questions"
  ON quiz_questions FOR ALL
  USING (EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid()));
