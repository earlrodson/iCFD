DROP POLICY IF EXISTS "admins can manage quiz_questions" ON quiz_questions;
CREATE POLICY "admins can manage quiz_questions"
  ON quiz_questions FOR ALL
  USING (EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid()));
