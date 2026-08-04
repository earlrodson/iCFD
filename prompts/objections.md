# Phase 7 — Objections

Model: `qwen3.5:9b` (try first; escalate to `qwen3:14b` for this phase only if output quality is
consistently weak during the end-to-end test run).

## Input

```
ARTICLE:
{{answer_full}}
```

## Prompt

```
Extract or draft the strongest objections a skeptic would raise against the article below, with
the Catholic response to each.

ARTICLE:
{{answer_full}}

Rules:
- 2-4 objections
- Phrase each objection the way a skeptic would actually phrase it — not a strawman
- The response must be grounded in points already made in the article above; do not introduce a
  new scripture reference, CCC number, or Father quote not already present in the article

Return ONLY the raw JSON object below — no explanation, no code fences, no extra text.
```

## Output

```json
{
  "objections": [
    { "objection": "The objection as a skeptic would phrase it.", "response": "The Catholic response." }
  ]
}
```
