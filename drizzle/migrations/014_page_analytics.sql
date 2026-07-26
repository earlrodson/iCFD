-- Page-level analytics: per-pageview log used to answer "where do users go",
-- "how long do they stay", per-page (micro) and site-wide (general) reporting,
-- coarse location, and guest-vs-account visitor split for /admin/analytics.
--
-- visitor_id is a client-generated UUID persisted in localStorage — stable
-- across an anonymous visitor's whole history, and still the join key after
-- they sign in (user_id gets attached from that point on). No raw IP is ever
-- stored, only the coarse country/region resolved server-side at write time.

CREATE TABLE IF NOT EXISTS page_views (
  id            bigserial PRIMARY KEY,
  visitor_id    uuid NOT NULL,
  user_id       uuid,
  path          text NOT NULL,
  referrer_path text,
  country       text,
  region        text,
  device_type   text CHECK (device_type IN ('mobile', 'tablet', 'desktop')),
  duration_ms   integer CHECK (duration_ms >= 0),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS page_views_path_idx ON page_views (path);
CREATE INDEX IF NOT EXISTS page_views_created_at_idx ON page_views (created_at);
CREATE INDEX IF NOT EXISTS page_views_visitor_created_idx ON page_views (visitor_id, created_at);
CREATE INDEX IF NOT EXISTS page_views_user_id_idx ON page_views (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS page_views_country_idx ON page_views (country);

-- RLS enabled with zero policies: no anon/authenticated access at all. All
-- reads/writes go through service-role code (API routes, SECURITY DEFINER
-- RPCs below) — same lockdown as quiz_attempts/course_progress.
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- ── Micro-level: per-page views, unique visitors, avg time on page ──────────

CREATE OR REPLACE FUNCTION get_page_analytics(days_back int DEFAULT 30)
RETURNS TABLE(
  path                text,
  view_count          bigint,
  unique_visitors     bigint,
  avg_duration_seconds numeric
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    pv.path,
    COUNT(*)::bigint AS view_count,
    COUNT(DISTINCT pv.visitor_id)::bigint AS unique_visitors,
    ROUND(AVG(pv.duration_ms) FILTER (WHERE pv.duration_ms IS NOT NULL)::numeric / 1000.0, 1) AS avg_duration_seconds
  FROM page_views pv
  WHERE pv.created_at >= now() - (days_back || ' days')::interval
  GROUP BY pv.path
  ORDER BY view_count DESC
  LIMIT 50;
END;
$$;

-- ── General-level: where visitors go next (top path → path transitions) ────

CREATE OR REPLACE FUNCTION get_navigation_flow(days_back int DEFAULT 30)
RETURNS TABLE(
  from_path         text,
  to_path           text,
  transition_count  bigint
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  WITH ordered AS (
    SELECT
      pv.path,
      LEAD(pv.path) OVER (PARTITION BY pv.visitor_id ORDER BY pv.created_at) AS next_path
    FROM page_views pv
    WHERE pv.created_at >= now() - (days_back || ' days')::interval
  )
  SELECT ordered.path AS from_path, ordered.next_path AS to_path, COUNT(*)::bigint AS transition_count
  FROM ordered
  WHERE ordered.next_path IS NOT NULL AND ordered.next_path <> ordered.path
  GROUP BY ordered.path, ordered.next_path
  ORDER BY transition_count DESC
  LIMIT 25;
END;
$$;

-- ── Location: coarse country/region breakdown ───────────────────────────────

CREATE OR REPLACE FUNCTION get_geo_analytics(days_back int DEFAULT 30)
RETURNS TABLE(
  country         text,
  region          text,
  view_count      bigint,
  unique_visitors bigint
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(pv.country, 'Unknown') AS country,
    COALESCE(pv.region, '') AS region,
    COUNT(*)::bigint AS view_count,
    COUNT(DISTINCT pv.visitor_id)::bigint AS unique_visitors
  FROM page_views pv
  WHERE pv.created_at >= now() - (days_back || ' days')::interval
  GROUP BY COALESCE(pv.country, 'Unknown'), COALESCE(pv.region, '')
  ORDER BY view_count DESC
  LIMIT 50;
END;
$$;

-- ── Guest vs. account visitor split + overall time-on-site ──────────────────

CREATE OR REPLACE FUNCTION get_visitor_summary(days_back int DEFAULT 30)
RETURNS TABLE(
  guest_visitors      bigint,
  registered_visitors bigint,
  guest_views         bigint,
  registered_views    bigint,
  avg_visit_duration_seconds numeric,
  total_views         bigint
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  WITH scoped AS (
    SELECT * FROM page_views WHERE created_at >= now() - (days_back || ' days')::interval
  ),
  visitor_kind AS (
    SELECT visitor_id, BOOL_OR(user_id IS NOT NULL) AS is_registered
    FROM scoped
    GROUP BY visitor_id
  ),
  visitor_totals AS (
    SELECT visitor_id, SUM(duration_ms) AS total_ms
    FROM scoped
    WHERE duration_ms IS NOT NULL
    GROUP BY visitor_id
  )
  SELECT
    COUNT(*) FILTER (WHERE NOT vk.is_registered)::bigint AS guest_visitors,
    COUNT(*) FILTER (WHERE vk.is_registered)::bigint AS registered_visitors,
    (SELECT COUNT(*) FROM scoped s JOIN visitor_kind k ON k.visitor_id = s.visitor_id WHERE NOT k.is_registered)::bigint AS guest_views,
    (SELECT COUNT(*) FROM scoped s JOIN visitor_kind k ON k.visitor_id = s.visitor_id WHERE k.is_registered)::bigint AS registered_views,
    ROUND((SELECT AVG(vt.total_ms) FROM visitor_totals vt)::numeric / 1000.0, 1) AS avg_visit_duration_seconds,
    (SELECT COUNT(*) FROM scoped)::bigint AS total_views
  FROM visitor_kind vk;
END;
$$;
