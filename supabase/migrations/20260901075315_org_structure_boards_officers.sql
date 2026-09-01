-- Org hierarchy (National -> Diocese -> Chapter) plus board membership and
-- officer titles at each level. See
-- docs/specifications/org-structure-boards-officers.md for the full spec.

-- ── Dioceses ──────────────────────────────────────────────────────────────

CREATE TABLE "dioceses" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"       text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- ── Chapters (Parish or School), each under exactly one diocese ────────────

CREATE TABLE "chapters" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"       text NOT NULL,
  "type"       text NOT NULL CHECK ("type" IN ('parish', 'school')),
  "diocese_id" uuid NOT NULL REFERENCES "dioceses"("id"),
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "chapters_diocese_id_idx" ON "chapters" ("diocese_id");

-- ── Users belong to a chapter (replaces free-text user_settings.chapter/
-- diocese as the source of truth going forward; those columns are left in
-- place, not dropped, for backward compatibility / manual reconciliation) ──

ALTER TABLE "user_settings"
  ADD COLUMN "chapter_id" uuid REFERENCES "chapters"("id");

CREATE INDEX "user_settings_chapter_id_idx" ON "user_settings" ("chapter_id");

-- ── Board seat limits — one admin-configurable max per level, not per
-- individual diocese/chapter instance ───────────────────────────────────────

CREATE TABLE "board_seat_limits" (
  "level"     text PRIMARY KEY CHECK ("level" IN ('national', 'diocese', 'chapter')),
  "max_seats" integer NOT NULL CHECK ("max_seats" > 0)
);

INSERT INTO "board_seat_limits" ("level", "max_seats") VALUES
  ('national', 21),
  ('diocese', 15),
  ('chapter', 15);

-- ── Board membership + officer title, one row per (level, org unit, user).
-- Office lives on the same row created at election time, so "must already
-- be a board member to hold an office" is structural, not a cross-table
-- check ──────────────────────────────────────────────────────────────────

CREATE TABLE "board_members" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "level"      text NOT NULL CHECK ("level" IN ('national', 'diocese', 'chapter')),
  "diocese_id" uuid REFERENCES "dioceses"("id"),
  "chapter_id" uuid REFERENCES "chapters"("id"),
  "user_id"    uuid NOT NULL,
  "office"     text CHECK ("office" IN (
    'spiritual_adviser', 'theological_adviser', 'adviser', 'president',
    'internal_vice_president', 'external_vice_president', 'secretary',
    'treasurer', 'auditor', 'pio'
  )),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "board_members_org_unit_matches_level" CHECK (
    ("level" = 'national' AND "diocese_id" IS NULL AND "chapter_id" IS NULL) OR
    ("level" = 'diocese'  AND "diocese_id" IS NOT NULL AND "chapter_id" IS NULL) OR
    ("level" = 'chapter'  AND "chapter_id" IS NOT NULL AND "diocese_id" IS NULL)
  )
);

-- One board row per user per org unit per level.
CREATE UNIQUE INDEX "board_members_national_user_uidx"
  ON "board_members" ("user_id") WHERE "level" = 'national';
CREATE UNIQUE INDEX "board_members_diocese_user_uidx"
  ON "board_members" ("diocese_id", "user_id") WHERE "level" = 'diocese';
CREATE UNIQUE INDEX "board_members_chapter_user_uidx"
  ON "board_members" ("chapter_id", "user_id") WHERE "level" = 'chapter';

-- One office held by at most one person per org unit per level. Combined
-- with the uniqueness above (one row per user per org unit), this also
-- guarantees at most one office per person per level.
CREATE UNIQUE INDEX "board_members_national_office_uidx"
  ON "board_members" ("office") WHERE "level" = 'national' AND "office" IS NOT NULL;
CREATE UNIQUE INDEX "board_members_diocese_office_uidx"
  ON "board_members" ("diocese_id", "office") WHERE "level" = 'diocese' AND "office" IS NOT NULL;
CREATE UNIQUE INDEX "board_members_chapter_office_uidx"
  ON "board_members" ("chapter_id", "office") WHERE "level" = 'chapter' AND "office" IS NOT NULL;

-- ── Seat cap enforcement — reads the admin-configured limit for the row's
-- level from board_seat_limits rather than a hardcoded number ─────────────

CREATE OR REPLACE FUNCTION "public"."enforce_board_seat_limit"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  seat_limit integer;
  current_count integer;
BEGIN
  SELECT "max_seats" INTO seat_limit
  FROM "board_seat_limits"
  WHERE "level" = NEW."level";

  SELECT count(*) INTO current_count
  FROM "board_members"
  WHERE "level" = NEW."level"
    AND "diocese_id" IS NOT DISTINCT FROM NEW."diocese_id"
    AND "chapter_id" IS NOT DISTINCT FROM NEW."chapter_id";

  IF current_count >= seat_limit THEN
    RAISE EXCEPTION 'Board seat limit (%) reached for % level', seat_limit, NEW."level";
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "board_members_seat_limit_trg"
  BEFORE INSERT ON "board_members"
  FOR EACH ROW
  EXECUTE FUNCTION "public"."enforce_board_seat_limit"();

-- Prevent an admin from lowering a level's max_seats below that level's
-- current largest roster, rather than silently orphaning members over cap.

CREATE OR REPLACE FUNCTION "public"."enforce_seat_limit_not_below_roster"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  largest_roster integer;
BEGIN
  SELECT max(cnt) INTO largest_roster
  FROM (
    SELECT count(*) AS cnt
    FROM "board_members"
    WHERE "level" = NEW."level"
    GROUP BY "diocese_id", "chapter_id"
  ) "rosters";

  IF largest_roster IS NOT NULL AND NEW."max_seats" < largest_roster THEN
    RAISE EXCEPTION 'Cannot set % seat limit to % — an existing roster already has % members',
      NEW."level", NEW."max_seats", largest_roster;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "board_seat_limits_no_decrease_below_roster_trg"
  BEFORE UPDATE ON "board_seat_limits"
  FOR EACH ROW
  EXECUTE FUNCTION "public"."enforce_seat_limit_not_below_roster"();

-- ── RLS: open read (needed for org pickers/roster display), admin-only
-- write — same "admins can manage X" pattern as paths/topics/presentations ──

ALTER TABLE "dioceses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chapters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "board_seat_limits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "board_members" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read dioceses" ON "dioceses"
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins can manage dioceses" ON "dioceses"
  FOR ALL
  USING (EXISTS (SELECT 1 FROM "admins" WHERE "admins"."user_id" = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM "admins" WHERE "admins"."user_id" = auth.uid()));

CREATE POLICY "public read chapters" ON "chapters"
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins can manage chapters" ON "chapters"
  FOR ALL
  USING (EXISTS (SELECT 1 FROM "admins" WHERE "admins"."user_id" = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM "admins" WHERE "admins"."user_id" = auth.uid()));

CREATE POLICY "public read board_seat_limits" ON "board_seat_limits"
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins can manage board_seat_limits" ON "board_seat_limits"
  FOR ALL
  USING (EXISTS (SELECT 1 FROM "admins" WHERE "admins"."user_id" = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM "admins" WHERE "admins"."user_id" = auth.uid()));

CREATE POLICY "public read board_members" ON "board_members"
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins can manage board_members" ON "board_members"
  FOR ALL
  USING (EXISTS (SELECT 1 FROM "admins" WHERE "admins"."user_id" = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM "admins" WHERE "admins"."user_id" = auth.uid()));
