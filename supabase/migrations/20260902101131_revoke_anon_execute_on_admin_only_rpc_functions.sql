-- Follow-up to drop_debug_whoami_and_tighten_rpc_grants: Supabase grants
-- EXECUTE explicitly to anon/authenticated/service_role per-role (not via
-- the PUBLIC pseudo-role), so `revoke ... from public` in the prior
-- migration did not actually remove the anon grants -- verified via
-- information_schema.routine_privileges after applying it. Revoke from the
-- actual grantee roles this time.

revoke execute on function public.get_all_users() from anon;
revoke execute on function public.get_geo_analytics(integer) from anon;
revoke execute on function public.get_navigation_flow(integer) from anon;
revoke execute on function public.get_page_analytics(integer) from anon;
revoke execute on function public.get_topic_analytics(uuid) from anon;
revoke execute on function public.get_user_activity_summary() from anon;
revoke execute on function public.get_visitor_summary(integer) from anon;

-- Trigger-only functions: revoke from both anon and authenticated, no
-- direct RPC caller needs either.
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;
revoke execute on function public.trigger_seed_ccc_paragraphs() from anon;
revoke execute on function public.trigger_seed_ccc_paragraphs() from authenticated;
