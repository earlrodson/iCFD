-- Enable pg_net extension for async HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function called by trigger: extracts catechism paragraph numbers
-- from the saved topic and fires the Edge Function asynchronously
CREATE OR REPLACE FUNCTION trigger_seed_ccc_paragraphs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  paragraphs int[];
  fn_url     text;
BEGIN
  -- Only act if catechism field is non-null and non-empty
  IF NEW.catechism IS NULL OR jsonb_array_length(NEW.catechism) = 0 THEN
    RETURN NEW;
  END IF;

  -- Extract paragraph numbers as int array
  SELECT array_agg(v::int)
  INTO paragraphs
  FROM jsonb_array_elements_text(NEW.catechism) AS v;

  fn_url := current_setting('app.supabase_url', true)
            || '/functions/v1/seed-ccc-paragraphs';

  -- Fire-and-forget async HTTP POST — does not block the topic save
  PERFORM net.http_post(
    url     := fn_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body    := jsonb_build_object('paragraphs', to_jsonb(paragraphs))
  );

  RETURN NEW;
END;
$$;

-- Attach trigger: fires after every topic insert or update
DROP TRIGGER IF EXISTS on_topic_save_seed_ccc ON topics;
CREATE TRIGGER on_topic_save_seed_ccc
  AFTER INSERT OR UPDATE OF catechism ON topics
  FOR EACH ROW
  EXECUTE FUNCTION trigger_seed_ccc_paragraphs();
