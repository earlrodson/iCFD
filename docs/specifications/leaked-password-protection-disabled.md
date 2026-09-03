---
schema_version: 1
id: leaked-password-protection-disabled
title: Supabase Auth leaked-password protection (HaveIBeenPwned check) is disabled
type: defect
status: new
severity: low
owners: [earlrodson]
estimate_hours: 0.25
hours_logged: 0
created: 2026-09-02
updated: 2026-09-02
relates_to: [security-ddos-backdoor-audit]
---

## Description
`mcp__supabase__get_advisors(type=security)` reports
`auth_leaked_password_protection` disabled — Supabase Auth is not checking
new/changed passwords against the HaveIBeenPwned compromised-password
database, so users can set passwords already known to be breached
elsewhere.

## Repro steps
1. Run `mcp__supabase__get_advisors(type=security)` — see
   `auth_leaked_password_protection` WARN entry.

## Root cause
Project-level Supabase Auth setting was never enabled; this is a dashboard
toggle, not something set via migration.

## Todos
- [ ] Enable "Leaked password protection" in the Supabase dashboard
      (Authentication → Policies) for project `gdobgalhdepfpxexssvq`
      (@earlrodson, est 0.25h)
- [ ] Re-run `mcp__supabase__get_advisors(type=security)` and confirm the
      warning clears (@earlrodson, est 0h)

## Daily log
- 2026-09-02 (@earlrodson, 0h): Filed from Supabase security advisor
  output during [[security-ddos-backdoor-audit]].
- 2026-09-02 (@earlrodson, 0h): Checked for an MCP/API path to flip this
  programmatically — none of the available `mcp__supabase__*` tools expose
  project Auth config (no management-API config tool in this toolset), so
  this stays a manual step: Supabase Dashboard → project `gdobgalhdepfpxexssvq`
  → Authentication → Policies → enable "Leaked password protection". Left
  `status: new` since it wasn't actually applied.

## Decisions & risks
- 

## Links
- PR:
- Branch:
