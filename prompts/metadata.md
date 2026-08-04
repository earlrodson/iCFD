# Phase 1 — Metadata

Model: `qwen3.5:9b`

## Input

```
TOPIC: {{topic_title}}
QUESTION: {{apologetics_question}}
```

## Prompt

```
You are generating metadata only for a Catholic apologetics topic in the "Codex Defensoris" app.
Do not write any article content. Return ONLY the JSON object below.

TOPIC: {{topic_title}}
QUESTION: {{apologetics_question}}

Rules:
- topic_id: unique kebab-case slug, becomes the URL slug (e.g. "sacred-images")
- category: one of tradition | scripture | sacraments | morality | history | apologetics
- difficulty: one of beginner | intermediate | advanced
- tags: 3-6 short kebab-case tags
- related_topics: 2-4 kebab-case slugs of plausible related topics (best guess, the assembler
  will validate these exist)

Return ONLY the raw JSON object below — no explanation, no code fences, no extra text.
```

## Output

```json
{
  "topic_id": "kebab-case-slug",
  "title": "Topic Display Title",
  "category": "tradition | scripture | sacraments | morality | history | apologetics",
  "difficulty": "beginner | intermediate | advanced",
  "tags": ["tag-one", "tag-two", "tag-three"],
  "related_topics": ["other-topic-slug", "another-topic-slug"]
}
```

Expected size: < 300 tokens.
