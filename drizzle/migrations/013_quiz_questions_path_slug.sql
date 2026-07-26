-- A topic can appear in more than one learning path, and paths sometimes
-- want their own slant on a topic's quiz. Add a nullable path_slug to
-- quiz_questions: NULL means the question is generic and reusable by any
-- path that includes the topic (the existing behavior, preserved for every
-- row authored so far); a set value scopes the question to just that path.
-- ON DELETE SET NULL rather than CASCADE — deleting a path shouldn't delete
-- its authored questions, just make them generic/reusable again.

ALTER TABLE "quiz_questions" ADD COLUMN "path_slug" text REFERENCES "paths"("slug") ON DELETE SET NULL;

DROP INDEX IF EXISTS "quiz_questions_topic_tier_idx";
CREATE INDEX IF NOT EXISTS "quiz_questions_topic_tier_path_idx" ON "quiz_questions" ("topic_id", "tier", "path_slug");
