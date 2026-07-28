-- Analytics: top topics by view count, optional user filter
CREATE OR REPLACE FUNCTION get_topic_analytics(filter_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  topic_id   text,
  title      text,
  lang       text,
  category   text,
  view_count bigint,
  reader_count bigint
)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    t.id                                           AS topic_id,
    t.title,
    t.lang,
    t.category,
    COUNT(DISTINCT vh.id)                          AS view_count,
    COUNT(DISTINCT vh.user_id)                     AS reader_count
  FROM topics t
  LEFT JOIN view_history vh
    ON vh.topic_id = t.id
    AND (filter_user_id IS NULL OR vh.user_id = filter_user_id)
  WHERE EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
  GROUP BY t.id, t.title, t.lang, t.category
  HAVING COUNT(DISTINCT vh.id) > 0
  ORDER BY view_count DESC
  LIMIT 100;
$$;

-- Analytics: per-user view summary (admin only)
CREATE OR REPLACE FUNCTION get_user_activity_summary()
RETURNS TABLE (
  user_id        uuid,
  email          text,
  topic_views    bigint,
  topics_read    bigint,
  last_active    timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    au.id                          AS user_id,
    au.email,
    COUNT(DISTINCT vh.id)          AS topic_views,
    COUNT(DISTINCT rp.id)          AS topics_read,
    MAX(vh.viewed_at)              AS last_active
  FROM auth.users au
  LEFT JOIN view_history vh ON vh.user_id = au.id
  LEFT JOIN read_progress rp ON rp.user_id = au.id
  WHERE EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
  GROUP BY au.id, au.email
  ORDER BY last_active DESC NULLS LAST;
$$;
