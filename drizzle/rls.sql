-- ============================================================================
-- Row Level Security policies for iCFD
-- Run this in the Supabase SQL editor AFTER running migrations.
-- ============================================================================

-- ── Enable RLS on all tables ────────────────────────────────────────────────

ALTER TABLE topics          ENABLE ROW LEVEL SECURITY;
ALTER TABLE paths           ENABLE ROW LEVEL SECURITY;
ALTER TABLE path_topics     ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE read_progress   ENABLE ROW LEVEL SECURITY;
ALTER TABLE view_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings   ENABLE ROW LEVEL SECURITY;

-- ── Public content: anyone can read, only service role can write ─────────────

CREATE POLICY "topics_public_read"
  ON topics FOR SELECT USING (true);

CREATE POLICY "paths_public_read"
  ON paths FOR SELECT USING (true);

CREATE POLICY "path_topics_public_read"
  ON path_topics FOR SELECT USING (true);

-- ── Favorites: users own their rows ─────────────────────────────────────────

CREATE POLICY "favorites_select_own"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "favorites_insert_own"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "favorites_delete_own"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);

-- ── Notes: users own their rows ──────────────────────────────────────────────

CREATE POLICY "notes_select_own"
  ON notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notes_insert_own"
  ON notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notes_update_own"
  ON notes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notes_delete_own"
  ON notes FOR DELETE
  USING (auth.uid() = user_id);

-- ── Read progress: users own their rows ─────────────────────────────────────

CREATE POLICY "read_progress_select_own"
  ON read_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "read_progress_insert_own"
  ON read_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "read_progress_delete_own"
  ON read_progress FOR DELETE
  USING (auth.uid() = user_id);

-- ── View history: users own their rows ──────────────────────────────────────

CREATE POLICY "view_history_select_own"
  ON view_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "view_history_insert_own"
  ON view_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "view_history_update_own"
  ON view_history FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── User settings: users own their row ──────────────────────────────────────

CREATE POLICY "user_settings_select_own"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_settings_insert_own"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_settings_update_own"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Trigger: auto-create user_settings row on new auth user sign-up
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
