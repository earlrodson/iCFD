-- Scripture verse library
CREATE TABLE public.scripture_verses (
  id          SERIAL PRIMARY KEY,
  reference   TEXT NOT NULL,
  version     TEXT NOT NULL DEFAULT 'NABRE',
  text        TEXT NOT NULL,
  book        TEXT,
  chapter     INTEGER,
  verse_start INTEGER,
  verse_end   INTEGER,
  UNIQUE (reference, version)
);

-- CCC paragraph library
CREATE TABLE public.ccc_paragraphs (
  paragraph   INTEGER PRIMARY KEY,
  text        TEXT,
  summary     TEXT,
  section     TEXT
);

-- Church Father quote library
CREATE TABLE public.church_father_quotes (
  id          SERIAL PRIMARY KEY,
  author      TEXT NOT NULL,
  quote       TEXT NOT NULL,
  source      TEXT NOT NULL,
  year_approx INTEGER,
  UNIQUE (author, quote)
);

-- RLS: public read, admin write
ALTER TABLE public.scripture_verses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ccc_paragraphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.church_father_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read scripture_verses"   ON public.scripture_verses   FOR SELECT USING (true);
CREATE POLICY "public read ccc_paragraphs"     ON public.ccc_paragraphs     FOR SELECT USING (true);
CREATE POLICY "public read church_father_quotes" ON public.church_father_quotes FOR SELECT USING (true);

CREATE POLICY "admin write scripture_verses" ON public.scripture_verses
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admins WHERE email = auth.jwt()->>'email'));
CREATE POLICY "admin write ccc_paragraphs" ON public.ccc_paragraphs
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admins WHERE email = auth.jwt()->>'email'));
CREATE POLICY "admin write church_father_quotes" ON public.church_father_quotes
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admins WHERE email = auth.jwt()->>'email'));
