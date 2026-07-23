-- paths
INSERT INTO paths (slug, title, description, audience, estimated_minutes, difficulty, icon)
VALUES ('basic-apologetics-course', 'Basic Apologetics Course', 'The complete 20-topic Layman''s Biblical Theology and Apologetics Course — read every lesson, then take tiered quizzes to earn a certificate.', 'Lay Catholics completing the full guided course, in English, Tagalog, or Cebuano.', 300, 'beginner', 'graduation-cap')
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, audience = EXCLUDED.audience,
  estimated_minutes = EXCLUDED.estimated_minutes, icon = EXCLUDED.icon;

