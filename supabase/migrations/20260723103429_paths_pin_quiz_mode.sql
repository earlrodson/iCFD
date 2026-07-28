ALTER TABLE paths
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quiz_mode text NOT NULL DEFAULT 'sequential';

ALTER TABLE paths DROP CONSTRAINT IF EXISTS paths_quiz_mode_check;
ALTER TABLE paths
  ADD CONSTRAINT paths_quiz_mode_check CHECK (quiz_mode IN ('sequential', 'agnostic'));
