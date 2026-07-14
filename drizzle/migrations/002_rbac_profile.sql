-- ============================================================================
-- Migration 002: RBAC roles + user profile fields
-- Run against Supabase via psql (pooler port 6543)
-- ============================================================================

-- ── Extend user_settings with profile + role ──────────────────────────────────

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS role        text NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS avatar_url   text;

ALTER TABLE user_settings
  DROP CONSTRAINT IF EXISTS user_settings_role_check;
ALTER TABLE user_settings
  ADD CONSTRAINT user_settings_role_check
  CHECK (role IN ('user', 'editor', 'admin'));

-- ── Additional SELECT policy: admins can read all user rows ──────────────────
-- (existing user_settings_select_own already handles normal users)

DROP POLICY IF EXISTS "user_settings_admin_select_all" ON user_settings;
CREATE POLICY "user_settings_admin_select_all"
  ON user_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_settings us2
      WHERE us2.user_id = auth.uid() AND us2.role = 'admin'
    )
  );

-- ── Write policies for topics (admin/editor) ─────────────────────────────────

DROP POLICY IF EXISTS "topics_admin_editor_insert" ON topics;
CREATE POLICY "topics_admin_editor_insert"
  ON topics FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_settings us
      WHERE us.user_id = auth.uid() AND us.role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "topics_admin_editor_update" ON topics;
CREATE POLICY "topics_admin_editor_update"
  ON topics FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_settings us
      WHERE us.user_id = auth.uid() AND us.role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_settings us
      WHERE us.user_id = auth.uid() AND us.role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "topics_admin_delete" ON topics;
CREATE POLICY "topics_admin_delete"
  ON topics FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_settings us
      WHERE us.user_id = auth.uid() AND us.role = 'admin'
    )
  );

-- ── Write policies for paths (admin/editor) ──────────────────────────────────

DROP POLICY IF EXISTS "paths_admin_editor_insert" ON paths;
CREATE POLICY "paths_admin_editor_insert"
  ON paths FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_settings us
      WHERE us.user_id = auth.uid() AND us.role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "paths_admin_editor_update" ON paths;
CREATE POLICY "paths_admin_editor_update"
  ON paths FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_settings us
      WHERE us.user_id = auth.uid() AND us.role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_settings us
      WHERE us.user_id = auth.uid() AND us.role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "paths_admin_delete" ON paths;
CREATE POLICY "paths_admin_delete"
  ON paths FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_settings us
      WHERE us.user_id = auth.uid() AND us.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "path_topics_admin_editor_write" ON path_topics;
CREATE POLICY "path_topics_admin_editor_write"
  ON path_topics FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_settings us
      WHERE us.user_id = auth.uid() AND us.role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_settings us
      WHERE us.user_id = auth.uid() AND us.role IN ('admin', 'editor')
    )
  );

-- ── Security-definer: set user role (admin only) ─────────────────────────────

CREATE OR REPLACE FUNCTION set_user_role(target_user_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF new_role NOT IN ('user', 'editor', 'admin') THEN
    RAISE EXCEPTION 'Invalid role: %', new_role;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM user_settings
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  UPDATE user_settings
  SET role = new_role, updated_at = now()
  WHERE user_id = target_user_id;
END;
$$;

-- ── Security-definer: list all users (admin only) ────────────────────────────

CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE(
  user_id       uuid,
  email         text,
  display_name  text,
  avatar_url    text,
  role          text,
  created_at    timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_settings
    WHERE user_settings.user_id = auth.uid() AND user_settings.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  RETURN QUERY
  SELECT
    us.user_id,
    au.email::text,
    us.display_name,
    us.avatar_url,
    us.role,
    au.created_at,
    au.last_sign_in_at
  FROM user_settings us
  JOIN auth.users au ON au.id = us.user_id
  ORDER BY au.created_at DESC;
END;
$$;

-- ── Update trigger: also store display_name from auth metadata on sign-up ─────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO user_settings (user_id, display_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
