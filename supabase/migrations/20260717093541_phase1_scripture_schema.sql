-- 1. Unique constraint on (reference, version) — what's actually populated
ALTER TABLE scripture_verses
  ADD CONSTRAINT uq_verse_ref_version UNIQUE (reference, version);

-- 2. Index for fast chapter-level queries once book/chapter are populated
CREATE INDEX IF NOT EXISTS idx_sv_book_chapter_version
  ON scripture_verses (book, chapter, version);

-- 3. Add book_code column (USFM codes e.g. "JHN", "GEN") for Bible browser
ALTER TABLE scripture_verses
  ADD COLUMN IF NOT EXISTS book_code text;

-- 4. Convert topics.scripture from integer ID arrays → reference string arrays
--    Done in a single UPDATE so no row is ever half-converted
UPDATE topics t
SET scripture = (
  SELECT jsonb_agg(sv.reference ORDER BY sv.id)
  FROM jsonb_array_elements_text(t.scripture) e
  JOIN scripture_verses sv ON sv.id = e::int
)
WHERE scripture IS NOT NULL
  AND jsonb_array_length(scripture) > 0
  AND jsonb_typeof(scripture->0) = 'number';

-- 5. User preferred Bible translation
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS bible_version text NOT NULL DEFAULT 'NABRE';

-- 6. Catechism: lang + structural metadata for full browser
ALTER TABLE ccc_paragraphs
  ADD COLUMN IF NOT EXISTS lang text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS part text,
  ADD COLUMN IF NOT EXISTS chapter_title text,
  ADD COLUMN IF NOT EXISTS article text;

-- Promote to composite PK (paragraph, lang) for multi-language CCC
ALTER TABLE ccc_paragraphs DROP CONSTRAINT ccc_paragraphs_pkey;
ALTER TABLE ccc_paragraphs ADD PRIMARY KEY (paragraph, lang);
