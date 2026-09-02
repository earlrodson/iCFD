-- Split geography analytics by CFD membership (user_settings.is_cfd_member)
-- so /admin/analytics can color/filter the map by member vs non-member.
-- Anonymous visitors (page_views.user_id IS NULL) are never members.

-- Return type is changing (new is_member column), so CREATE OR REPLACE
-- can't be used — Postgres requires the old signature dropped first.
DROP FUNCTION IF EXISTS get_geo_analytics(int);

CREATE FUNCTION get_geo_analytics(days_back int DEFAULT 30)
RETURNS TABLE(
  country         text,
  region          text,
  is_member       boolean,
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
    COALESCE(us.is_cfd_member, false) AS is_member,
    COUNT(*)::bigint AS view_count,
    COUNT(DISTINCT pv.visitor_id)::bigint AS unique_visitors
  FROM page_views pv
  LEFT JOIN user_settings us ON us.user_id = pv.user_id
  WHERE pv.created_at >= now() - (days_back || ' days')::interval
  GROUP BY COALESCE(pv.country, 'Unknown'), COALESCE(pv.region, ''), COALESCE(us.is_cfd_member, false)
  ORDER BY view_count DESC
  LIMIT 100;
END;
$$;
