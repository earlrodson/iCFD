CREATE TABLE history_timeline (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  year       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  icon       TEXT NOT NULL DEFAULT 'users',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE history_presidents (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       TEXT NOT NULL,
  years      TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE history_timeline   ENABLE ROW LEVEL SECURITY;
ALTER TABLE history_presidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_history_timeline"   ON history_timeline   FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_history_presidents" ON history_presidents FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_write_history_timeline"   ON history_timeline   FOR ALL    TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_write_history_presidents" ON history_presidents FOR ALL    TO authenticated USING (true) WITH CHECK (true);

-- Seed with the content originally hardcoded on the public /history page.
INSERT INTO history_timeline (year, title, body, icon, sort_order) VALUES
  ('1935', 'The First Seeds, San Nicolas, Cebu', 'Bro. Pedro Cabaluna — remembered as a “walking Bible” for his command of Scripture — begins gathering lay Catholics in San Nicolas Parish to answer the Aglipayan and Protestant groups then actively working to convert the faithful.', 'users', 10),
  ('1938', 'Testing the Faith with Fr. Undoy Reynes', 'A group of laypeople convenes at San Nicolas Parish, bringing Fr. Reynes the exact objections raised by Protestant preachers. His confident, Scripture-based answers embolden the group to keep studying and defending Church teaching themselves.', 'book-open', 20),
  ('1946', 'A Parallel Movement in Opon', 'At Virgen de la Regla Parish in Opon (now Lapu-Lapu City), candlemaker Mundo Reuma and the Berido brothers form an independent lay circle assisting Fr. Gerald Trenekeins, MSC, in explaining doctrine to parishioners.', 'map-pin', 30),
  ('1953', 'The Name Is Born, Santo Rosario Parish', 'Under the mentorship of Msgr. Esteban Montecillo, a debate circle at Santo Rosario Parish in Cebu City formally adopts the name “Catholic Faith Defender” — arising independently of the San Nicolas and Opon groups.', 'buildings', 40),
  ('1953–1963', 'The Hidden Years', 'A decade with almost no surviving documentation. Rather than decline, this was quiet growth — scattered parish groups across Cebu kept defending the faith without centralized records, until they recognized a shared calling.', 'users', 50),
  ('Mar 26, 1963', 'Legal Incorporation', 'Under Atty. Melquiades S. Caumeron, the Catholic Faith Defenders is formally registered with the Securities and Exchange Commission — uniting the independent Cebu parish circles into one legally recognized association.', 'buildings', 60),
  ('1965', 'Vatican II Affirms the Laity', 'The Second Vatican Council’s decree Apostolicam Actuositatem articulates the active, evangelizing responsibility of lay Catholics — giving the young movement a clear theological foundation.', 'book-open', 70),
  ('1980s', 'Expansion Across the Visayas', 'Chapters take root in Ormoc, Leyte, and — crossing the Tañon Strait — in Dumaguete, Negros Oriental, training lay Catholics in parish-level apologetics.', 'map-pin', 80),
  ('Late 1900s', 'Reaching Mindanao', 'Structured chapters organize across the Archdiocese of Davao and the dioceses of Tagum, Zamboanga, and Cagayan de Oro, supported by local clergy and university outreach groups.', 'map-pin', 90),
  ('1991', 'PCP II Calls for Lay Apologetics', 'The Second Plenary Council of the Philippines explicitly urges parish priests to encourage lay Catholic apologetics groups — accelerating the CFD’s spread nationwide.', 'book-open', 100),
  ('Early 2000s', 'Arrival in Luzon and Metro Manila', 'The movement consolidates a national presence, establishing chapters across the Archdiocese of Manila and the dioceses of Antipolo, Cavite, Laguna, Quezon, and Marikina.', 'map-pin', 110),
  ('2019–Present', 'A National Digital Apostolate', 'Under National President Bro. Ryan Mejillano, the CFD becomes an official member of the Sangguniang Laiko ng Pilipinas under the CBCP Episcopal Commission on the Laity, broadcasting on TV Maria and holding online open forums and debates alongside its traditional plaza ministry.', 'broadcast', 120);

INSERT INTO history_presidents (name, years, sort_order) VALUES
  ('Bro. Peter Cabaluna', '1935', 10),
  ('Atty. Melquiades S. Caumeron Sr.', '1964 – 1974', 20),
  ('Bro. Socrates Fernandez', '1981 – 1984', 30),
  ('Atty. Marcelo Bacalso', '1984 – 1988', 40),
  ('Atty. Cesar P. Kilaton', '1988 – 1991', 50),
  ('Bro. Socrates Fernandez', '1991 – 1997', 60),
  ('Dr. Fortunato A. Dayot', '1997 – 2000', 70),
  ('Atty. Miguel L. Abas', '2000 – 2010', 80),
  ('Bro. Ramon Gitamondoc', '2010 – 2016', 90),
  ('Bro. Socrates Fernandez', '2016 – 2019', 100),
  ('Bro. Ryan Mejillano', '2019 – 2028', 110);
