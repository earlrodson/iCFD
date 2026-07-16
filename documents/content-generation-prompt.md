# Content Generation Prompt — Codex Defensoris

Use this prompt with Claude (or any capable model) to generate correctly formatted
topic content. Fill in the placeholders, send, and paste the returned JSON directly
into the Topic Editor or use it in an upsert SQL.

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
    { "reference": "Book Ch:Vv", "version": "NABRE", "text": "Full verse text." }
  ],
  "catechism": [
    "CCC 1234",
    "CCC 1235"
  ],
  "church_fathers": [
    { "author": "St. Name", "quote": "Direct quote.", "source": "Work Title, Section, Year" }
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

## Notes

- `summary` maps to the **Concise** tab in the app
- `answer_full` maps to the **Comprehensive** tab in the app
- `scripture`, `church_fathers`, and `objections` populate the **Brief** tab and the reference sections below the answer
- Paste the full JSON into the Topic Editor, or use `documents/AIGenerated Content/upsert-{slug}.sql` pattern to upsert directly into Supabase
- The `topic_id` must be unique kebab-case; it becomes the URL slug (e.g., `sacred-images` → `/sacred-images`)
- `translation_source` defaults to `'stub'` on new rows; run `pnpm db:translate` after inserting to generate TL/CEB versions
