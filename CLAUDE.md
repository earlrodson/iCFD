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

## Theology RAG (content-generation retrieval, added 2026-07-30)

Separate local vector index over the theology corpus (`ccc_paragraphs`, `canons`, `girm_articles`,
`church_documents`, `church_father_quotes`) — used to ground AI-assisted topic generation in real
source text instead of relying on model memory. Not related to the codebase search index above.
See `documents/VerifyArchitecture/content-generation-architecture-proposal.md` for the full pipeline.

```bash
index:theology:  pnpm run index:theology   # bun tools/vector-index-theology.ts — pulls from Supabase, embeds via local Ollama nomic-embed-text
search:theology: bun tools/vector-search-theology.ts "<query>" [--top N] [--json]
```

### Local LLM use in this project (qwen3:14b + qwen3.5:9b, confirmed 2026-08-03)

`tools/generate-topic.ts` is the real, working reference for the split — **generate vs. extract**, not short vs. long:
- **`qwen3:14b`** — Phase 2 only: the 1500-2500 word retrieval-grounded comprehensive answer. Any task that composes new prose belongs here, regardless of length (quiz-item drafting tested 2026-08-03, worked well — see below).
- **`qwen3.5:9b`** — Phases 1, 3-6: metadata, summary condensation, scripture reference extraction, CCC selection, Church Father quote selection. All pure extraction/selection from text already in the prompt, no new composition.
- **Phase 7 (objections) is currently on 9b but drafts new response text** — "Extract or draft 2-4 objections... with the Catholic response to each" is generation, not extraction. Flagged as a mismatch against the confirmed split; not yet moved — would need a real test before touching the live pipeline.

**Quiz generation — `tools/generate-quiz.ts` (built 2026-08-03):** `bun tools/generate-quiz.ts <topic_id> [tier] [count]`. Fetches a topic's `answer_full`/`answer.summary`/`scripture`/`catechism` from Supabase, generates N questions via `qwen3:14b`, then shuffles each question's choices in-script (the model returns `correct_index: 0` for every question regardless of prompting — verified twice — so position is fixed post-generation, not left to the model). Writes to `content/quiz/generated/<topic_id>-<tier>.json`, matching the `content/topics/generated/` convention; no DB import step yet (mirrors `import-topic.ts` not existing for quiz — would be `import-quiz.ts` if built). Verified against a live topic (`creation-and-evolution`): content accurate, well-grounded, shuffle confirmed working.

Also note: `format: "json"` in the Ollama chat call constrains output to a single JSON *object*, not an array — wrap multi-item output in `{"items": [...]}` rather than asking for a bare array.

**Review stage (added 2026-08-03):** `content/quiz/{generated,needs-review,validated,published}` now mirrors `content/topics/`'s existing staged-review convention. Checklist at `documents/content-review-checklist.md` — Claude reads generated content in-session against its source material (citation grounding, theological accuracy, answer correctness, clarity) and moves it to `validated/` or `needs-review/`. Deliberately not scripted as an automated API call: review is input-token-dominated (cheap) precisely because it only reads and writes a short verdict, never regenerates the content — scripting it would just move the same judgment into a paid API call for no benefit. First real run (2026-08-03): reviewed the `creation-and-evolution` quiz batch, all 5 questions passed, moved to `validated/`.

**Import + promotion (added 2026-08-03):** `tools/import-quiz.ts <path>.json [--dry-run]` inserts `quiz_questions` rows with `active:false` (safety gate). `tools/promote-quiz.ts <path>.json [--dry-run]` flips matched rows to `active:true` and moves the file `validated/ → published/` — only after import (fails loudly if rows aren't found first). Matches rows by exact `topic_id`+`tier`+`question` text, so promoting one batch never touches a different batch for the same topic/tier. Verified live 2026-08-03: `creation-and-evolution` batch (5 questions, ids 840-844) imported inactive, promoted to active, file moved to `content/quiz/published/`.

`tools/promote-topic.ts <path>.json [--dry-run]` is the equivalent for topics — flips `published:true` (was previously never flipped by anything) and moves `content/topics/validated/ → published/` (was previously an empty, unused folder). Fails loudly if the topic isn't in the DB yet (run `import-topic.ts` first); short-circuits cleanly if already published. Verified 2026-08-03 (dry-run only, both branches): not-found path against an untouched test file, already-published path against the live `creation-and-evolution` row.

**Translation — `tools/translate-topic.ts` (built + verified 2026-08-08, model: `sailor2:20b`, SEA-language-specialized, separate from the qwen split above):** `bun tools/translate-topic.ts <path/to/topic.json> <ceb|tl>`. Translates `title`/`question`/`summary`/`answer_full`/`objections` only — this is the scoped rule confirmed 2026-08-08: **CCC/conciliar/Church-document citations and Church Father quotes (both "historical sources") are never translated**, only this article's own prose is. Implementation:
- Blockquote lines and inline citation parentheticals (`(CCC 126)`, `(Lumen Fidei §38)`, `(John 1:14)`) are regex-protected into placeholder tokens before the text reaches sailor2, then restored verbatim after — the model never sees or touches a citation. Necessary because early testing (2026-08-08, before this rule existed) caught sailor2 **fabricating a nonexistent `(CCC 641)`** and separately **misattributing a real `(CCC 643)` to an uncited sentence** when translating raw prose with inline citations left unprotected.
- `church_fathers` and `catechism` fields are passed through untouched.
- `scripture` is swapped to a Cebuano/Tagalog Bible verse only when `scripture_verses` has a matching row (lookup via a hand-built English→local book-name map, `BOOK_NAMES` in the script, verified against live rows rather than guessed); otherwise the English NABRE text and reference are kept as-is. Coverage is thin (verified 2026-08-08): 23 rows in `"Cebuano Ang Dating Biblia"`, 20 in `"Ang Biblia"` (Tagalog) out of ~70k total — most verses will fall through to English by design, not a bug.
- Corruption guardrails, added after testing surfaced real failures on short fields (title/summary): sailor2 sometimes hallucinates unrelated content, echoes the prompt's own instructions back as "translation," or invents placeholder tokens that were never sent. Each field gets one retry, then falls back to the original English text with a loud console warning rather than shipping bad output — never silent. Don't rely on this catching everything: a Cebuano title in testing still came out as two garbled title variants stitched together (short/leak-free enough to pass the automated checks) — this is exactly why output still needs the same human review pass as the rest of the pipeline, not a script bug to fix.
- Output: `content/topics/generated/<topic_id>-<lang>.json`, same staged-review convention as topics/quiz content.

Known data-quality issue in the source corpus: `church_father_quotes` has near-duplicate rows for
the same quote under inconsistent author names (e.g. "St. John Damascene" vs "St. John of
Damascus") — violates the canonical-name-form rule in `documents/content-generation-prompt.md`
that `ON CONFLICT` dedup depends on. Not yet cleaned up.

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

Settled architectural/process decisions (don't re-litigate): `DECISIONS.md`.

**Rule:** before proposing or making a change to migrations/CI, RLS/table
security, the Ollama model routing split, or quiz generation/review tooling,
read `DECISIONS.md` first — these are exactly the areas with prior settled
calls that get mistakenly re-proposed.

## Supabase

- Live project ref: `gdobgalhdepfpxexssvq` (name "iCFD", region ap-northeast-1) — this is the one `.env.local` points to (`NEXT_PUBLIC_SUPABASE_URL`). There is a second, unrelated Supabase project on the same account (`ztwdlkbnvsgjuzrwplxm`, a loans/investors schema) — not this app, ignore it.
- Server-side admin access: `lib/supabase/admin.ts` (`createAdminClient`, service-role key, bypasses RLS) — API routes only, never client code.
- Client/session-aware access: `lib/supabase/server.ts` / `lib/supabase/client.ts`.

### Migrations (set up 2026-07-28)

- Canonical migration files: `supabase/migrations/*.sql`, reconstructed to exactly match the live project's `supabase_migrations.schema_migrations` history (verified via `supabase db push --dry-run` → "Remote database is up to date"). `drizzle/migrations/` is legacy/unused — never matched what was actually applied.
- New migration: add a `<timestamp>_<name>.sql` file to `supabase/migrations/` (or `pnpm exec supabase migration new <name>`). No local DB link/`supabase link` needed — pushes go straight via `--db-url`.
- Deploy: `pnpm run vercel-build` (`package.json`'s `vercel-build` script, auto-run by Vercel instead of `build`) runs `node scripts/db-push.mjs && next build --webpack` — migrations apply automatically on every deploy. **Requires `DATABASE_URL`** (same value as `.env.local`) to be set as a Vercel project env var.
- No GitHub Actions — deliberately kept migration-on-deploy inside the Vercel build step per user preference (2026-07-28), not a separate CI pipeline.
- `DATABASE_URL` is the port-6543 PgBouncer transaction pooler — transaction-mode pooling doesn't support prepared statements/advisory locks, so `supabase db push` cannot run against it directly. `scripts/db-push.mjs` derives a session-pooler URL (same host, port 5432) and pushes against that instead; `next build` and the app runtime keep using the transaction pooler (`DATABASE_URL`) unchanged.

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
