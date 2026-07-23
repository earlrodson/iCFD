-- path_topics
INSERT INTO path_topics (path_slug, topic_id, position) VALUES
  ('basic-apologetics-course', 'bible-tradition-authority', 0),
  ('basic-apologetics-course', 'true-church', 1),
  ('basic-apologetics-course', 'holy-trinity', 2),
  ('basic-apologetics-course', 'divinity-of-christ', 3),
  ('basic-apologetics-course', 'immaculate-conception', 4),
  ('basic-apologetics-course', 'perpetual-virginity', 5),
  ('basic-apologetics-course', 'sacred-images', 6),
  ('basic-apologetics-course', 'prayer-to-saints', 7),
  ('basic-apologetics-course', 'purgatory', 8),
  ('basic-apologetics-course', 'primacy-of-peter', 9),
  ('basic-apologetics-course', 'indulgences', 10),
  ('basic-apologetics-course', 'infant-baptism', 11),
  ('basic-apologetics-course', 'confession-to-priest', 12),
  ('basic-apologetics-course', 'holy-eucharist', 13),
  ('basic-apologetics-course', 'holy-orders', 14),
  ('basic-apologetics-course', 'holy-mass', 15),
  ('basic-apologetics-course', 'sunday-observance', 16),
  ('basic-apologetics-course', 'dietary-abstinence', 17),
  ('basic-apologetics-course', 'cross-sign-of-cross', 18),
  ('basic-apologetics-course', 'salvation', 19)
ON CONFLICT (path_slug, topic_id) DO UPDATE SET position = EXCLUDED.position;
