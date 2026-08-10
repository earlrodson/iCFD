# TODO — iCFD

Pull-up list for future sessions. Update as items are resolved; don't let this drift from reality — check current state before trusting an entry more than a few sessions old.

Last audited: 2026-08-10.

## Uncommitted work (blocking)

- [ ] **Commit the presentations feature.** `presenter` role, `presentations` table/RLS
      (`supabase/migrations/20260808101110_presentations.sql`), `app/presentations/`,
      `app/admin/presentations/`, `app/api/admin/presentations/`, `components/presentations/`,
      `tools/{generate,import,promote}-presentation.ts` are all untracked. See ADR-009 in
      `DECISIONS.md` for the design. Split into logical commits (schema/RLS migration, admin
      role plumbing, feature UI/API, content tooling) rather than one giant commit — keeps
      `git blame` useful later.
- [ ] **Commit `tools/translate-topic.ts`** and the in-flight translation output
      (`content/topics/generated/historical-evidence-for-jesus-{ceb,tl}.json`, already promoted
      to `validated/` — one review step short of `import-topic.ts` + `promote-topic.ts`).
- [ ] Decide what to do with `documents/Atheism_AI_content/` (4 markdown apologetics drafts +
      an exported HTML dossier, untracked). Looks like source material for future topic
      generation, not yet linked into the content pipeline — triage: commit as reference docs,
      or extract into `content/topics/` and drop the rest.
- [ ] `CLAUDE.md` and `DECISIONS.md` also have uncommitted edits (ADR-009 + presentations
      session notes) — will land as part of the presentations commit.

## Test coverage gaps

- [ ] **No tests exist for the presentations feature** — `pnpm test` is 158/158 green but none
      of them touch `app/presentations/`, `app/admin/presentations/`,
      `app/api/admin/presentations/`, or `components/presentations/SlideViewer.tsx`. At minimum
      needs coverage for the `is_cfd_member` gating logic (client-side check in
      `app/presentations/[topicId]/page.tsx`) since that's the first feature using that flag —
      a regression here silently exposes or blocks member content.
- [ ] `tools/import-presentation.ts` / `tools/promote-presentation.ts` have no documented
      "verified against live Supabase" pass, unlike `import-topic.ts`/`promote-topic.ts` and the
      quiz equivalents (both explicitly verified live per `CLAUDE.md`). Run one real
      generate → import → promote cycle end-to-end and log the result before trusting the
      pipeline for more content.

## Lint debt (pre-existing, not new)

`pnpm lint` currently fails with 15 errors, all `@typescript-eslint/no-explicit-any`:
- `tools/generate-quiz.ts` (2)
- `tools/generate-topic.ts` (2)
- `tools/generate-quiz-from-doc.ts` (2)
- `tools/vector-index-theology.ts` (9)

Plus 4 pre-existing warnings (unused vars in `SyncManager.tsx`, `validate-topic.ts`,
`generate-quiz-from-doc.ts`; missing `useEffect` dep in admin analytics). None block
`pnpm type-check` or `pnpm test` (both currently green). Fix opportunistically when touching
these files — not worth a dedicated pass on its own.

## Flagged-but-not-yet-acted mismatches (from CLAUDE.md / DECISIONS.md)

- [ ] **Phase 7 (objections) generation is on `qwen3.5:9b`** but drafts new response text —
      violates ADR-005 (generate vs. extract split says this belongs on `qwen3:14b`). Not moved
      yet because it hasn't been tested against the live pipeline — do that before switching.
- [ ] `church_father_quotes` has near-duplicate rows under inconsistent author name spellings
      (e.g. "St. John Damascene" vs "St. John of Damascus"), which breaks the canonical-name-form
      `ON CONFLICT` dedup rule in `documents/content-generation-prompt.md`. Not cleaned up.

## Deliberate v1 cuts (don't "fix" without re-confirming scope — see ADR-009)

- Presentations are English-only (no `lang` column yet).
- `presentations` content pipeline has exactly one published item
  (`content/presentations/published/creation-and-evolution.json`) — everything else needs the
  same generate → review → import → promote cycle as topics/quiz.

## Housekeeping

- [ ] Once the presentations feature is committed and deployed, confirm the migration actually
      applied on the live project (`vercel-build` runs `scripts/db-push.mjs` automatically) —
      check `presenter` shows up as a valid role and the RLS policies exist before granting any
      real user the `presenter` role.
