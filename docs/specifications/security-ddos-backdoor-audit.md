---
schema_version: 1
id: security-ddos-backdoor-audit
title: Security audit — auth/RLS bypasses, DDoS exposure, backdoors, secret leakage
type: enabler
status: implementing
priority: high
owners: [earlrodson]
estimate_hours: 8
hours_logged: 3
created: 2026-09-02
updated: 2026-09-02
# target_date: YYYY-MM-DD
# prd_ref: docs/PRD.md#3
relates_to: [admin-role-grant-rls-missing, superadmin-role-hidden-from-admin-list]
---

## Description
A structured, repeatable security audit of the iCFD app covering four risk
categories: authentication/authorization bypasses (including RLS gaps),
DDoS/abuse exposure, backdoors (hidden roles, debug routes, hardcoded
credentials), and secret/data leakage. This is not a single fix — it's the
enabler that produces a findings inventory, each finding then filed as its
own `defect` item and linked back here via `relates_to`.

## Traceability & Technical Intent
- **Outcome / Strategy Alignment:** Protect user accounts, admin/superadmin
  privileges, and the Supabase-backed content pipeline before the app takes
  on more public traffic (quiz/certificate features are still lightly
  exercised per project CLAUDE.md, and prior audits already found real RLS
  gaps — see [[admin-role-grant-rls-missing]]).
- **Technical Intent:** No `middleware.ts` currently exists at the repo root
  — there is no centralized edge-level auth gate, rate limiting, or bot
  check in front of `app/api/**`. Auth/authorization is enforced ad hoc,
  per-route, via helpers like `requireAdmin()`. This audit verifies that
  pattern holds everywhere it should, rather than assuming it.
- **Benefit Hypothesis:**
  - *By implementing:* a full pass over every API route, RLS policy, and
    role-check path, plus a review of DDoS/bot exposure and secret handling
  - *We will improve:* confidence that no route/table is unintentionally
    writable, no hidden privilege-escalation path exists, and the app has a
    baseline defense against abusive traffic
  - *As measured by:* count of confirmed findings closed as `defect` items,
    zero unauthenticated write paths remaining on `app/api/admin/**`, and a
    documented decision on Vercel Firewall / rate limiting posture

## Platform & Operating Context
- **Ecosystem Context:** Next.js App Router on Vercel; Supabase Postgres
  with RLS as the primary data-access boundary; `lib/supabase/admin.ts`
  (service-role, bypasses RLS, must stay server-only) vs
  `lib/supabase/server.ts`/`client.ts` (session-scoped, RLS-enforced).
  `app/api/admin/**` currently spans users, quiz, certificates, board
  members, glossary, notifications, and several other resource types.
- **Operating Context:** Deployed via `pnpm run vercel-build`
  (migrations-on-deploy, see project CLAUDE.md); no separate CI security
  gate exists today.
- **Regulatory Context:** No formal compliance regime cited yet, but the app
  stores user profile data and issues certificates — treat PII and
  certificate integrity as in scope.

## Behavior Specifications

```gherkin
Scenario: Every admin API route rejects unauthenticated requests
  Given a request to any route under app/api/admin/**
  When it is made without a valid authenticated session
  Then the route responds with 401/403 and performs no mutation

Scenario: Every table with sensitive data has RLS enabled with no
  overly-permissive policy
  Given a Supabase table reachable from client-side code
  When its RLS policies are inspected via `get_advisors`/`list_tables`
  Then either RLS is enabled with policies scoped to the intended role,
    or the table is explicitly documented as an accepted exception
    (e.g. site_config, see project CLAUDE.md)

Scenario: No hardcoded secrets or service-role keys reach client bundles
  Given the built Next.js app and its source tree
  When searched for service-role keys, API tokens, or other secrets
  Then none are found outside server-only files (lib/supabase/admin.ts,
    API routes, and .env* files excluded from the client bundle)

Scenario: Public-facing routes have a baseline abuse defense
  Given app/api routes that accept unauthenticated POST traffic
    (e.g. quiz attempts, analytics tracking)
  When probed with a high-frequency request burst
  Then the app either rate-limits, relies on Vercel's platform-level DDoS
    mitigation, or the absence of additional protection is a documented,
    accepted risk rather than an oversight
```

## Acceptance criteria
- [x] Every route under `app/api/**` (not just `admin/**`) is inventoried
      with its auth requirement (public / session-authenticated / admin /
      superadmin) and confirmed against its actual guard code
- [x] Every Supabase table's RLS status is checked via
      `mcp__supabase__get_advisors` and `list_tables`; any table with RLS
      disabled or a write policy broader than intended is filed as a
      `defect` (or confirmed as an accepted exception already documented
      in CLAUDE.md, e.g. `site_config`)
- [x] Repo-wide search for hardcoded secrets, API keys, service-role tokens,
      or credentials committed to source (not `.env*`, which is gitignored)
      turns up nothing, or every hit is triaged
- [x] Search for backdoor-shaped code: hidden roles/flags, debug/test routes
      reachable in production, commented-out auth checks, default/weak
      credentials, or any `superadmin`-equivalent path not surfaced in the
      admin UI (cross-check against [[superadmin-role-hidden-from-admin-list]])
- [ ] Decision recorded on DDoS/abuse posture: whether to adopt Vercel
      Firewall / rate limiting on public POST endpoints (quiz attempts,
      analytics, translate) or explicitly accept platform-default
      protection as sufficient for current traffic — abuse surface
      identified and filed ([[analytics-endpoints-unauthenticated-write]]),
      but the Firewall-vs-in-route-rate-limit choice itself is still open
- [x] `pnpm audit` (or equivalent dependency vulnerability scan) run and
      any high/critical findings triaged
- [x] Every confirmed finding filed as its own `defect` spec with
      `relates_to: [security-ddos-backdoor-audit]`

## Todos
- [x] Inventory all `app/api/**` routes and their auth guards (@earlrodson, est 2h, due 2026-09-02, done 2026-09-02)
- [x] Run `mcp__supabase__get_advisors` (security + performance) and
      cross-check every table's RLS policies against `drizzle/schema.ts`
      (@earlrodson, est 2h, due 2026-09-02, done 2026-09-02)
- [x] Grep repo for hardcoded secrets/keys/tokens and confirm `.env*` files
      are gitignored and not present in git history (@earlrodson, est 1h, due 2026-09-02, done 2026-09-02)
- [x] Search for backdoor patterns: hidden role values, disabled/bypassed
      auth checks, debug-only routes, default credentials (@earlrodson, est 1.5h, due 2026-09-02, done 2026-09-02)
- [x] Run `pnpm audit` and triage any high/critical dependency vulnerabilities
      (@earlrodson, est 0.5h, due 2026-09-02, done 2026-09-02)
- [x] File each confirmed finding as a `defect` spec linked back here
      (@earlrodson, est 1h, due 2026-09-02, done 2026-09-02)
- [ ] Decide DDoS/abuse posture (Vercel Firewall vs. in-route rate limiting)
      for `app/api/analytics/*`, `app/api/quiz` POST, `app/api/translate`
      (@earlrodson, est 1.5h)

## Daily log
- 2026-09-02 (@earlrodson, 0h): Filed as an enabler to scope and track a
  structured security/DDoS/backdoor audit; no middleware.ts found at repo
  root (no centralized edge auth/rate-limit gate), noted as a likely audit
  finding rather than assumed to be a problem.
- 2026-09-02 (@earlrodson, 3h): Ran the audit. Route inventory (23
  `app/api/**/route.ts` files) found every admin/profile/quiz-scoring route
  properly auth-gated; only `app/api/analytics/track` and
  `app/api/analytics/duration` write via the service-role client with zero
  identity check, and `duration` keys its update off a guessable
  `bigserial` id — filed as
  [[analytics-endpoints-unauthenticated-write]]. Repo-wide secret/backdoor
  grep found nothing live (no tracked `.env*`, no hardcoded keys, no
  disabled auth checks, `superadmin` gating correct everywhere; one
  temp-anon-insert migration was reverted 14s after being added, non-issue).
  Supabase security advisors + `pg_get_functiondef` review found
  `debug_whoami()` as a genuine unauthenticated leftover debug RPC, plus 9
  `SECURITY DEFINER` functions with broader-than-needed `EXECUTE` grants
  (internal `admins` checks confirmed correct, so not currently
  exploitable) — filed as [[postgres-debug-and-grant-hygiene]]. Also filed
  [[leaked-password-protection-disabled]] (Supabase Auth setting) and
  [[nextjs-outdated-multiple-cves]] (installed Next.js 16.2.10 vs. patched
  16.2.11, which fixes SSRF/DoS/endpoint-disclosure/middleware-bypass
  CVEs — the highest-severity finding of the audit). `pnpm audit` also
  surfaced ~30 moderate/high transitive-dependency advisories (postcss,
  brace-expansion, undici, sharp, fast-uri, js-yaml, nanoid, browserslist,
  serialize-javascript) mostly in build-time tooling
  (next-pwa/workbox/tailwind chains) — not filed individually since they
  aren't runtime-reachable by user input, but worth a `pnpm update` pass
  as routine maintenance.

## Decisions & risks
- Findings from this audit are filed as separate `defect` items rather than
  tracked as todos here, so each gets its own severity, repro steps, and
  fix history — this file only tracks the audit process itself.
- Scope excludes penetration testing against the live production deployment
  without explicit sign-off; audit work here is static/code-level review
  plus local reproduction, per this session's security-testing constraints.
- Decided not to file individual `defect` items for the ~30 transitive
  build-tooling dependency advisories from `pnpm audit` (postcss,
  brace-expansion, undici, sharp, fast-uri, js-yaml, nanoid, browserslist,
  serialize-javascript) — none are reachable by untrusted user input at
  runtime (build-time/dev-tooling chains via next-pwa/workbox/tailwind).
  `next` itself was the one exception, filed separately given its direct
  runtime exposure. Revisit if `pnpm audit` severity on these grows or a
  reachability path is found.

## Links
- PR:
- Branch:
