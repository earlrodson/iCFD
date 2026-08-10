# TODO — iCFD

Pull-up list for future sessions. Update as items are resolved; don't let this drift from reality — check current state before trusting an entry more than a few sessions old.

Last audited: 2026-08-10.

## Test coverage gaps

- [ ] **No tests exist for the presentations feature or this session's additions** —
      `pnpm test` is 158/158 green but none of them touch `app/presentations/`,
      `app/admin/presentations/`, `app/api/admin/presentations/`, `app/api/admin/users/`, or
      `components/presentations/SlideViewer.tsx`. At minimum needs coverage for the
      is_cfd_member-AND-admin viewer gate (`app/presentations/[topicId]/page.tsx`) — a
      regression here silently exposes or blocks member content, and it's already been
      tightened once (2026-08-10, from "member OR admin" to "member AND admin").
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

## Local LLM routing — temporarily collapsed onto one model

`tools/generate-quiz.ts` and `tools/generate-topic.ts` now both run entirely on
`qwen3.6:35b-mlx` (2026-08-10) because `qwen3:14b` and `qwen3.5:9b` are currently deleted
locally. This **suspends** the generate-vs-extract split from ADR-005 (project `DECISIONS.md`)
— Phase 2 generation and Phases 1/3-7 extraction are all on the same model for now, so the
Phase 7 "generation task running on the extraction-tier model" mismatch flagged earlier is
moot until the 14b/9b split is restored. When `qwen3:14b`/`qwen3.5:9b` come back locally,
re-split these scripts back to ADR-005's rule rather than leaving everything on 35b.

- [ ] `church_father_quotes` has near-duplicate rows under inconsistent author name spellings
      (e.g. "St. John Damascene" vs "St. John of Damascus"), which breaks the canonical-name-form
      `ON CONFLICT` dedup rule in `documents/content-generation-prompt.md`. Not cleaned up.

## Deliberate v1 cuts / scoped decisions (see DECISIONS.md before re-litigating)

- Presentations are English-only (no `lang` column yet) — ADR-009.
- `presentations` content pipeline has exactly one published item
  (`content/presentations/published/creation-and-evolution.json`) — everything else needs the
  same generate → review → import → promote cycle as topics/quiz.
- Presentation *viewing* (`/presentations/[topicId]`) is deliberately restricted to accounts
  that are both `is_cfd_member = true` AND have an `admins` row (2026-08-10) — not rolled out
  to regular members yet. Both the RLS policy and the client-side check enforce this; don't
  loosen either without confirming the rollout decision first. The `/admin/presentations`
  authoring UI is unaffected (gated by admin role only, same as other admin pages).
- `documents/Atheism_AI_content/` (4 apologetics drafts + an exported HTML dossier) is
  reference/source material only — not yet linked into the topic-generation pipeline.
- `content/topics/generated|validated/historical-evidence-for-jesus-{ceb,tl}.json` are sitting
  in `validated/`, one step short of `import-topic.ts` + `promote-topic.ts`.

## Housekeeping

- [x] Presentations feature, CFD-member admin toggle, admin+member viewer gate, and the
      SlideViewer fullscreen toggle are committed, merged to `master`, and pushed
      (2026-08-10). Migrations for all of it are applied on the live Supabase project.
