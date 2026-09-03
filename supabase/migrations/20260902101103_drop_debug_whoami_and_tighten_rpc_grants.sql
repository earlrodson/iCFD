-- Security hardening from docs/specifications/postgres-debug-and-grant-hygiene.md
--
-- 1. debug_whoami() was a leftover debugging helper with no auth check,
--    callable by anyone (including anon) via /rest/v1/rpc/debug_whoami.
--    It only ever returned current_user/auth.role(), not sensitive data,
--    but it has no legitimate production use — drop it.
drop function if exists public.debug_whoami();

-- 2. The admin-only analytics/user functions already self-restrict via an
--    internal `EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())`
--    check, so this is defense-in-depth, not a fix for an active
--    exploit: revoke the default PUBLIC execute grant (which anon
--    inherits) and re-grant only to authenticated, since every caller in
--    app/admin/**/page.tsx invokes these via the session-scoped client.
revoke execute on function public.get_all_users() from public;
grant execute on function public.get_all_users() to authenticated;

revoke execute on function public.get_geo_analytics(integer) from public;
grant execute on function public.get_geo_analytics(integer) to authenticated;

revoke execute on function public.get_navigation_flow(integer) from public;
grant execute on function public.get_navigation_flow(integer) to authenticated;

revoke execute on function public.get_page_analytics(integer) from public;
grant execute on function public.get_page_analytics(integer) to authenticated;

revoke execute on function public.get_topic_analytics(uuid) from public;
grant execute on function public.get_topic_analytics(uuid) to authenticated;

revoke execute on function public.get_user_activity_summary() from public;
grant execute on function public.get_user_activity_summary() to authenticated;

revoke execute on function public.get_visitor_summary(integer) from public;
grant execute on function public.get_visitor_summary(integer) to authenticated;

-- 3. handle_new_user and trigger_seed_ccc_paragraphs are trigger functions
--    only ever invoked by their triggers (which don't require an EXECUTE
--    grant on the triggering role) — no code path calls them directly via
--    RPC, so revoke entirely rather than re-granting to authenticated.
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.trigger_seed_ccc_paragraphs() from public;
