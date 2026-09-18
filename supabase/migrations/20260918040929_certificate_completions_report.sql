-- Admin report: which users completed which paths/tiers, with diocese/
-- chapter/year available for filtering client-side in /admin/certificates
-- (Completions tab). Same admin-gating pattern as get_all_users().
CREATE FUNCTION public.get_certificate_completions()
 RETURNS TABLE(
   certificate_id uuid,
   user_id uuid,
   email text,
   first_name text,
   last_name text,
   path_slug text,
   path_title text,
   tier text,
   serial_code text,
   issued_at timestamp with time zone,
   chapter_id uuid,
   chapter_name text,
   diocese_id uuid,
   diocese_name text
 )
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    c.id AS certificate_id,
    c.user_id,
    au.email,
    us.first_name,
    us.last_name,
    c.path_slug,
    p.title AS path_title,
    c.tier,
    c.serial_code,
    c.issued_at,
    ch.id AS chapter_id,
    ch.name AS chapter_name,
    d.id AS diocese_id,
    d.name AS diocese_name
  FROM public.certificates c
  LEFT JOIN auth.users au ON au.id = c.user_id
  LEFT JOIN public.user_settings us ON us.user_id = c.user_id
  LEFT JOIN public.paths p ON p.slug = c.path_slug
  LEFT JOIN public.chapters ch ON ch.id = us.chapter_id
  LEFT JOIN public.dioceses d ON d.id = ch.diocese_id
  WHERE EXISTS (
    SELECT 1 FROM public.admins WHERE user_id = auth.uid()
  )
  ORDER BY c.issued_at DESC;
$function$;

revoke execute on function public.get_certificate_completions() from public, anon;
grant execute on function public.get_certificate_completions() to authenticated;
