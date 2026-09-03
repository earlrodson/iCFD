---
schema_version: 1
id: postgres-debug-and-grant-hygiene
title: Leftover debug_whoami() RPC and overly-broad EXECUTE grants on admin-gated SECURITY DEFINER functions
type: defect
status: done
severity: low
owners: [earlrodson]
estimate_hours: 1.5
hours_logged: 1
created: 2026-09-02
updated: 2026-09-02
relates_to: [security-ddos-backdoor-audit]
---

## Description
Supabase's security advisor (`mcp__supabase__get_advisors`, type=security)
flags `public.debug_whoami()` as callable by the unauthenticated `anon`
role via `/rest/v1/rpc/debug_whoami` with zero auth gate — it returns
`current_user`/`auth.role()`, low-sensitivity but a clear leftover debug
endpoint reachable in production. Separately, nine other `SECURITY DEFINER`
functions (`get_all_users`, `get_geo_analytics`, `get_navigation_flow`,
`get_page_analytics`, `get_topic_analytics`, `get_user_activity_summary`,
`get_visitor_summary`, `handle_new_user`, `trigger_seed_ccc_paragraphs`)
have `EXECUTE` granted to `anon`/`authenticated` at the Postgres grant
level, even though each has a correct internal
`EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())` check (verified
by reading each function body) — confirmed not currently exploitable, but
worth tightening as defense-in-depth so a future edit to the function body
can't silently drop the internal check and expose data.

## Repro steps
1. Run `mcp__supabase__get_advisors(type=security)` — lists
   `anon_security_definer_function_executable` /
   `authenticated_security_definer_function_executable` for all 9 functions
   above, plus no advisory-level flag on `debug_whoami` itself (it's a
   plain `LANGUAGE sql` function, not `SECURITY DEFINER`, but it's still
   `EXECUTE`-granted to `anon` and has no internal guard).
2. `select pg_get_functiondef(oid) from pg_proc where proname = 'debug_whoami'`
   confirms no auth check in the function body.

## Root cause
- `debug_whoami()` is a debugging helper that was never dropped or
  restricted before shipping.
- The analytics/admin `SECURITY DEFINER` functions were created without an
  explicit `REVOKE EXECUTE FROM PUBLIC` / narrowed `GRANT EXECUTE TO`
  clause, so they inherited the default broad grant even though the
  function bodies already self-restrict via `auth.uid()` checks.

## Todos
- [x] Drop `debug_whoami()` (or, if still useful for local debugging,
      restrict it to `service_role` only) via a new migration
      (@earlrodson, est 0.5h, due 2026-09-02, done 2026-09-02)
- [x] Add `REVOKE EXECUTE ... FROM anon` (and `FROM authenticated` where
      the function is admin-only, e.g. `get_all_users`,
      `get_geo_analytics`, etc.) for the 9 flagged `SECURITY DEFINER`
      functions, keeping `GRANT EXECUTE TO authenticated` only where
      regular signed-in users legitimately need to call it
      (@earlrodson, est 0.75h, due 2026-09-02, done 2026-09-02)
- [x] Re-run `mcp__supabase__get_advisors(type=security)` after the
      migration and confirm the flags are cleared (@earlrodson, est 0.25h, due 2026-09-02, done 2026-09-02)

## Daily log
- 2026-09-02 (@earlrodson, 0h): Filed from Supabase security advisor
  output during [[security-ddos-backdoor-audit]]; read every flagged
  function's definition via `pg_get_functiondef` and confirmed the 9
  `SECURITY DEFINER` functions are not currently exploitable (internal
  `admins` role checks are correct) — this is hardening, not an active
  breach.
- 2026-09-02 (@earlrodson, 1h): Applied via `mcp__supabase__apply_migration`
  directly against the live project (user chose immediate apply over
  waiting for next deploy). First pass (`drop_debug_whoami_and_tighten_rpc_grants`)
  dropped `debug_whoami()` cleanly but `revoke execute ... from public`
  didn't remove the `anon` grants — Supabase grants EXECUTE explicitly per
  role (anon/authenticated/service_role), not via the `PUBLIC`
  pseudo-role, confirmed by querying `information_schema.routine_privileges`
  after the first migration still showed `anon` listed. Follow-up migration
  (`revoke_anon_execute_on_admin_only_rpc_functions`) revoked from `anon`
  directly and fully revoked `handle_new_user`/`trigger_seed_ccc_paragraphs`
  from both `anon` and `authenticated` (trigger-only, no RPC caller).
  Re-ran `get_advisors(type=security)`: `debug_whoami` and all
  `anon_security_definer_function_executable` entries are gone; the
  `authenticated_security_definer_function_executable` warnings on the 7
  admin functions remain by design (the admin UI calls them as
  `authenticated`, gated internally). Local migration files were created
  with different timestamps than what the MCP tool recorded in
  `supabase_migrations.schema_migrations` — renamed the local files
  (`20260902101103_...`, `20260902101131_...`) to match exactly so the
  next Vercel deploy's `db-push.mjs` doesn't see them as new/unapplied.

## Decisions & risks
- Not treating this as urgent (severity: low) since exploitation requires
  the internal role check to also be broken, which it currently isn't.
  Bundled with `debug_whoami` because both are fixed by the same kind of
  migration (grant/definition cleanup) in one pass.

## Links
- PR:
- Branch:
