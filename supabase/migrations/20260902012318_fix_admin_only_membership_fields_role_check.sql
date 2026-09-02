CREATE OR REPLACE FUNCTION public.enforce_admin_only_membership_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Supabase's newer sb_secret_... service-role key format runs the
  -- connection as the `service_role` Postgres role directly, without
  -- necessarily populating the request.jwt.claim.role GUC that auth.role()
  -- reads from. Check both so admin API writes (lib/supabase/admin.ts) are
  -- correctly exempted regardless of which key format issued the request.
  IF auth.role() = 'service_role' OR current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.chapter IS NOT NULL OR NEW.diocese IS NOT NULL
       OR NEW.chapter_id IS NOT NULL OR NEW.is_cfd_member IS TRUE THEN
      RAISE EXCEPTION 'chapter, diocese, chapter_id, and is_cfd_member can only be set by an admin';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.chapter IS DISTINCT FROM OLD.chapter
     OR NEW.diocese IS DISTINCT FROM OLD.diocese
     OR NEW.chapter_id IS DISTINCT FROM OLD.chapter_id
     OR NEW.is_cfd_member IS DISTINCT FROM OLD.is_cfd_member THEN
    RAISE EXCEPTION 'chapter, diocese, chapter_id, and is_cfd_member can only be changed by an admin';
  END IF;

  RETURN NEW;
END;
$$;
