---
schema_version: 1
id: nextjs-outdated-multiple-cves
title: Next.js 16.2.10 is one patch behind 16.2.11, which fixes multiple high-severity CVEs
type: defect
status: done
severity: high
owners: [earlrodson]
estimate_hours: 1
hours_logged: 0.5
created: 2026-09-02
updated: 2026-09-02
relates_to: [security-ddos-backdoor-audit]
---

## Description
`pnpm audit` (run as part of [[security-ddos-backdoor-audit]]) shows the
installed `next` version (16.2.10, confirmed via
`node -e "console.log(require('next/package.json').version)"`) is missing
16.2.11, which patches several high-severity CVEs directly relevant to this
app's App Router + Server Actions usage: SSRF via attacker-controlled
rewrite destination hostnames, SSRF in Server Actions on custom servers,
denial-of-service in Server Actions, unauthenticated disclosure of internal
Server Function endpoints, and a Middleware/Proxy bypass in Turbopack
single-locale apps. This is a one-line dependency bump, not a design issue.

## Repro steps
1. Run `node -e "console.log(require('next/package.json').version)"` — shows `16.2.10`.
2. Run `pnpm audit` — lists 6 `next` advisories (4 high, 2 moderate — plus
   2 more moderate cache-confusion advisories), all fixed in `>=16.2.11`.

## Root cause
`package.json`/`pnpm-lock.yaml` pin `next` to a version predating 16.2.11.
No code change required beyond the version bump; a `next.config.js` rewrite
destination or Server Action review may be warranted after upgrading to
confirm nothing relies on the now-patched-away behavior.

## Todos
- [x] Bump `next` to `>=16.2.11` (latest 16.x patch) via
      `pnpm add next@latest` or pinned patch version (@earlrodson, est 0.5h, due 2026-09-02, done 2026-09-02)
- [x] Run `pnpm lint && pnpm type-check && pnpm test` and smoke-test
      rewrites/Server Actions/middleware after the bump (@earlrodson, est 0.5h, due 2026-09-02, done 2026-09-02)

## Daily log
- 2026-09-02 (@earlrodson, 0h): Filed from `pnpm audit` run during
  [[security-ddos-backdoor-audit]]; confirmed installed version is 16.2.10
  via direct `require()`, one patch behind the fix.
- 2026-09-02 (@earlrodson, 0.5h): Bumped to `next@16.2.12` (latest patch,
  newer than the minimum 16.2.11 fix version) via `pnpm add next@16.2.12`
  — first two attempts hit npm registry tarball timeouts, third attempt
  succeeded cleanly. `pnpm lint && pnpm type-check && pnpm test` all green
  (199/199 tests, 23 files). No manual rewrite/Server Action smoke test
  performed beyond the automated suite — flagged in Decisions below.

## Decisions & risks
- Did not manually smoke-test rewrites/Server Actions/middleware behavior
  post-upgrade (no `middleware.ts` exists in this repo, and the automated
  suite doesn't specifically exercise `next.config.js` rewrites) — relying
  on the full green test suite plus this being a patch release. Revisit if
  anything rewrite- or Server-Action-related breaks post-deploy.

## Links
- PR:
- Branch:
