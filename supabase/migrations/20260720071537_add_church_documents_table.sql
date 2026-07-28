-- Generic table for all additional Church documents (encyclicals, Vatican II, etc.)
CREATE TABLE church_documents (
  id          bigserial PRIMARY KEY,
  slug        text    NOT NULL,  -- e.g. 'humanae-vitae', 'lumen-gentium'
  section_num int     NOT NULL,
  section_label text,             -- heading for the section if any
  text        text,
  summary     text,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (slug, section_num)
);

CREATE INDEX ON church_documents (slug, section_num);

-- Metadata for each document
CREATE TABLE church_document_meta (
  slug        text PRIMARY KEY,
  title       text NOT NULL,
  subtitle    text,
  author      text,
  year        int,
  description text,
  free_access boolean DEFAULT true,
  sort_order  int DEFAULT 100
);

-- Enable RLS (read-only for all authenticated + anon for free docs)
ALTER TABLE church_documents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE church_document_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read church_documents"
  ON church_documents FOR SELECT USING (true);

CREATE POLICY "public read church_document_meta"
  ON church_document_meta FOR SELECT USING (true);

-- Seed document metadata
INSERT INTO church_document_meta (slug, title, subtitle, author, year, description, free_access, sort_order) VALUES
  ('humanae-vitae',   'Humanae Vitae',          'On the Regulation of Birth',              'Pope Paul VI',        1968, '31 sections on conjugal love, responsible parenthood, and the moral law on birth regulation.',          true, 10),
  ('lumen-gentium',   'Lumen Gentium',           'Dogmatic Constitution on the Church',      'Second Vatican Council', 1964, '69 articles on the nature of the Church, the People of God, the hierarchy, and the call to holiness.', true, 20),
  ('dei-verbum',      'Dei Verbum',              'Dogmatic Constitution on Divine Revelation','Second Vatican Council', 1965, '26 articles on Scripture, Tradition, and their relation to the Magisterium.',                        true, 30),
  ('gaudium-et-spes', 'Gaudium et Spes',         'Pastoral Constitution on the Church in the Modern World', 'Second Vatican Council', 1965, '93 articles on the Church''s engagement with the modern world, human dignity, and social questions.', true, 40);
