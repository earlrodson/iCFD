-- Extend get_all_users() to also return each user's assigned chapter, so
-- /admin/users can display and edit chapter_id without a second round trip.
-- Return type changes (2 new columns), so the function must be dropped first.
DROP FUNCTION public.get_all_users();

CREATE FUNCTION public.get_all_users()
 RETURNS TABLE(id uuid, email text, created_at timestamp with time zone, last_sign_in_at timestamp with time zone, role text, is_cfd_member boolean, chapter_id uuid, chapter_name text)
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
    coalesce(us.is_cfd_member, false) AS is_cfd_member,
    us.chapter_id,
    c.name AS chapter_name
  FROM auth.users au
  LEFT JOIN public.admins a ON a.user_id = au.id
  LEFT JOIN public.user_settings us ON us.user_id = au.id
  LEFT JOIN public.chapters c ON c.id = us.chapter_id
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
