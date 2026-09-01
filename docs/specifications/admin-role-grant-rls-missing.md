---
schema_version: 1
id: admin-role-grant-rls-missing
title: Cannot grant/edit/revoke admin roles — no RLS write policy on admins table
type: defect
status: done
severity: high
owners: [earlrodson]
estimate_hours: 2
hours_logged: 2
created: 2026-09-01
updated: 2026-09-01
---

## Description
On `/admin/users`, clicking "+ Admin" (or "+ Editor" / "+ Presenter") on a
regular user fails with a row-level-security error instead of granting the
role. Editing an existing user's role or revoking access silently reports
success in the UI even though the underlying write is also rejected by RLS.

## Repro steps
1. Sign in as an existing admin and open `/admin/users`.
2. Find a regular user (no role badge) and click "+ Admin".
3. Observe the red error toast containing a Postgres RLS violation message
   (e.g. `new row violates row-level security policy for table "admins"`).
4. Separately, click the pencil icon on an existing admin/editor/presenter,
   change their role, and click the check button — the UI flashes "Role
   updated." even though the row does not change (no error is surfaced
   because `saveRoleEdit`/`revokeRole` in `app/admin/users/page.tsx` don't
   check `error` from the Supabase call at all).

## Root cause
`supabase/migrations/20260715085253_admins.sql` created the `admins` table
with RLS enabled and only a SELECT policy, with a comment claiming
inserts/deletes are "enforced via service role in admin panel." That was
never actually built — `app/admin/users/page.tsx`'s `grantRole`,
`saveRoleEdit`, and `revokeRole` all call `createClient()` (the
browser/session-scoped client, running as the `authenticated` role) directly
against `admins` for INSERT/UPDATE/DELETE. No such policy exists for any of
those operations, on any role, so every one of these calls is rejected by
RLS. `grantRole` surfaces the resulting error; `saveRoleEdit` and
`revokeRole` don't check `error` and misreport success.

Compare to `toggleCfdMember`, which correctly routes through
`/api/admin/users` (`app/api/admin/users/route.ts`) using the service-role
`createAdminClient()` after a server-side `requireAdmin()` check — the
pattern this should have followed from the start.

## Todos
- [x] Add `POST`/`PUT`/`DELETE` handling to `app/api/admin/users/route.ts`
      for grant/edit/revoke of `admins.role`, gated by the existing
      `requireAdmin()` helper (now also accepts `superadmin`), using
      `createAdminClient()` (@earlrodson, est 1h, due 2026-09-01, done 2026-09-01)
- [x] Update `grantRole`, `saveRoleEdit`, `revokeRole` in
      `app/admin/users/page.tsx` to call the new route instead of the
      browser client, and check `error`/response status on all three
      (@earlrodson, est 0.5h, due 2026-09-01, done 2026-09-01)
- [x] Verify: lint, type-check, and full test suite pass after the change
      (162/162); DB confirms the new routes are the only write path since
      `admins` still has no client-writable RLS policy (@earlrodson, est 0.5h,
      due 2026-09-01, done 2026-09-01)

## Daily log
- 2026-09-01 (@earlrodson, 0h): Filed after reproducing "+ Admin" failing
  with an RLS error; traced to missing INSERT/UPDATE/DELETE policies on
  `admins` and unchecked errors in two of the three mutation handlers.
- 2026-09-01 (@earlrodson, 2h): Added `POST`/`PUT`/`DELETE` to
  `app/api/admin/users/route.ts` (service-role, `requireAdmin`-gated,
  `GRANTABLE_ROLES` excludes `superadmin`); switched
  `app/admin/users/page.tsx`'s three mutation handlers to call it and
  surface real errors. `pnpm lint && pnpm type-check && pnpm test` all
  green.

## Decisions & risks
- Fixing this by adding a permissive RLS write policy on `admins` (instead
  of routing through the service-role API route) was considered and
  rejected — it would let any authenticated admin row grant itself or
  others arbitrary roles including a future `superadmin` value (see
  [[superadmin-role-hidden-from-admin-list]]) directly via the client,
  bypassing any self-escalation guard placed in the API route.

## Links
- PR:
- Branch:
