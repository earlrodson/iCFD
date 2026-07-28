-- Rewrite topics.scripture: [{reference,version,text}] → [id, ...]
UPDATE public.topics t
SET scripture = (
  SELECT jsonb_agg(sv.id ORDER BY ord)
  FROM jsonb_array_elements(t.scripture) WITH ORDINALITY AS x(v, ord)
  JOIN public.scripture_verses sv
    ON sv.reference = x.v->>'reference'
   AND sv.version   = COALESCE(NULLIF(x.v->>'version',''), 'NABRE')
)
WHERE jsonb_typeof(scripture) = 'array'
  AND jsonb_array_length(scripture) > 0
  AND (scripture->0) ? 'reference';

-- Rewrite topics.catechism: ["CCC 464"] → [464, ...]
UPDATE public.topics
SET catechism = (
  SELECT jsonb_agg(REGEXP_REPLACE(c, '[^0-9]', '', 'g')::INTEGER ORDER BY ord)
  FROM jsonb_array_elements_text(catechism) WITH ORDINALITY AS x(c, ord)
  WHERE c ~ '[0-9]+'
)
WHERE jsonb_typeof(catechism) = 'array'
  AND jsonb_array_length(catechism) > 0
  AND (catechism->>0) LIKE 'CCC%';

-- Rewrite topics.church_fathers: [{author,quote,source}] → [id, ...]
UPDATE public.topics t
SET church_fathers = (
  SELECT jsonb_agg(cfq.id ORDER BY ord)
  FROM jsonb_array_elements(t.church_fathers) WITH ORDINALITY AS x(f, ord)
  JOIN public.church_father_quotes cfq
    ON cfq.author = x.f->>'author'
   AND cfq.quote  = x.f->>'quote'
)
WHERE jsonb_typeof(church_fathers) = 'array'
  AND jsonb_array_length(church_fathers) > 0
  AND (church_fathers->0) ? 'author';
