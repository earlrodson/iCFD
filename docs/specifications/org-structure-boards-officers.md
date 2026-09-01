---
schema_version: 1
id: org-structure-boards-officers
title: Org hierarchy (National -> Diocese -> Chapter) with chapter assignment, boards, and officers
type: feature
status: implementing
priority: medium
owners: [earlrodson]
estimate_hours: 32
hours_logged: 16
created: 2026-09-01
updated: 2026-09-01
relates_to: [admin-role-grant-rls-missing, superadmin-role-hidden-from-admin-list]
---

## Description
Today `user_settings.chapter` and `user_settings.diocese` are free-text
strings with no backing table and no hierarchy (confirmed: no `dioceses`,
`chapters`, `parishes`, `schools`, `boards`, or `officers` tables exist
anywhere in the schema as of 2026-09-01). This feature introduces a real
org hierarchy (National -> Diocese -> Chapter, where a Chapter is either a
Parish or a School), lets users be assigned to the chapter they belong to
from a real lookup instead of typed text, and adds board membership +
officer-title management at each of the three levels, matching the
organization's actual governance structure.

## Traceability & Strategic Intent
- **Outcome Alignment:** Accurate org-wide membership data (who belongs to
  which chapter/diocese) and a real record of elected boards/officers,
  replacing free-text self-reporting that cannot be validated or reported on.
- **Strategy Intent:** National/diocese/chapter admins and officers who need
  to know their actual roster and leadership, not just individual member
  self-reports.
- **Execution Intent:** Add a proper org-hierarchy data model and admin
  tooling for chapter assignment, board rosters, and officer titles.
- **Benefit Hypothesis:**
  - *By implementing:* A real dioceses/chapters lookup, FK-based chapter
    assignment on users, and board/officer tables scoped per org level.
  - *We will improve:* Data integrity for org reporting (certificates,
    rosters, board counts) and eliminate free-text drift between what a user
    types and what the org actually recognizes as a chapter/diocese name.
  - *As measured by:* Zero orphaned/unmatched chapter or diocese text values
    after migration; board rosters never exceed bylaw caps.

## Product Context
- **Customer Context:** Site admins (national/diocese/chapter level) who
  currently cannot see a real org tree or board roster, only free-text
  fields typed by individual members.
- **Operating Context:** Supabase Postgres, migrations in
  `supabase/migrations/*.sql` (canonical per ADR-002), writes via
  service-role admin API routes per the existing `admins` table pattern
  (established in [[admin-role-grant-rls-missing]] to prevent
  client-writable self-escalation).
- **Ecosystem Context:** Reuses the existing `certificate_officer_names`
  free-text fields in `site_config` as the eventual consumer of officer
  data for certificate printing (not touched by this feature, but a natural
  follow-up once officer assignments are structured).
- **Regulatory Context:** None beyond the org's own bylaws (board seat caps
  are the org's stated governance rules and are admin-configurable, not a
  legal requirement hardcoded into the system).

## Behavior Specifications

```gherkin
Scenario: Admin assigns a chapter to a new diocese
  Given a diocese "Diocese of Example" exists
  When an admin creates chapter "St. Example Parish" under that diocese
  Then the chapter is available in the chapter picker for user assignment
  And the chapter cannot be created without selecting exactly one diocese

Scenario: User is assigned to their chapter
  Given chapters exist for the user's diocese
  When an admin (or the user, via profile) selects their chapter from the list
  Then user_settings.chapter_id is set to that chapter's id
  And the old free-text chapter/diocese fields are no longer the source of truth

Scenario: Board membership is capped by an admin-configured limit
  Given a chapter's Board of Trustees seat limit is set to 15
  And the board already has 15 members
  When an admin attempts to add a 16th board member
  Then the request is rejected with a clear over-capacity error

Scenario: Admin changes the seat limit for a level
  Given the Diocese level board seat limit is 15
  When an admin updates it to 18 via the seat-limit settings UI
  Then dioceses can now hold up to 18 board members
  And an admin cannot set a limit lower than any org unit's current
    membership count at that level

Scenario: Officer title requires prior board membership
  Given a user is not yet a board member of a given diocese
  When an admin attempts to assign them the "President" office at that diocese
  Then the assignment is rejected until the user is first added to that
    diocese's Board of Stewards

Scenario: One office per person, one person per office, per level
  Given "Jane" already holds "Treasurer" at the National level
  When an admin attempts to also assign Jane "Secretary" at the National level
  Then the assignment is rejected (one office per person per level)
  And when an admin attempts to assign "Treasurer" to a second person at
    the National level while Jane still holds it
  Then that assignment is also rejected until Jane's office is cleared first
```

## Acceptance criteria
- [ ] `dioceses` table exists; each has a name and is the direct parent of
      the National level (single National org is implicit, not a row).
- [ ] `chapters` table exists; each chapter has a `type` (`parish` |
      `school`), belongs to exactly one diocese (`diocese_id` FK, not null),
      and a name.
- [ ] `user_settings` gains a `chapter_id` FK (nullable) to `chapters`;
      existing free-text `chapter`/`diocese` columns are left in place
      (not dropped) for backward compatibility/manual reconciliation.
- [x] Admin UI exists to create/edit/list dioceses and chapters
      (`/admin/organization` or similar), with chapters grouped/filterable
      by diocese.
- [x] User profile editor and/or admin user-management page lets an
      admin (and/or the user) pick their chapter from a real dropdown
      (grouped by diocese via `<optgroup>`) instead of typing free text.
- [ ] A single `board_members` table records board membership at all three
      levels (`level`: `national` | `diocese` | `chapter`), scoped by
      `diocese_id` (diocese level) or `chapter_id` (chapter level), null for
      national.
- [ ] A `board_seat_limits` table holds one admin-editable `max_seats`
      value per `level` (`national` | `diocese` | `chapter`), seeded by
      migration with the org's current defaults: National Board of
      Governors 21, Diocese Board of Stewards 15, Parish/School Board of
      Trustees 15. Limits are per-level, not per individual diocese/chapter
      instance.
- [ ] Board seat caps are enforced server-side (DB trigger reading the
      current `max_seats` for that level from `board_seat_limits`, not a
      hardcoded number) on every `board_members` INSERT.
- [x] Admin UI exists to view/edit each level's `max_seats`; lowering a
      limit below an org unit's current member count at that level is
      rejected with a clear error rather than silently truncating a roster.
- [ ] `board_members.office` (nullable) holds one of: Spiritual Adviser,
      Theological Adviser, Adviser, President, Internal Vice President,
      External Vice President, Secretary, Treasurer, Auditor, PIO.
- [ ] Assigning an office requires the target user already be a board
      member at that exact level/org unit (enforced by the office column
      living on the same `board_members` row created at election time —
      no separate officer table to drift out of sync).
- [ ] Uniqueness enforced per level+org unit: one office held by at most one
      person, and (implied by one row per user per org unit) one office
      held by at most one office-slot per person.
- [x] Admin UI exists to manage a board roster per org unit (add/remove
      board members up to the cap) and assign/clear officer titles from
      existing board members only.
- [x] All new tables have RLS enabled: open SELECT (needed for org
      pickers/roster display), admin-only ALL via an `EXISTS (SELECT 1 FROM
      admins WHERE admins.user_id = auth.uid())` policy — the same pattern
      used for `paths`/`topics`/`presentations`, not the service-role-only
      pattern from [[admin-role-grant-rls-missing]] (that pattern applies
      specifically to the `admins` table itself, to block role
      self-escalation; board membership/office assignment carries no such
      risk and is additionally guarded by DB-level constraints regardless
      of write path — see Decisions & risks).
- [x] `pnpm lint && pnpm type-check && pnpm test` pass after each migration
      and UI change (also verified with a full `pnpm build` after the admin
      UI pages were added).

## Todos
- [x] Migration: `dioceses` (id, name, created_at) and `chapters` (id, name,
      type CHECK in ('parish','school'), diocese_id FK not null, created_at)
      (@earlrodson, est 2h, due 2026-09-01, done 2026-09-01)
- [x] Migration: add `chapter_id uuid` FK (nullable) to `user_settings`
      (@earlrodson, est 1h, due 2026-09-01, done 2026-09-01)
- [x] Migration: `board_members` table (id, level CHECK in
      ('national','diocese','chapter'), diocese_id nullable FK, chapter_id
      nullable FK, user_id, office nullable CHECK in the 10 office values,
      created_at) with a CHECK ensuring diocese_id/chapter_id nullability
      matches `level`, partial unique indexes for (a) one board row per
      user per org unit per level and (b) one office per org unit per level
      (@earlrodson, est 3h, due 2026-09-01, done 2026-09-01)
- [x] Migration: `board_seat_limits` table (level CHECK in
      ('national','diocese','chapter'), unique, max_seats int not null),
      seeded with national=21, diocese=15, chapter=15 (@earlrodson, est 1h,
      due 2026-09-01, done 2026-09-01)
- [x] Migration: trigger function enforcing per-level board seat caps by
      reading `max_seats` from `board_seat_limits` for that level on INSERT
      into `board_members`, plus a second trigger blocking a `max_seats`
      decrease below any org unit's current roster size (@earlrodson,
      est 2h, due 2026-09-01, done 2026-09-01)
- [x] RLS: enable on `dioceses`, `chapters`, `board_members`,
      `board_seat_limits`; open SELECT, admin-only write via the
      `EXISTS (admins)` policy pattern (@earlrodson, est 1h, due
      2026-09-01, done 2026-09-01)
- [x] API routes (`getAdminClient()`-gated, same pattern as
      `history-presidents`/`glossary`): CRUD for dioceses/chapters;
      add/remove board member; assign/clear officer (rejecting non-board-
      members and duplicate offices — the office CHECK/unique indexes give
      a DB-level backstop, but the API returns a clear error rather
      than surface a raw constraint violation); update a level's
      `max_seats` (@earlrodson, est 5h, due 2026-09-01, done 2026-09-01)
- [x] Admin UI: `/admin/organization` page to manage dioceses and chapters
      (@earlrodson, est 4h, due 2026-09-01, done 2026-09-01)
- [x] Admin UI: chapter picker (grouped by diocese via `<optgroup>`) wired
      into user management, writing `chapter_id` (@earlrodson, est 3h, due
      2026-09-01, done 2026-09-01)
- [x] Admin UI: board & officer management page per org unit — roster with
      cap indicator (showing the current admin-configured limit), add/
      remove member, assign/clear office dropdown restricted to current
      board members and unfilled offices (@earlrodson, est 5h, due
      2026-09-01, done 2026-09-01)
- [x] Admin UI: seat-limit settings panel (edit `max_seats` per level)
      (@earlrodson, est 2h, due 2026-09-01, done 2026-09-01) — built as a
      panel at the top of `/admin/boards` rather than a separate page/route,
      since it's small and always relevant alongside the roster it governs.
- [x] Tests: Vitest coverage for cap enforcement, office-requires-board-
      membership, one-office-per-person/one-person-per-office constraints
      (@earlrodson, est 3h, due 2026-09-01, done 2026-09-01)

## Daily log
- 2026-09-01 (@earlrodson, 0h): Filed after confirming via codebase
  investigation that no org-hierarchy, board, or officer concept exists
  today — only free-text `chapter`/`diocese` strings on `user_settings` and
  an unrelated free-text `certificate_officer_names` pair in `site_config`.
- 2026-09-01 (@earlrodson, 0h): Corrected Diocese board cap from 21 to 15
  and reworked all board seat caps to be admin-configurable per level via a
  new `board_seat_limits` table instead of hardcoded 21/21/15 constants.
- 2026-09-01 (@earlrodson, 4h): Applied migration
  `supabase/migrations/20260901060000_org_structure_boards_officers.sql`
  live against project `gdobgalhdepfpxexssvq` (via `mcp__supabase__apply_migration`
  — the standard `node scripts/db-push.mjs` session-pooler connection timed
  out from this environment, so the migration was applied through the
  Supabase MCP tool instead; the file is already committed under
  `supabase/migrations/` for future `db push` runs to pick up as a no-op).
  Created `dioceses`, `chapters`, `board_seat_limits` (seeded
  national=21/diocese=15/chapter=15), `board_members`; added
  `user_settings.chapter_id`. Verified live: all 4 tables exist with RLS
  enabled, seat limits seeded correctly. Added matching Drizzle definitions
  to `drizzle/schema.ts` (dioceses, chapters, boardSeatLimits, boardMembers,
  `user_settings.chapter_id`, plus `BOARD_LEVELS`/`OFFICES` const arrays and
  inferred row types). `pnpm lint && pnpm type-check && pnpm test` all
  green (162/162).
- 2026-09-01 (@earlrodson, 3h): Regenerated `lib/supabase/database.types.ts`
  from the live project (`mcp__supabase__generate_typescript_types`) so the
  new tables are typed. Added 4 API routes under `app/api/admin/`
  (`dioceses`, `chapters`, `board-seat-limits`, `board-members`), following
  the `getAdminClient()` session-client pattern from
  `history-presidents`/`glossary` (not `requireAdmin()`+`createAdminClient()`
  — that heavier pattern is reserved for tables with no client-writable RLS,
  which doesn't apply here per the RLS decision already logged). Routes map
  Postgres error codes to friendly messages: `23505` (unique violation) on
  `board_members` insert/update → "already on this board" / "already holds
  this office"; `P0001` (trigger `RAISE EXCEPTION`) on `board_members`
  insert → seat-cap message passed through; `P0001` on `board_seat_limits`
  update → below-roster message passed through; `23503` (FK violation) on
  diocese/chapter delete → "still has chapters/users assigned" instead of a
  raw Postgres error. Added Vitest coverage for `board-members` and
  `board-seat-limits` routes (19 new tests: auth gating, validation, and all
  three error-code mappings above) — `dioceses`/`chapters` are plain CRUD
  mirroring the already-untested `history-presidents`/`glossary` routes, so
  left untested per existing convention. `pnpm lint && pnpm type-check &&
  pnpm test` all green (181/181).
- 2026-09-01 (@earlrodson, 7h): Built the admin UI. Added a migration
  (`20260901070000_get_all_users_chapter.sql`, applied live) extending the
  `get_all_users()` SECURITY DEFINER function to also return `chapter_id`/
  `chapter_name` via a `LEFT JOIN chapters`, so `/admin/users` can display
  and edit a user's chapter without a second round trip; regenerated
  `database.types.ts` for the new return shape. Extended
  `app/api/admin/users` PATCH to also accept `chapter_id` (nullable,
  upserts into `user_settings` alongside the existing `is_cfd_member`
  field). Built three UI surfaces: (1) `/admin/organization` — dioceses
  list with inline expand/edit/delete, each expanded diocese showing its
  chapters with inline add/edit/delete, following the `history-presidents`/
  `glossary` page conventions (no modals, plain Tailwind + `.field`
  utility class, no component library — none exists in this codebase); (2)
  a "Change chapter"/"Assign chapter" entry added to the existing per-user
  kebab menu on `/admin/users`, showing a native `<select>` grouped by
  diocese via `<optgroup>` (no combobox/search component exists in the
  codebase to reuse, and a grouped native select was judged sufficient
  given the likely org size); (3) `/admin/boards` — a new page with a seat-
  limit panel (edit `max_seats` per level inline) at the top, a level
  tab-switcher (National/Diocese/Chapter) with a diocese/chapter picker
  when applicable, a roster list per org unit showing a cap indicator
  (`N/max`), per-row office assignment (`<select>` disabling offices
  already held by someone else on that same roster), remove-member, and an
  add-member picker (drawn from `get_all_users()` via the same
  `rpc('get_all_users')` call `/admin/users` already uses, filtered to
  exclude users already on the roster). Registered both new pages in
  `ADMIN_TABS` (`app/admin/layout.tsx`) as "Organization" and "Boards".
  Verified: `pnpm lint && pnpm type-check && pnpm test` all green
  (181/181, no new tests needed — no new business logic, only UI wiring
  against already-tested API routes); `pnpm build` completed cleanly with
  both new routes appearing in the route manifest. Not verified in an
  actual browser session (no interactive browser available in this
  environment) — only build-time compilation and `curl` 200-status checks
  against the already-running dev server were done; a manual click-through
  (add/remove board member, assign/clear office, cap rejection, chapter
  picker) is still recommended before considering this feature
  release-ready.

## Todos
- [x] Migration: trigger on `user_settings` rejecting non-service-role
      INSERT/UPDATE that sets or changes `chapter`, `diocese`, `chapter_id`,
      or `is_cfd_member` — closes the self-escalation gap where RLS's
      `auth.uid() = user_id` check permits a user to write any column on
      their own row (@earlrodson, est 1h, due 2026-09-01, done 2026-09-01,
      applied live and confirmed via `pg_trigger` — see Daily log)
- [x] `components/account/ProfileEditor.tsx`: remove the editable chapter/
      diocese inputs; display chapter + diocese read-only, resolved from
      `chapter_id` (@earlrodson, est 1h, due 2026-09-01, done 2026-09-01)

## Decisions & risks
- Single `board_members` table (not separate tables per level, and not a
  separate `officers` table) — office lives as a column on the same row
  created at election time, so "must be a board member before holding
  office" falls out of the schema for free instead of needing a foreign-key
  check across two tables. Confirmed with user 2026-09-01.
- Board seat caps and one-office rules are hard-enforced server-side (DB
  trigger + unique indexes / API validation), not just soft UI warnings —
  confirmed with user 2026-09-01.
- Seat caps are admin-configurable per level via `board_seat_limits`
  (national=21, diocese=15, chapter=15 defaults) rather than hardcoded
  constants — corrected 2026-09-01 (diocese cap corrected from an earlier
  21 to 15) and made dynamic per user request so an admin can change any
  level's limit without a migration. Limits are per-level (one row per
  `national`/`diocese`/`chapter`), not per individual diocese/chapter
  instance — every diocese shares the same configurable cap, and likewise
  for every chapter.
- Write pattern for the new tables uses client-writable RLS gated by an
  `EXISTS (admins)` check (like `paths`/`topics`/`presentations`), not
  service-role-only API routes. This differs from the pattern documented in
  [[admin-role-grant-rls-missing]], but that decision was specifically
  about the `admins` table itself (role grants, self-escalation risk to
  `superadmin`). Board membership/office assignment has no analogous
  escalation path, and the seat-cap and one-office-per-org-unit invariants
  are enforced by DB triggers/unique indexes regardless of write path, so
  the simpler RLS-only pattern was used instead. A future API-route layer
  (see remaining Todos) still exists for clearer error messages than a raw
  constraint violation, not because the DB is otherwise unprotected.
- Existing free-text `user_settings.chapter`/`diocese` columns are left in
  place rather than dropped/backfilled in this pass — reconciling existing
  self-reported text against the new `chapters` lookup (fuzzy matching,
  admin review) is out of scope here and should be filed as a follow-up
  defect/enabler once real chapters exist to match against.
- Risk: seeding the initial diocese/chapter list (national org's real
  dioceses and parishes/schools) is a data-entry task, not a migration —
  needs a CSV/manual admin pass after the schema ships, not before.
- Risk: the admin UI (`/admin/organization`, `/admin/boards`, and the
  chapter picker on `/admin/users`) has only been verified via
  `pnpm build`/`pnpm lint`/`pnpm type-check`/`pnpm test` and `curl`
  status-code checks against the dev server — no interactive browser was
  available in the implementation environment. A manual click-through
  (create a diocese/chapter, assign a user's chapter, add/remove a board
  member, hit the seat cap, assign/clear an office, lower a seat limit
  below roster size) should happen before this moves past `implementing`.
- 2026-09-01 (@earlrodson, 2h): User flagged after reviewing the earlier
  self-escalation risk note: users must not be able to set their own
  chapter/diocese/membership status — these should only ever reflect what
  an admin sets, connected end-to-end. Wrote
  `supabase/migrations/20260901080000_user_settings_admin_only_membership_fields.sql`
  — a `BEFORE INSERT OR UPDATE` trigger on `user_settings` that raises an
  exception if a non-`service_role` write sets/changes `chapter`,
  `diocese`, `chapter_id`, or `is_cfd_member` (mirrors the existing
  `auth.role() = 'service_role'` pattern already used in
  `20260715113747_005_push_subscriptions.sql`). Removed the editable
  chapter/diocese inputs from `ProfileEditor.tsx` entirely — the profile
  page now only *displays* chapter/diocese, resolved live from
  `user_settings.chapter_id` via a new `fetchChapterWithDiocese()` helper
  in `lib/supabase/sync.ts` (reads `chapters`/`dioceses` directly with the
  session client, since those tables already have open SELECT RLS).
  `saveProfileToCloud()` no longer accepts `chapter`/`diocese` at all.
  `pnpm lint && pnpm type-check && pnpm test` all green (181/181).
  Applying the migration required several retries: both `apply_migration`
  (MCP) and `db-push.mjs`/direct `supabase` CLI/raw `psql` against the
  session-pooler host failed repeatedly this session — TCP handshake
  succeeded (confirmed via `nc`) but the actual Postgres protocol
  connection hung indefinitely, pointing to a sandbox-level restriction on
  direct outbound Postgres connections rather than a Supabase-side issue.
  `apply_migration` eventually succeeded on a later retry; trigger
  confirmed live via `pg_trigger` (`tgenabled = 'O'`).
- No combobox/searchable-select component exists anywhere in this
  codebase (checked `components/ui/`, `package.json` deps, and every
  existing admin dropdown) — the chapter pickers use a native `<select>`
  with `<optgroup>` grouping by diocese instead of a fuzzy-search
  combobox as the spec's Gherkin originally implied. Acceptable at current
  org scale; revisit if the diocese/chapter count grows large enough that
  scrolling a native select becomes unwieldy.

## Links
- PR:
- Branch:
