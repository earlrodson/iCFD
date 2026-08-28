ALTER TABLE "admins" DROP CONSTRAINT "admins_role_check";
ALTER TABLE "admins" ADD CONSTRAINT "admins_role_check" CHECK (role IN ('admin', 'editor', 'presenter'));

CREATE TABLE "presentations" (
  "topic_id" text PRIMARY KEY,
  "slides" jsonb NOT NULL,
  "published" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "last_updated" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "presentations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cfd members can view published presentations" ON "presentations"
  FOR SELECT
  USING (
    published = true
    AND EXISTS (
      SELECT 1 FROM "user_settings"
      WHERE "user_settings"."user_id" = auth.uid() AND "user_settings"."is_cfd_member" = true
    )
  );

CREATE POLICY "admins can manage presentations" ON "presentations"
  FOR ALL
  USING (EXISTS (SELECT 1 FROM "admins" WHERE "admins"."user_id" = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM "admins" WHERE "admins"."user_id" = auth.uid()));
