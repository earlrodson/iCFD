CREATE TABLE IF NOT EXISTS "admins" (
  "user_id"    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  "email"      text NOT NULL,
  "granted_by" uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "admins" ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can check if they are an admin
CREATE POLICY "self read"
  ON "admins" FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Only existing admins can insert/delete (enforced via service role in admin panel)
-- Direct mutations require the secret key; the UI uses the admin client
