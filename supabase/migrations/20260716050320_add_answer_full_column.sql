ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS answer_full TEXT;
COMMENT ON COLUMN public.topics.answer_full IS 'Full markdown essay — comprehensive content for the Comprehensive tab';
