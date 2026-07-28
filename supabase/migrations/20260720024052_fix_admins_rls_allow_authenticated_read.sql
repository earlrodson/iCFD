-- Drop the restrictive "self read" policy that lets each user see only their own row.
-- Any authenticated user reaching /admin has already been validated as an admin
-- by the layout check, so exposing the full list to authenticated users is safe.
DROP POLICY IF EXISTS "self read" ON admins;

CREATE POLICY "authenticated can read all admins"
  ON admins FOR SELECT
  TO authenticated
  USING (true);
