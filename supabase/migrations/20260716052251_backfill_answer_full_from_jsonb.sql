-- Backfill answer_full from the 'full' key inside the answer JSONB column.
-- Only updates rows where answer_full is not already set (never overwrites manual content).
UPDATE public.topics
SET answer_full = answer->>'full'
WHERE answer ? 'full'
  AND answer_full IS NULL;
