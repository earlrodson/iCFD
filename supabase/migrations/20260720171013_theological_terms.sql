CREATE TABLE theological_terms (
  slug          TEXT PRIMARY KEY,
  term          TEXT NOT NULL,
  pronunciation TEXT,
  language      TEXT NOT NULL DEFAULT 'Greek',
  root_text     TEXT,
  root_meaning  TEXT NOT NULL,
  definition    TEXT NOT NULL,
  debate_note   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE topic_terms (
  topic_id  TEXT NOT NULL,
  term_slug TEXT NOT NULL REFERENCES theological_terms(slug) ON DELETE CASCADE,
  PRIMARY KEY (topic_id, term_slug)
);

ALTER TABLE theological_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_terms       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_terms"       ON theological_terms FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_topic_terms" ON topic_terms       FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_write_terms"       ON theological_terms FOR ALL   TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_write_topic_terms" ON topic_terms       FOR ALL   TO authenticated USING (true) WITH CHECK (true);
