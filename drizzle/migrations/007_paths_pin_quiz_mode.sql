-- Paths: pin-to-top flag + per-path quiz completion mode.
--   pinned    — admin can pin any path above the rest on /paths, regardless
--               of created_at order.
--   quiz_mode — 'sequential': a topic's quiz is locked until the previous
--               topic in the path has been passed at the same tier.
--               'agnostic': topics can be quizzed in any order.

ALTER TABLE paths
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quiz_mode text NOT NULL DEFAULT 'sequential';

ALTER TABLE paths DROP CONSTRAINT IF EXISTS paths_quiz_mode_check;
ALTER TABLE paths
  ADD CONSTRAINT paths_quiz_mode_check CHECK (quiz_mode IN ('sequential', 'agnostic'));
