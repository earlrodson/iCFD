-- Presentations aren't rolled out to all CFD members yet — tighten the public
-- viewer's RLS policy to require staff (any admins role) who are ALSO a CFD
-- member, not just one or the other. The separate "admins can manage
-- presentations" FOR ALL policy is untouched — it backs the /admin/presentations
-- authoring UI and intentionally isn't gated on is_cfd_member.
DROP POLICY IF EXISTS "cfd members can view published presentations" ON "presentations";

CREATE POLICY "cfd member admins can view published presentations" ON "presentations"
  FOR SELECT
  USING (
    published = true
    AND EXISTS (
      SELECT 1 FROM "user_settings"
      WHERE "user_settings"."user_id" = auth.uid() AND "user_settings"."is_cfd_member" = true
    )
    AND EXISTS (
      SELECT 1 FROM "admins" WHERE "admins"."user_id" = auth.uid()
    )
  );
