-- Guided Course, Quizzes & Certificates (PRD-enhanced.md, Phase 11).
-- Beginner/Intermediate/Advanced quizzes per topic, rotated from a question
-- bank, plus per-tier completion certificates with an admin-configurable
-- image template.

-- ── quiz_settings ────────────────────────────────────────────────────────────
-- One row per tier; admin-editable via /admin/quiz-settings.

CREATE TABLE IF NOT EXISTS "quiz_settings" (
  "tier"         text PRIMARY KEY,
  "item_count"   integer NOT NULL,
  "bank_size"    integer NOT NULL,
  "pass_percent" integer NOT NULL,
  "updated_at"   timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "quiz_settings_tier_check" CHECK ("tier" IN ('beginner', 'intermediate', 'advanced'))
);

INSERT INTO "quiz_settings" ("tier", "item_count", "bank_size", "pass_percent") VALUES
  ('beginner',     10, 30, 70),
  ('intermediate', 20, 60, 80),
  ('advanced',     30, 90, 85)
ON CONFLICT ("tier") DO NOTHING;

-- ── quiz_questions ───────────────────────────────────────────────────────────
-- The full authored bank per (topic_id, tier); an attempt samples a random
-- item_count subset. correct_index is never selected out to the client.

CREATE TABLE IF NOT EXISTS "quiz_questions" (
  "id"             bigserial PRIMARY KEY,
  "topic_id"       text NOT NULL,
  "tier"           text NOT NULL REFERENCES "quiz_settings"("tier"),
  "question"       text NOT NULL,
  "choices"        jsonb NOT NULL,
  "correct_index"  integer NOT NULL,
  "active"         boolean NOT NULL DEFAULT true,
  "created_at"     timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "quiz_questions_topic_tier_idx" ON "quiz_questions" ("topic_id", "tier");

-- ── quiz_attempts ────────────────────────────────────────────────────────────
-- One row per submitted attempt. question_ids records exactly which rotated
-- subset was served, so rotation is auditable, not just random-at-render.

CREATE TABLE IF NOT EXISTS "quiz_attempts" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"        uuid NOT NULL,
  "topic_id"       text NOT NULL,
  "tier"           text NOT NULL REFERENCES "quiz_settings"("tier"),
  "question_ids"   jsonb NOT NULL,
  "answers"        jsonb NOT NULL,
  "score_percent"  numeric NOT NULL,
  "passed"         boolean NOT NULL,
  "attempted_at"   timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "quiz_attempts_user_topic_tier_idx" ON "quiz_attempts" ("user_id", "topic_id", "tier", "attempted_at" DESC);

-- ── course_progress ──────────────────────────────────────────────────────────
-- The "done" ledger: one row per topic+tier a user has passed.

CREATE TABLE IF NOT EXISTS "course_progress" (
  "user_id"    uuid NOT NULL,
  "topic_id"   text NOT NULL,
  "tier"       text NOT NULL REFERENCES "quiz_settings"("tier"),
  "passed_at"  timestamp with time zone NOT NULL,
  PRIMARY KEY ("user_id", "topic_id", "tier")
);

-- ── certificate_templates ────────────────────────────────────────────────────
-- Admin-uploaded background image per tier + drag-placed field coordinates.

CREATE TABLE IF NOT EXISTS "certificate_templates" (
  "tier"           text PRIMARY KEY REFERENCES "quiz_settings"("tier"),
  "base_image_url" text NOT NULL,
  "placeholders"   jsonb NOT NULL,
  "updated_at"     timestamp with time zone DEFAULT now() NOT NULL
);

-- ── certificates ─────────────────────────────────────────────────────────────
-- Issued once course_progress covers all course topics for a tier. Permanent
-- once issued — later quiz re-attempts never revoke it.

CREATE TABLE IF NOT EXISTS "certificates" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"      uuid NOT NULL,
  "tier"         text NOT NULL REFERENCES "quiz_settings"("tier"),
  "serial_code"  text NOT NULL UNIQUE,
  "issued_at"    timestamp with time zone DEFAULT now() NOT NULL,
  "pdf_url"      text NOT NULL,
  "image_url"    text NOT NULL,
  UNIQUE ("user_id", "tier")
);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE "quiz_settings"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quiz_questions"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quiz_attempts"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "course_progress"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "certificate_templates"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "certificates"           ENABLE ROW LEVEL SECURITY;

-- Public SELECT: quiz configuration and questions (minus correct_index — that
-- column is present in the row, but the app must never select it for a client
-- taking a quiz; enforcement is at the query layer, not RLS column masking).
DROP POLICY IF EXISTS "quiz_settings_public_read" ON "quiz_settings";
CREATE POLICY "quiz_settings_public_read" ON "quiz_settings" FOR SELECT USING (true);

DROP POLICY IF EXISTS "quiz_questions_public_read" ON "quiz_questions";
CREATE POLICY "quiz_questions_public_read" ON "quiz_questions" FOR SELECT USING (true);

DROP POLICY IF EXISTS "certificate_templates_public_read" ON "certificate_templates";
CREATE POLICY "certificate_templates_public_read" ON "certificate_templates" FOR SELECT USING (true);

-- Per-user data: quiz_attempts, course_progress, certificates.
-- No client-side INSERT policy — scoring and issuance happen via a trusted
-- server path (service role / RPC), never a direct client write, so a user
-- cannot forge a passing score or a certificate.
DROP POLICY IF EXISTS "quiz_attempts_select_own" ON "quiz_attempts";
CREATE POLICY "quiz_attempts_select_own" ON "quiz_attempts" FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "course_progress_select_own" ON "course_progress";
CREATE POLICY "course_progress_select_own" ON "course_progress" FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "certificates_select_own" ON "certificates";
CREATE POLICY "certificates_select_own" ON "certificates" FOR SELECT USING (auth.uid() = user_id);
