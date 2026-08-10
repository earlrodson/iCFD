-- Extend get_all_users() to also surface CFD-membership status, so the
-- admin users page can show/toggle it without a second round-trip per user.
-- Return type changed (new column), so the old signature must be dropped first.
DROP FUNCTION IF EXISTS public.get_all_users();

CREATE FUNCTION public.get_all_users()
 RETURNS TABLE(id uuid, email text, created_at timestamp with time zone, last_sign_in_at timestamp with time zone, role text, is_cfd_member boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Only callable by users who are in the admins table
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
  ORDER BY au.created_at DESC;
$function$;
