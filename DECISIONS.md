# Architecture Decisions

Append-only log of decisions that would otherwise get re-litigated. Newest at
the bottom. Each entry: what was decided, why, and what it rules out.

---

## ADR-001 — Migrations apply on deploy, not via CI

**Decision:** DB migrations run inside the Vercel build step
(`vercel-build` → `scripts/db-push.mjs && next build --webpack`), not as a
separate GitHub Actions pipeline.

**Reason:** Deliberate choice (2026-07-28) to keep migration-on-deploy inside
the build instead of standing up a separate CI pipeline for it.

**Consequence:** Don't propose a GitHub Actions migration workflow — this was
already considered and declined. `DATABASE_URL` must stay set as a Vercel env
var for this to work.

---

## ADR-002 — `supabase/migrations/` is canonical, `drizzle/migrations/` is not

**Decision:** `supabase/migrations/*.sql` is the source of truth, reconstructed
to exactly match the live project's applied migration history (verified via
`supabase db push --dry-run`). `drizzle/migrations/*.sql` is legacy/historical
only.

**Reason:** The Drizzle migrations never matched what was actually applied to
the live database.

**Consequence:** New migrations go in `supabase/migrations/`. Never treat
`drizzle/migrations/` as authoritative or use it to infer current schema.

---

## ADR-003 — Push migrations via session pooler, not transaction pooler

**Decision:** `scripts/db-push.mjs` derives a session-pooler URL (same host,
port 5432) from `DATABASE_URL` and pushes migrations against that, while
`next build` and the app runtime keep using the transaction pooler
(`DATABASE_URL`, port 6543) unchanged.

**Reason:** `DATABASE_URL` is the PgBouncer transaction-mode pooler, which
doesn't support prepared statements/advisory locks — `supabase db push`
cannot run against it directly.

**Consequence:** Don't "simplify" `db-push.mjs` to reuse `DATABASE_URL`
directly — it will break migrations.

---

## ADR-004 — `site_config` has RLS disabled, intentionally

**Decision:** RLS is disabled on `site_config`, so the anon key can read and
write every row.

**Reason:** Confirmed with user 2026-07-25 as intentional for this table.

**Consequence:** Do not re-flag this as a security issue or "fix" it in a
future advisor pass without re-confirming with the user first.

---

## ADR-005 — Local LLM (Ollama) split: generate vs. extract, not short vs. long

**Decision:** `qwen3:14b` handles any task that composes new prose (e.g. the
1500–2500 word Phase 2 answer, quiz-item drafting). `qwen3.5:9b` handles pure
extraction/selection from text already in the prompt (metadata, summary
condensation, scripture/CCC/Church Father selection).

**Reason:** Confirmed 2026-08-03 via `tools/generate-topic.ts` as the real
working reference; the split is about composition vs. extraction, not about
output length.

**Consequence:** Phase 7 (objections) is currently on 9b but drafts new
response text — flagged as a mismatch against this rule, not yet moved
because it hasn't been tested against the live pipeline. Don't move it
without testing first.

---

## ADR-006 — Quiz shuffle happens in-script, not via prompting

**Decision:** `tools/generate-quiz.ts` shuffles each question's answer choices
in-script after generation, rather than asking the model to randomize
`correct_index`.

**Reason:** The model returns `correct_index: 0` for every question
regardless of prompting — verified twice.

**Consequence:** Don't try to fix this via prompt engineering; the post-hoc
shuffle is the correct and permanent fix.

---

## ADR-007 — Quiz review is a manual in-session read, not a scripted API call

**Decision:** The generated → validated/needs-review step for quiz content is
done by Claude reading the content in-session against source material, not by
an automated script calling a review API.

**Reason:** Review is input-token-dominated (cheap) precisely because it only
reads and writes a short verdict, never regenerates content — scripting it
would move the same judgment into a paid API call for no benefit.

**Consequence:** Don't build a `review-quiz.ts` automation for this step.

---

## ADR-008 — Model/workflow routing rules live in project CLAUDE.md, not global

**Decision:** Project-specific model routing (e.g. the qwen3:14b/qwen3.5:9b
split above) belongs in this project's `CLAUDE.md`/`DECISIONS.md`, never in
the user's global `~/.claude/CLAUDE.md`.

**Reason:** User declined escalating this to global scope — routing rules
tied to this project's specific local-LLM pipeline don't generalize.

**Consequence:** Don't propose moving these rules to global config.

---

## ADR-009 — Presenter role, dynamic presentation rendering, CFD-member gating

**Decision (2026-08-08):** Three linked calls for the presentations feature:
1. `presenter` is a third value on the existing `admins.role` CHECK
   constraint (`admin | editor | presenter`), not a separate table.
2. Presentations render dynamically — a `presentations` table stores
   `{topic_id, slides: jsonb, published}`, and `SlideViewer.tsx` renders that
   JSON client-side at request time. No static HTML/PPTX export per topic.
   The slide JSON itself is generated offline once per topic (same
   generate → import → promote staged-review pipeline as topics/quiz).
3. `user_settings.is_cfd_member` (previously a profile-only flag) now gates
   real content for the first time, via an RLS SELECT policy requiring
   `published = true AND is_cfd_member = true`, checked again client-side
   (`app/presentations/[topicId]/page.tsx`) for UX, following the app's
   existing client-side-auth convention (`getUser()`/`onAuthStateChange()` +
   session-aware `createClient()`) rather than introducing the first
   server-component/SSR auth page.
4. Presentations are English-only for v1 — no `lang` column — to validate
   the slide format before adding translation.

**Reason:** Reuses every existing pattern (admins-table roles, staged-review
content pipeline, client-side auth) instead of inventing parallel
infrastructure; `is_cfd_member` existed but had never gated anything, so this
establishes the first precedent for member-only content.

**Consequence:** Any future member-only feature should reuse the
`is_cfd_member` RLS-policy + client-side-check pattern here, not reinvent it.
Don't add a `lang` column to `presentations` without re-confirming scope —
English-only was a deliberate v1 cut, not an oversight.
