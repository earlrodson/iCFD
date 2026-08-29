# Archived: basic-apologetics-course one-off seed (2026-08)

These files were the original one-off seeding pipeline for the
`basic-apologetics-course` path's 20 topics — already fully applied to the
live Supabase `topics`/`paths`/`path_topics` tables.

**Superseded by:** `content/topics/seed/<topic_id>.json` (one file per topic,
all languages, mirrors the live DB row exactly) + `tools/dump-seed-topics.ts`
(DB → seed file) + `tools/seed-topics.ts` (seed file → DB, idempotent,
`--dry-run` supported). See CLAUDE.md for the canonical workflow.

Kept here (not deleted) as the historical record of the original ceb/tl
content before the `answer_full` column existed — this is what let us
diagnose the `true-church`/`sunday-observance`/`perpetual-virginity`/
`salvation` data bugs fixed 2026-08-29. Do not use these files to reseed;
they predate the `answer_full` column and don't reflect current schema.
