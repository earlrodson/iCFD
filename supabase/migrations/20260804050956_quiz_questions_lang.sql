-- Quiz questions were never scoped by language — the GET/POST handlers in
-- app/api/quiz/route.ts filtered only by (topic_id, tier), so a Cebuano or
-- Tagalog topic page still served whatever (English) questions existed for
-- that topic_id/tier. Add lang so each topic's quiz bank can carry
-- per-language question sets, mirroring topics/ccc_paragraphs/canons.
ALTER TABLE quiz_questions
  ADD COLUMN lang text NOT NULL DEFAULT 'en';

ALTER TABLE quiz_questions
  ADD CONSTRAINT quiz_questions_lang_check CHECK (lang IN ('en', 'tl', 'ceb'));

DROP INDEX IF EXISTS quiz_questions_topic_tier_path_idx;
CREATE INDEX quiz_questions_topic_tier_lang_path_idx
  ON quiz_questions (topic_id, tier, lang, path_slug);
