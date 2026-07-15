-- Community topic submissions awaiting review
CREATE TABLE IF NOT EXISTS "submissions" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title"           text NOT NULL,
  "question"        text NOT NULL,
  "answer"          text NOT NULL,
  "category"        text NOT NULL,
  "difficulty"      text NOT NULL,
  "scripture_refs"  text,
  "submitter_notes" text,
  "submitted_by"    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  "status"          text NOT NULL DEFAULT 'pending',
  "created_at"      timestamp with time zone DEFAULT now() NOT NULL
);

-- Only admins (service role) can read/manage; authenticated users can insert
ALTER TABLE "submissions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can submit"
  ON "submissions" FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "submitter can view own"
  ON "submissions" FOR SELECT
  TO authenticated
  USING (submitted_by = auth.uid());
