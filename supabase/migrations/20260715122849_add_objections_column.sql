ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS objections JSONB DEFAULT '[]'::jsonb;
