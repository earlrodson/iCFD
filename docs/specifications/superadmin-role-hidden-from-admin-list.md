---
schema_version: 1
id: superadmin-role-hidden-from-admin-list
title: Add superadmin role for earlrodson@gmail.com, hidden from other admins in Users list
type: defect
status: done
severity: medium
owners: [earlrodson]
estimate_hours: 3
hours_logged: 3
created: 2026-09-01
updated: 2026-09-01
relates_to: [admin-role-grant-rls-missing]
---

## Description
`earlrodson@gmail.com` should hold a `superadmin` role with all the
capabilities of `admin`, but other admins must not see this account at all
when browsing `/admin/users` — today `admins.role` only allows
`admin | editor | presenter`, and `get_all_users()` returns every row to
any caller who is in the `admins` table, so a superadmin row would be fully
visible to every other admin.

## Repro steps
1. (Would-be repro once a `superadmin` row exists) Sign in as any non-super
   `admin`, open `/admin/users`.
2. The superadmin's row appears in the list alongside everyone else's, with
   no distinction preventing role edit/revoke actions from targeting it.

## Root cause
Two gaps, not yet built:
1. `admins.role` CHECK constraint (currently `admin | editor | presenter`,
   `supabase/migrations/20260808101155_presentations.sql`) has no
   `superadmin` value.
2. `get_all_users()` (`supabase/migrations/20260810010505_get_all_users_cfd_member.sql`)
   returns all `auth.users` joined to `admins` to any caller who has *any*
   row in `admins` — it has no notion of hiding specific rows from
   lower-privileged admins.

## Todos
- [x] Migration: widen `admins_role_check` to
      `admin | editor | presenter | superadmin`, then insert/upsert the
      `superadmin` row for `earlrodson@gmail.com` by looking up their
      `auth.users.id` (@earlrodson, est 1h, due 2026-09-01, done 2026-09-01)
- [x] Migration: update `get_all_users()` to exclude rows where
      `a.role = 'superadmin'` unless the calling `auth.uid()` is itself a
      superadmin (@earlrodson, est 1h, due 2026-09-01, done 2026-09-01)
- [x] `app/admin/users/page.tsx`: add `superadmin` to `UserRow['role']`,
      `ROLE_LABELS`, `ROLE_COLORS`; grant/edit dropdowns still only offer
      admin/editor/presenter — `superadmin` is not assignable from the UI
      (@earlrodson, est 0.5h, due 2026-09-01, done 2026-09-01)
- [x] Verify: applied migration live against project `gdobgalhdepfpxexssvq`;
      confirmed `admins` row for earlrodson@gmail.com has `role =
      'superadmin'`; `app/admin/layout.tsx` maps `superadmin` → `admin` for
      `AdminRole`/tab visibility so the account gets full admin UI access
      (@earlrodson, est 0.5h, due 2026-09-01, done 2026-09-01)

## Daily log
- 2026-09-01 (@earlrodson, 0h): Filed alongside
  [[admin-role-grant-rls-missing]] — the new API route that fix introduces
  is also where a self/role-escalation guard for `superadmin` should live.
- 2026-09-01 (@earlrodson, 3h): Applied migration
  `supabase/migrations/20260901000000_superadmin_role.sql` live (widened
  `admins_role_check`, upserted the superadmin row, updated
  `get_all_users()` to hide superadmin rows from non-superadmin callers).
  `GRANTABLE_ROLES` in `app/api/admin/users/route.ts` deliberately excludes
  `superadmin` so it can never be granted through the UI/API, only by a
  direct migration. `pnpm lint && pnpm type-check && pnpm test` all green.

## Decisions & risks
- Modeled as a new `role` enum value (`superadmin`) rather than a separate
  `is_superadmin` boolean column, so existing role-label/display logic in
  `app/admin/users/page.tsx` (`ROLE_LABELS`, `ROLE_COLORS`) extends
  naturally instead of needing a parallel badge path. Confirmed with user
  2026-09-01.
- The superadmin-granting API route must reject any request that would set
  `role = 'superadmin'` via the general grant/edit endpoint — that row
  should only ever be created by a direct migration, never through the
  admin UI, to avoid ordinary admins from ever generating another superadmin.

## Links
- PR:
- Branch:
