CREATE POLICY "temp_anon_insert_meta" ON church_document_meta FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "temp_anon_insert_sections" ON church_documents FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "temp_anon_update_meta" ON church_document_meta FOR UPDATE TO anon USING (true);
CREATE POLICY "temp_anon_update_sections" ON church_documents FOR UPDATE TO anon USING (true);
