-- Add is_recommended to topics
ALTER TABLE topics ADD COLUMN IF NOT EXISTS is_recommended BOOLEAN NOT NULL DEFAULT false;

-- Add role to admins table (admin = full access, editor = topics/translations/submissions only)
ALTER TABLE admins ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'admin'
  CHECK (role IN ('admin', 'editor'));

-- Index for fast recommended topic lookup
CREATE INDEX IF NOT EXISTS idx_topics_is_recommended ON topics(is_recommended) WHERE is_recommended = true;
