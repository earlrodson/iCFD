-- Lock down chapter/diocese/chapter_id/is_cfd_member on user_settings so a
-- regular user cannot self-assign or self-escalate them. RLS alone only
-- checks row ownership (auth.uid() = user_id), not which columns are being
-- written, so a signed-in user could otherwise set their own chapter_id or
-- flip is_cfd_member directly via the client. Legitimate writes to these
-- columns only ever happen through app/api/admin/users/route.ts, which uses
-- the service-role client (Postgres role `service_role`, auth.role() =
-- 'service_role') — that path is exempted below.
CREATE OR REPLACE FUNCTION public.enforce_admin_only_membership_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
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

CREATE TRIGGER user_settings_admin_only_membership_fields_trg
  BEFORE INSERT OR UPDATE ON "user_settings"
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_admin_only_membership_fields();
