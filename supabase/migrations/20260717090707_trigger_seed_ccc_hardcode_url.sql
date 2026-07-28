CREATE OR REPLACE FUNCTION trigger_seed_ccc_paragraphs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  paragraphs int[];
BEGIN
  IF NEW.catechism IS NULL OR jsonb_array_length(NEW.catechism) = 0 THEN
    RETURN NEW;
  END IF;

  SELECT array_agg(v::int)
  INTO paragraphs
  FROM jsonb_array_elements_text(NEW.catechism) AS v;

  -- Fire-and-forget: does not block the topic save
  PERFORM net.http_post(
    url     := 'https://gdobgalhdepfpxexssvq.supabase.co/functions/v1/seed-ccc-paragraphs',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := jsonb_build_object('paragraphs', to_jsonb(paragraphs))
  );

  RETURN NEW;
END;
$$;
