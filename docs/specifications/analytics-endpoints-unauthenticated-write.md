---
schema_version: 1
id: analytics-endpoints-unauthenticated-write
title: Analytics endpoints accept unauthenticated writes with no rate limit; duration endpoint has a guessable-ID write target
type: defect
status: implementing
severity: medium
owners: [earlrodson]
estimate_hours: 3
hours_logged: 1
created: 2026-09-02
updated: 2026-09-02
relates_to: [security-ddos-backdoor-audit]
---

## Description
`app/api/analytics/track/route.ts` (POST, inserts into `page_views`) and
`app/api/analytics/duration/route.ts` (POST, updates `page_views.duration_ms`)
both use `createAdminClient()` (service-role, bypasses RLS) and perform a
database write with **no auth/identity check at all** — this is intentional
for guest analytics, but it means: (1) `track` has no rate limiting, so
anyone can flood `page_views` with arbitrary rows; (2) `duration` accepts a
client-supplied `id` and updates whichever row has that `id`, with the only
guard being `is('duration_ms', null)` — `page_views.id` is `bigserial`
(sequential, per `drizzle/schema.ts:351`), so an attacker can enumerate ids
and overwrite other visitors' `duration_ms` before their real
`sendBeacon` fires, or race the real beacon.

## Repro steps
1. Read `app/api/analytics/track/route.ts` — no `auth.getUser()`/guard
   before the `createAdminClient().from('page_views').insert(...)` call
   (userId is looked up only to *attribute* the row, not to gate the write).
2. Read `app/api/analytics/duration/route.ts` — `id` comes straight from
   the request body (`body.id`), then `.eq('id', id).is('duration_ms', null)`
   with no check that `id` belongs to the caller's `visitor_id`/session.
3. `curl -X POST /api/analytics/duration -d '{"id": 1, "durationMs": 99999}'`
   against any low `id` would succeed if that row's `duration_ms` is still
   null, regardless of who created it.

## Root cause
Both routes were built for legitimate guest (unauthenticated) analytics
tracking, which is a reasonable product requirement — but neither added a
rate limit or an unguessable correlation token, so the "public by design"
tradeoff also opened an abuse surface (DDoS-shaped flooding on `track`, and
an IDOR-shaped cross-visitor write on `duration`).

## Todos
- [ ] Add a per-IP/per-visitor rate limit on `track` via Vercel Firewall
      rate-limiting rules scoped to `/api/analytics/track`,
      `/api/analytics/duration`, `/api/quiz` (POST), `/api/translate` —
      decided in [[security-ddos-backdoor-audit]] over in-route
      token-bucket, since Fluid Compute's multi-instance model means an
      in-memory limiter wouldn't be consistent anyway (@earlrodson, est 1h)
- [x] On `duration`, tie the update to the same `visitor_id` that created
      the row instead of trusting a bare `id` — client now echoes back the
      `visitorId` it already sends to `track`, and the update filter adds
      `.eq('visitor_id', visitorId)` (@earlrodson, est 1h, due 2026-09-02, done 2026-09-02)
- [x] Verify: `pnpm lint && pnpm type-check && pnpm test`, plus a manual
      check that legitimate track→duration flow still works end to end
      (@earlrodson, est 0.5h, due 2026-09-02, done 2026-09-02)

## Daily log
- 2026-09-02 (@earlrodson, 0h): Filed from the route-auth inventory done
  during [[security-ddos-backdoor-audit]]; confirmed `page_views.id` is
  `bigserial` (sequential) in `drizzle/schema.ts`, making the `duration`
  endpoint's id-only filter a cross-visitor write risk, not just a
  theoretical one.
- 2026-09-02 (@earlrodson, 1h): Fixed the IDOR half. Updated
  `components/analytics/PageTracker.tsx`'s `sendDuration` to include
  `visitorId` (already held in `localStorage`) in the beacon payload, and
  `app/api/analytics/duration/route.ts` now requires `visitorId` and adds
  `.eq('visitor_id', visitorId)` to the update filter — guessing a valid
  `id` alone no longer lets an attacker overwrite another visitor's
  `duration_ms`. Added `__tests__/unit/analytics-duration-route.test.ts`
  (3 tests: missing visitorId → 400, missing id → 400, update scoped to
  both `id` and `visitor_id`) since no test existed for this route before.
  Full suite green: `pnpm lint && pnpm type-check && pnpm test` (199/199).
  Rate-limiting the `track` flood vector is still open — depends on the
  Vercel Firewall rule setup, a dashboard/CLI action not yet done.

## Decisions & risks
- Not proposing to add auth to these endpoints — guest analytics tracking
  is the intended product behavior. The fix is scoping/rate-limiting the
  write, not gating it behind login.

## Links
- PR:
- Branch:
