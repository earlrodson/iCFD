-- Returns all auth users with their admin role (if any).
-- SECURITY DEFINER runs as the function owner (superuser) so it can
-- read auth.users. The inner EXISTS check gates it to admins only.
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
  id          uuid,
  email       text,
  created_at  timestamptz,
  last_sign_in_at timestamptz,
  role        text   -- 'admin' | 'editor' | null (regular user)
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only callable by users who are in the admins table
  SELECT
    au.id,
    au.email,
    au.created_at,
    au.last_sign_in_at,
    a.role
  FROM auth.users au
  LEFT JOIN public.admins a ON a.user_id = au.id
  WHERE EXISTS (
    SELECT 1 FROM public.admins WHERE user_id = auth.uid()
  )
  ORDER BY au.created_at DESC;
$$;
