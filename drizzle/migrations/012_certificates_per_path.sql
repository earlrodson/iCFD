-- Certificates and their templates were keyed by tier alone, which only
-- worked because a single course path existed. Add path_slug so each path
-- can have its own template artwork per tier, and so a user earns a
-- certificate per (path, tier) rather than one certificate per tier
-- shared across every path. Both tables are empty in production, so no
-- backfill is needed.

ALTER TABLE "certificate_templates" ADD COLUMN "path_slug" text REFERENCES "paths"("slug");
ALTER TABLE "certificate_templates" ALTER COLUMN "path_slug" SET NOT NULL;
ALTER TABLE "certificate_templates" DROP CONSTRAINT "certificate_templates_pkey";
ALTER TABLE "certificate_templates" ADD PRIMARY KEY ("path_slug", "tier");

ALTER TABLE "certificates" ADD COLUMN "path_slug" text REFERENCES "paths"("slug");
ALTER TABLE "certificates" ALTER COLUMN "path_slug" SET NOT NULL;
ALTER TABLE "certificates" DROP CONSTRAINT "certificates_user_id_tier_key";
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_user_path_tier_key" UNIQUE ("user_id", "path_slug", "tier");
