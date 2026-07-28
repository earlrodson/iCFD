<!-- session-warm-start -->
<!--
  READ THIS FIRST at the start of every session.
  Then read .claude/snapshot.json (if present) for schema, edge functions, env map, and commands.
  Regenerate: pnpm run snapshot | pnpm run index
-->

## Session context

```yaml
project:  catholic-faith-defender (iCFD)
stack:    pnpm · Next.js (App Router) · TypeScript · Supabase (Postgres) + Drizzle · Tailwind · Zustand · Vitest + Playwright
snapshot: .claude/snapshot.json
```

## Commands (do not re-derive)

```bash
dev:       pnpm dev
lint:      pnpm lint
typecheck: pnpm type-check
test:      pnpm test
index:     pnpm run index      # runs `bun tools/vector-index.ts` — bun used only as the SQLite-capable script runner here, not as this project's package manager
search:    bun tools/vector-search.ts "<query>"
snapshot:  pnpm run snapshot
```

## Semantic search (use before grep)

```bash
bun tools/vector-search.ts "<query>"          # top 5 results
bun tools/vector-search.ts "<query>" --json   # machine-readable
```

**Rule:** use this before any grep, find, or Explore agent call.

<!-- /session-warm-start -->

# Project: catholic-faith-defender (iCFD)

## Stack

- Next.js (App Router) + TypeScript — `tsconfig.json`
- Package manager: **pnpm** (`pnpm-lock.yaml`, `pnpm-workspace.yaml`) — never use npm/yarn/bun here
- Styling: Tailwind
- DB: Supabase (Postgres) — schema tracked in `drizzle/schema.ts`. Migrations live in `supabase/migrations/*.sql` (canonical, CLI-managed) — `drizzle/migrations/*.sql` is legacy/historical only, see `drizzle/migrations/README.md`
- State: Zustand (`store/`)
- Tests: Vitest (unit) + Playwright (e2e)

## Commands

- `pnpm dev` / `pnpm build` / `pnpm start`
- `pnpm lint` — next lint
- `pnpm type-check` — tsc --noEmit
- `pnpm test` — vitest run; `pnpm test:watch` for watch mode
- `pnpm test:e2e` — playwright
- `pnpm test:all` — vitest + playwright
- `pnpm db:seed` — `scripts/seed.mjs` (topics/scripture/church_fathers/etc — NOT quiz_questions)

Quality gate before considering work done: `pnpm lint && pnpm type-check && pnpm test`.

## Supabase

- Live project ref: `gdobgalhdepfpxexssvq` (name "iCFD", region ap-northeast-1) — this is the one `.env.local` points to (`NEXT_PUBLIC_SUPABASE_URL`). There is a second, unrelated Supabase project on the same account (`ztwdlkbnvsgjuzrwplxm`, a loans/investors schema) — not this app, ignore it.
- Server-side admin access: `lib/supabase/admin.ts` (`createAdminClient`, service-role key, bypasses RLS) — API routes only, never client code.
- Client/session-aware access: `lib/supabase/server.ts` / `lib/supabase/client.ts`.

### Migrations (set up 2026-07-28)

- Canonical migration files: `supabase/migrations/*.sql`, reconstructed to exactly match the live project's `supabase_migrations.schema_migrations` history (verified via `supabase db push --dry-run` → "Remote database is up to date"). `drizzle/migrations/` is legacy/unused — never matched what was actually applied.
- New migration: add a `<timestamp>_<name>.sql` file to `supabase/migrations/` (or `pnpm exec supabase migration new <name>`). No local DB link/`supabase link` needed — pushes go straight via `--db-url`.
- Deploy: `pnpm run vercel-build` (`package.json`'s `vercel-build` script, auto-run by Vercel instead of `build`) does `supabase db push --db-url "$DATABASE_URL" --yes && next build --webpack` — migrations apply automatically on every deploy. **Requires `DATABASE_URL`** (same value as `.env.local`) to be set as a Vercel project env var.
- No GitHub Actions — deliberately kept migration-on-deploy inside the Vercel build step per user preference (2026-07-28), not a separate CI pipeline.
- Known risk (accepted, not fixed): `DATABASE_URL` points at the port-6543 PgBouncer transaction pooler. Supabase's own docs put migrations in the "use the direct connection" category (not transaction pooler) — `supabase db push` uses advisory locks that transaction-mode pooling can occasionally break (`prepared statement already exists` / lock errors). Tried adding a `DIRECT_DATABASE_URL` fallback (port 5432) as an escape hatch on 2026-07-28, but both the raw direct-connection host (IPv6-only, no route from this network) and the session-pooler host on port 5432 (TLS handshake hangs indefinitely, confirmed with a plain `psql` test independent of the Supabase CLI) failed to connect from this dev machine/network — inconclusive whether it's project-side (session pooler not provisioned) or local-network-side. Reverted; `vercel-build` uses plain `DATABASE_URL` only. If a real deploy ever fails with a lock/prepared-statement error, that's the known cause — revisit the direct/session-pooler connection from Vercel's network (not this one) before assuming it's broken the same way.

### Key tables (public schema, as of 2026-07-25)

| Table | Rows | Notes |
|---|---|---|
| `topics` | ~197 | Core content. Columns include large markdown (`answer_full`) — select only needed columns, don't `select *` when just checking metadata. |
| `ccc_paragraphs` | 2865 | Catechism. Fetched via PostgREST directly (`app/catechism/page.tsx`), not the admin client. Must paginate — a single request maxes out well under 2865 rows. |
| `scripture_verses` | ~69,835 | |
| `canons` | 1752 | |
| `church_documents` | 1305 | |
| `girm_articles` | 399 | |
| `topic_terms` | 385 | |
| `church_father_quotes` | 93 | |
| `theological_terms` | 90 | |
| `paths` / `path_topics` | 1 / 20 | Learning paths; `quiz_mode` (`sequential`/`agnostic`) gates quiz progression. |
| `quiz_settings` | 3 | One row per tier (`beginner`/`intermediate`/`advanced`) — `item_count`, `bank_size`, `pass_percent`. Seeded by migration `supabase/migrations/20260723092615_quiz_certificates.sql`. |
| `quiz_questions` | grows over time | `(topic_id, tier)` question bank. **Empty except where explicitly authored** — no seed script exists for this table by design (out of scope per user). |
| `quiz_attempts`, `course_progress`, `certificates`, `certificate_templates` | 0 | Quiz/certificate feature added 2026-07-23, largely unexercised so far. |
| `site_config` | 8 | RLS is disabled on this table (anon key can read/write every row) — **intentional, confirmed with user 2026-07-25**. Do not re-flag or "fix" this. |

Tiers are the string literals `'beginner' | 'intermediate' | 'advanced'` — duplicated in `app/api/quiz/route.ts` (`TIERS` const) and `app/quiz/[topicId]/[tier]/page.tsx` (`VALID_TIERS`). Keep in sync if ever changed.

## Token-efficiency notes

- Prefer this file over re-running `list_tables` / `information_schema` queries to rediscover schema.
- When pulling `topics` rows for content work, select specific columns (`id,title,answer,scripture,catechism,church_fathers,difficulty`) rather than `select *` — `answer_full` is long-form markdown and dominates token cost.
- Before starting `pnpm dev` for a smoke test, check for an already-running instance (`ps aux | grep "next dev"` or `lsof -i :3000`) — Next.js will fall back to another port and silently fail, wasting a round trip.
