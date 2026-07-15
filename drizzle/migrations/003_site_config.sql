-- Site configuration key-value table.
-- Allows backend/admin overrides of app config without a redeploy.
-- The client reads NEXT_PUBLIC_* env vars; this table acts as a runtime source of truth
-- that the admin panel (Phase 3) will sync to the client via the config API.

CREATE TABLE IF NOT EXISTS "site_config" (
  "key"         text PRIMARY KEY,
  "value"       text NOT NULL,
  "description" text,
  "updated_at"  timestamp with time zone DEFAULT now() NOT NULL
);

-- Seed default values matching .env.local defaults
INSERT INTO "site_config" ("key", "value", "description") VALUES
  ('appName',       'Codex Defensoris', 'Full product name shown in PWA installer and browser tab'),
  ('appShortName',  'iCFD',             'Short name for home screen icon label (max 12 chars)'),
  ('appId',         'codex-defensoris', 'URL-safe app identifier used in storage keys'),
  ('description',   'Offline-first Catholic apologetics app with Scripture, Tradition, and Catechism',
                                        'Description shown in meta tags and PWA install prompt'),
  ('version',       '2.0.0',            'Current app version')
ON CONFLICT ("key") DO NOTHING;
