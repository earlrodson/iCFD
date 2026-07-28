CREATE TABLE IF NOT EXISTS "site_config" (
  "key"         text PRIMARY KEY,
  "value"       text NOT NULL,
  "description" text,
  "updated_at"  timestamp with time zone DEFAULT now() NOT NULL
);

INSERT INTO "site_config" ("key", "value", "description") VALUES
  ('appName',       'Codex Defensoris', 'Full product name shown in PWA installer and browser tab'),
  ('appShortName',  'iCFD',             'Short name for home screen icon label (max 12 chars)'),
  ('appId',         'codex-defensoris', 'URL-safe app identifier used in storage keys'),
  ('description',   'Offline-first Catholic apologetics app with Scripture, Tradition, and Catechism', 'Description shown in meta tags and PWA install prompt'),
  ('version',       '3.0.0',            'Current app version')
ON CONFLICT ("key") DO NOTHING;
