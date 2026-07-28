ALTER TABLE public.topics
  ADD COLUMN IF NOT EXISTS translation_source TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS translation_notes  TEXT;

COMMENT ON COLUMN public.topics.translation_source IS 'manual | machine | stub — controls auto-translate behaviour';
COMMENT ON COLUMN public.topics.translation_notes  IS 'Per-topic translator instructions injected into the AI prompt';
