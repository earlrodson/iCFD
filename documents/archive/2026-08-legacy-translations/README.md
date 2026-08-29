# Archived: legacy-translations needs-review staging (2026-08)

49 ceb/tl translation drafts produced by `tools/translate-legacy-topic.ts` /
`tools/seed-apologetics-topic.ts` / `tools/seed-apologetics-topic-tl.ts`.
Never applied to Supabase or `handbook.json` — sat in `needs-review` staging
indefinitely.

**Verified redundant, not just stale (2026-08-29):** every topic_id these
files reference already has ceb/tl content live in the `topics` table —
either via `content/topics/seed/` (the 20 `basic-apologetics-course` topics,
audited/fixed against `documents/Apologetics-{ceb,tl}/*.md`) or via the
existing full-length `answer_full` already present for the other 30
overlapping topics (biblical-canon, real-presence, transubstantiation, etc.).
No missing coverage — safe to archive without a review pass.

At least one file (`original-sin-ceb.json`) has a confirmed corrupted
`title` field (a leaked sailor2 translation-prompt fragment) — do not reuse
any of these files without re-validating from scratch against
`content/topics/seed/`.

## tools/ (also archived here)

The six tools that only read/wrote this pipeline's `needs-review` directory
or `handbook.json`, now orphaned since the directory moved and is confirmed
redundant: `seed-apologetics-topic.ts`, `seed-apologetics-topic-tl.ts`,
`translate-legacy-topic.ts`, `validate-translation-legacy.ts`,
`merge-legacy-translations.ts`, `apply-apologetics-topic.ts`, plus their
shared helpers `lib/apologetics-essay.ts` / `lib/apologetics-essay-tl.ts`.
Confirmed via grep that nothing else in the repo imports them
(`pnpm type-check` passes after removal). `tools/translate-topic.ts` +
`tools/validate-translation.ts` (the newer, non-legacy pipeline) are
unaffected and remain active.
