-- Add 'superadmin' role: same privileges as 'admin' everywhere existing
-- `admins` EXISTS(...) checks are used, but hidden from get_all_users() for
-- everyone except another superadmin, so ordinary admins never see this
-- row on /admin/users.
ALTER TABLE "admins" DROP CONSTRAINT "admins_role_check";
ALTER TABLE "admins" ADD CONSTRAINT "admins_role_check"
  CHECK (role IN ('admin', 'editor', 'presenter', 'superadmin'));

INSERT INTO "admins" (user_id, email, role, granted_by)
SELECT id, email, 'superadmin', id
FROM auth.users
WHERE email = 'earlrodson@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'superadmin';

-- Return type is unchanged from the previous version, so no DROP needed —
-- only the WHERE clause's visibility rule changes.
CREATE OR REPLACE FUNCTION public.get_all_users()
 RETURNS TABLE(id uuid, email text, created_at timestamp with time zone, last_sign_in_at timestamp with time zone, role text, is_cfd_member boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Only callable by users who are in the admins table. Superadmin rows are
  -- hidden from every caller except another superadmin.
  SELECT
    au.id,
    au.email,
    au.created_at,
    au.last_sign_in_at,
    a.role,
    coalesce(us.is_cfd_member, false) AS is_cfd_member
  FROM auth.users au
  LEFT JOIN public.admins a ON a.user_id = au.id
  LEFT JOIN public.user_settings us ON us.user_id = au.id
  WHERE EXISTS (
    SELECT 1 FROM public.admins WHERE user_id = auth.uid()
  )
  AND (
    a.role IS DISTINCT FROM 'superadmin'
    OR EXISTS (
      SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND role = 'superadmin'
    )
  )
  ORDER BY au.created_at DESC;
$function$;
