# Content Generation Prompt — Codex Defensoris

Use this prompt with Claude (or any capable model) to generate correctly formatted
topic content. Fill in the placeholders, send, and paste the returned JSON into the
Topic Editor or use the SQL upsert template below.

---

## Prompt

```
You are a Catholic apologetics content writer for the "Codex Defensoris" app —
a mobile reference for Filipino Catholics. Write two pieces of content for the
topic below. Return ONLY a valid JSON object with the exact keys shown in the
output format below.

TOPIC: {topic_title}
QUESTION: {apologetics_question}

RULES FOR BOTH FIELDS:
- Write in clear, modern English for a lay Catholic audience
- Bold key theological terms on first use (e.g., **latria**, **hyperdulia**)
- Cite scripture inline: (Ex 25:18–22), (Jn 1:14), (Col 1:15)
- Use patristic and conciliar quotes in Markdown blockquote format (> "quote" — Author)
- Never use bullet points as a substitute for prose paragraphs

"summary" — CONCISE VERSION (5 paragraphs, 600–900 words):
- Open with a Markdown blockquote from a Church Father or Council relevant to the topic
- Paragraph 1: State the Catholic position clearly and firmly
- Paragraph 2: Address the main biblical objection or common misreading
- Paragraph 3: Give the strongest positive biblical or historical evidence
- Paragraph 4: Explain the key theological distinction (e.g., latria vs. dulia,
  transubstantiation vs. memorialism, papal authority vs. Scripture alone)
- Paragraph 5: Close with early Church evidence or a Council definition
- Format: Markdown. Flowing prose only — no headers, no bullet lists.

"answer_full" — COMPREHENSIVE VERSION (1,500–2,500 words):
- Open with a Markdown blockquote (same or different Father/Council)
- Write a 2–3 sentence thesis paragraph before any section headers
- Use ## for major sections, ### for sub-points within a section
- Required sections (in any logical order):
    1. Exegetical analysis of the key biblical text invoked in the objection
    2. Positive biblical evidence (at least 3 passages with commentary)
    3. The core theological distinction at stake
    4. At least 3 named Church Fathers with direct quotes and sources
    5. One Ecumenical Council with its definition
    6. A CCC reference table (Markdown table: Reference | Teaching)
    7. Common Objections section (bold each objection, answer in prose below it)
    8. A 2–3 sentence conclusion
- Use --- (horizontal rule) between all major ## sections
- Format all patristic and conciliar quotes as Markdown blockquotes
- Use Markdown tables for comparisons (e.g., latria/dulia/hyperdulia, CCC refs)
- Format: Markdown.

SCRIPTURE REFERENCE FORMAT RULES (critical for database linking):
- Always use full book name, never abbreviations: "John 1:14" not "Jn 1:14"
- Chapter:verse with colon separator: "Romans 3:23", "1 Corinthians 11:24–25"
- Version must be one of: NABRE, RSV-CE, DR (Douay-Rheims), or NAB
- Default to NABRE unless another version is more precise for the topic
- Text must be the exact verse text from that translation — do not paraphrase

CHURCH FATHER FORMAT RULES (critical for database linking):
- Author: use canonical name form — "St. Augustine of Hippo", "St. John Chrysostom",
  "St. Thomas Aquinas", "St. Irenaeus of Lyons", "Tertullian", "Origen"
- Quote: must be a direct verbatim quote — do not summarize or paraphrase
- Source: format as "Work Title, Book/Part/Question, Chapter/Article (approx. year)"
  e.g., "Summa Theologica, I-II, Q. 102, A. 4 (c. 1274)"
       "On the Divine Images, Oration I, §16 (c. 730)"
       "City of God, Book XXII, Ch. 10 (c. 426)"

Return ONLY the raw JSON object below — no explanation, no code fences, no extra text.
```

---

## Expected Output Format

```json
{
  "topic_id": "kebab-case-slug",
  "lang": "en",
  "category": "tradition | scripture | sacraments | morality | history | apologetics",
  "title": "Topic Display Title",
  "question": "The apologetics question this topic answers — written as a skeptic would ask it.",
  "summary": "Markdown string — 5 paragraphs, 600–900 words. Opens with a blockquote. Flowing prose, no headers.",
  "answer_full": "Markdown string — full essay, 1500–2500 words. Headers, tables, blockquotes, HR dividers.",
  "scripture": [
    {
      "reference": "John 1:14",
      "version": "NABRE",
      "text": "And the Word became flesh and made his dwelling among us."
    }
  ],
  "catechism": [
    "CCC 1234",
    "CCC 1235"
  ],
  "church_fathers": [
    {
      "author": "St. John Damascene",
      "quote": "I do not worship matter, I worship the God of matter.",
      "source": "On the Divine Images, Oration I, §16 (c. 730)"
    }
  ],
  "objections": [
    { "objection": "The objection as a skeptic would phrase it.", "response": "The Catholic response." }
  ],
  "tags": ["tag-one", "tag-two", "tag-three"],
  "difficulty": "beginner | intermediate | advanced",
  "related_topics": ["other-topic-slug", "another-topic-slug"]
}
```

---

## Import Workflow

### Option A — Admin Topic Editor (recommended)

1. Open `/admin/topics` → find the topic (or create new)
2. Paste `summary` into the **Concise (summary)** field
3. Paste `answer_full` into the **Comprehensive** field
4. Use the **Scripture Picker** to search and attach each verse by reference — if it
   doesn't exist yet, use "Add new to library" to create it with the exact text and version
5. Use the **CCC Picker** to attach each paragraph number
6. Use the **Father Picker** to search and attach each quote — if not found, add it via
   "Add new to library" with the canonical author name and source
7. Save — references are stored as integer IDs in the DB and resolved at render time

### Option B — SQL Upsert

Use `documents/AIGenerated Content/upsert-{slug}.sql`. The SQL must follow this pattern:

```sql
-- Step 1: Insert references into the library tables (ON CONFLICT = skip if exists)
INSERT INTO scripture_verses (reference, version, text) VALUES
  ('John 1:14', 'NABRE', 'And the Word became flesh and made his dwelling among us.')
ON CONFLICT (reference, version) DO NOTHING;

INSERT INTO church_father_quotes (author, quote, source) VALUES
  ('St. John Damascene', 'I do not worship matter, I worship the God of matter.',
   'On the Divine Images, Oration I, §16 (c. 730)')
ON CONFLICT (author, quote) DO NOTHING;

-- Step 2: Upsert the topic, resolving IDs from the reference tables
INSERT INTO topics (id, lang, category, title, question, answer, answer_full,
                    scripture, catechism, church_fathers, objections,
                    tags, difficulty, related_topics, last_updated)
VALUES (
  'topic-slug', 'en', 'tradition', 'Topic Title',
  'The question?',
  jsonb_build_object('summary', $summary$...5-paragraph markdown...$summary$),
  $full$...comprehensive essay...$full$,
  -- resolve verse IDs via subquery
  (SELECT jsonb_agg(id ORDER BY id)
   FROM scripture_verses
   WHERE (reference, version) IN (('John 1:14','NABRE'))),
  '[1234, 1235]'::jsonb,
  -- resolve father IDs via subquery
  (SELECT jsonb_agg(id ORDER BY id)
   FROM church_father_quotes
   WHERE (author, quote) IN (('St. John Damascene','I do not worship matter...'))),
  '[{"objection":"...","response":"..."}]'::jsonb,
  '["tag-one"]'::jsonb, 'intermediate', '["related-slug"]'::jsonb,
  NOW()
)
ON CONFLICT (id, lang) DO UPDATE SET
  answer       = EXCLUDED.answer,
  answer_full  = EXCLUDED.answer_full,
  scripture    = EXCLUDED.scripture,
  catechism    = EXCLUDED.catechism,
  church_fathers = EXCLUDED.church_fathers,
  objections   = EXCLUDED.objections,
  tags         = EXCLUDED.tags,
  difficulty   = EXCLUDED.difficulty,
  related_topics = EXCLUDED.related_topics,
  last_updated = EXCLUDED.last_updated;
```

---

## Notes

- `summary` maps to the **Concise** tab in the app
- `answer_full` maps to the **Comprehensive** tab in the app
- `scripture`, `church_fathers`, and `objections` populate the **Brief** tab (clickable
  popovers) and the full reference sections below the answer
- The DB stores **integer IDs** into `scripture_verses` and `church_father_quotes` —
  the output JSON uses full objects so they can be inserted into those tables first
- Reference format consistency (full book names, canonical author names) is critical
  for `ON CONFLICT` deduplication — a mis-spelled author creates a duplicate row
- The `topic_id` must be unique kebab-case; it becomes the URL slug (e.g., `sacred-images` → `/sacred-images`)
- `translation_source` defaults to `'stub'` on new rows; run `pnpm db:translate` after
  inserting to generate TL/CEB versions
