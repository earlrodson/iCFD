-- Add duration_ms to quiz_attempts so completion time can be tracked
-- alongside score/pass-fail. Nullable and client-reported — not used for
-- scoring or certificates, so a missing/invalid value never blocks a
-- submission (see app/api/quiz/route.ts POST).
ALTER TABLE quiz_attempts
  ADD COLUMN IF NOT EXISTS duration_ms integer;
