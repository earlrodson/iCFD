---
schema_version: 1
id: certificate-sequential-serial-numbers
title: Sequential per-year certificate serial numbers (CFD-YYYY-###), race-safe
type: feature
status: done
priority: medium
owners: [earlrodson]
estimate_hours: 3
hours_logged: 3
created: 2026-09-18
updated: 2026-09-18
relates_to: [certificate-officer-fields]
---

## Description
Certificate `serial_code` is currently generated as
`CFD-{tier}-{Date.now().toString(36)}{random}` in
`lib/quiz/certificates.ts` — collision-resistant but not human-readable or
sequential. This feature replaces it with `CFD-{YYYY}-{NNN}` (e.g.
`CFD-2026-001`), incrementing per calendar year, while remaining safe when
multiple certificates are issued concurrently (e.g. two learners passing the
same path/tier at the same moment, or the admin bulk-mark-complete tool
issuing several at once).

## Traceability & Strategic Intent
- **Outcome Alignment:** Certificates are readable, referenceable, and
  auditable artifacts (nth certificate issued this year) rather than an
  opaque token.
- **Strategy Intent:** Learners who share/print/reference their certificate,
  and any future staff-facing "look up a certificate" flow.
- **Execution Intent:** Replace a non-sequential, timestamp-based serial with
  a per-year incrementing counter without introducing duplicate-serial risk
  under concurrent issuance.
- **Benefit Hypothesis:**
  - *By implementing:* an atomic, DB-enforced per-year counter
  - *We will improve:* serial readability/auditability and eliminate
    timestamp-collision-shaped serials
  - *As measured by:* zero duplicate `serial_code` values ever issued;
    serials readable/typeable by a human

## Product Context
- **Customer Context:** Learners viewing/downloading certificates from
  `/account`; no external verification UI exists yet (out of scope here).
- **Operating Context:** Next.js App Router + Supabase (Postgres). Serial
  generation happens server-side only, inside
  `issueCertificatesForCompletedPaths` (`lib/quiz/certificates.ts`), called
  from both the real quiz-submit flow (`app/api/quiz/route.ts`) and the admin
  testing tool (`app/api/admin/progress/route.ts`,
  `app/api/admin/progress/bulk/route.ts`) — the bulk endpoint is the
  highest-realistic-concurrency caller, since it can issue several
  certificates for different users in short succession.
- **Ecosystem Context:** No external APIs. Pure Postgres-side atomicity.
- **Regulatory Context:** None — serial format carries no PII.

## Behavior Specifications

```gherkin
Scenario: First certificate issued in a new year
  Given no certificate has been issued yet in 2026
  When a learner completes a path/tier and a certificate is issued
  Then the serial_code is "CFD-2026-001"

Scenario: Sequential increment within the same year
  Given "CFD-2026-001" was already issued
  When another certificate is issued later the same year
  Then the serial_code is "CFD-2026-002"

Scenario: Year rolls over
  Given the last certificate issued in 2026 was "CFD-2026-047"
  When a certificate is issued on or after 2027-01-01
  Then the serial_code is "CFD-2027-001"

Scenario: Two certificates issued concurrently never collide
  Given two issuance requests call the counter at effectively the same instant
  When both requests complete
  Then each receives a distinct, consecutive number
  And no two certificates ever share the same serial_code (enforced by a
    unique constraint on certificates.serial_code as a backstop, not just by
    correct counter logic)

Scenario: Bulk admin mark-complete issues several certificates in one request
  Given an admin bulk-marks every topic in a path as passed for one user
  When this results in certificates being issued for multiple paths in the
    same request
  Then each certificate gets its own distinct, correctly incrementing serial
```

## Acceptance criteria
- [x] New migration adds a `certificate_counters(year integer primary key,
      next_value integer not null default 1)` table and a
      `next_certificate_number(p_year integer) returns integer` Postgres
      function that atomically upserts-and-increments
      (`insert ... on conflict (year) do update set next_value =
      certificate_counters.next_value + 1 returning next_value`)
- [x] `certificates.serial_code` keeps (or gains, if not already present) a
      `unique` constraint — belt-and-suspenders backstop even though the
      counter function itself is race-safe
- [x] `issueCertificatesForCompletedPaths` calls the RPC and formats
      `CFD-{year}-{next_value zero-padded to 3 digits}` (e.g. `CFD-2026-001`);
      width grows naturally past 999 (`CFD-2026-1000`) rather than truncating
- [x] No app-level "count existing rows + 1" logic anywhere — the DB function
      is the only source of the next number
- [x] Existing already-issued certificates (old `CFD-{tier}-{timestamp}`
      format) are left untouched — this only changes generation going
      forward, no backfill/rename of historical serials
- [x] Unit test simulates concurrent-shaped calls to the RPC and asserts
      distinct, consecutive values; a real-Postgres-under-load concurrency
      test was judged out of proportion for this change (see Decisions &
      risks) — the atomicity guarantee comes from the DB function itself
- [x] `pnpm lint && pnpm type-check && pnpm test` green

## Todos
- [x] Write migration: `certificate_counters` table + `next_certificate_number` function (@earlrodson, est 1h, done 2026-09-18)
- [x] Confirm/add unique constraint on `certificates.serial_code` (@earlrodson, est 0.5h, done 2026-09-18)
- [x] Update `issueCertificatesForCompletedPaths` in `lib/quiz/certificates.ts` to call the RPC and format the new serial (@earlrodson, est 0.5h, done 2026-09-18)
- [x] Update `__tests__/unit/quiz-certificates.test.ts` with concurrency-shaped coverage (@earlrodson, est 1h, done 2026-09-18)

## Daily log
- 2026-09-18 (@earlrodson, 0h): Spec created — decided on per-year Postgres-sequence-backed counter over check-digit or ULID alternatives (see Decisions & risks) after discussing collision risk under concurrent certificate issuance.
- 2026-09-18 (@earlrodson, 3h): Implemented migration (`certificate_counters` table + `next_certificate_number` atomic upsert function, applied to production via `node scripts/db-push.mjs`, verified via two same-statement RPC calls returning 1 and 2, then reset the counter row so the first real 2026 certificate starts at 001), updated `lib/quiz/certificates.ts` to call the RPC and format `CFD-{year}-{n}`, added `certificateCounters` to `drizzle/schema.ts` and `certificate_counters`/`next_certificate_number` to `database.types.ts`, and extended `__tests__/unit/quiz-certificates.test.ts` with a distinct-consecutive-serials test and an RPC-failure test. Full quality gate green.

## Decisions & risks
- Rejected app-level `count(*) + 1`: read-then-write in app code has a race
  window between two concurrent requests; the atomic
  `INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING` pattern closes that
  window inside Postgres itself, since the second concurrent transaction
  blocks momentarily on the row-level update rather than reading a stale
  count.
- Rejected ULID-based serials (`CFD-2026-01HXYZ...`): no DB coordination
  needed, but pairs badly with a year prefix (ULIDs already encode a
  timestamp) and isn't meaningfully more human-readable/verifiable than a
  bare ULID — worst-of-both-worlds versus plain sequential.
- Check-digit suffix (`CFD-2026-001-7`) considered and deferred, not
  rejected: valuable if/when a public "verify this certificate" lookup form
  ships (catches transcription typos before hitting the DB), but no such
  form exists yet — adding it now would be speculative. Revisit if that
  verification flow is built.
- Per-year reset (not a single global running counter) was chosen to match
  the requested `CFD-YYYY-###` format and keep numbers small/readable long
  term, at the cost of the counter table needing one row per year (trivial
  growth, one row/year forever).
- Historical certificates keep their old `CFD-{tier}-{timestamp}` serial
  format — no backfill/migration of already-issued serials, since
  serial_code is immutable proof-of-issuance and rewriting past certificates
  would invalidate anything already shared/printed.

## Links
- PR:
- Branch:
