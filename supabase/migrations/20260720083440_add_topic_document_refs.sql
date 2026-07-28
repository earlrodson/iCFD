-- Join table: which document sections support which topics
CREATE TABLE topic_document_refs (
  id          bigserial PRIMARY KEY,
  topic_id    text NOT NULL,
  doc_slug    text NOT NULL REFERENCES church_document_meta(slug) ON DELETE CASCADE,
  section_num int  NOT NULL,
  section_label text,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (topic_id, doc_slug, section_num)
);

ALTER TABLE topic_document_refs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read"   ON topic_document_refs FOR SELECT USING (true);
CREATE POLICY "service write" ON topic_document_refs FOR ALL TO service_role USING (true);

-- FK so Supabase REST can embed church_document_meta in church_documents queries
ALTER TABLE church_documents
  ADD CONSTRAINT fk_church_documents_meta
  FOREIGN KEY (slug) REFERENCES church_document_meta(slug) ON DELETE CASCADE;
