# Phase 4 — Scripture (reference selection only, never verse text)

Model: `qwen3.5:9b` — selection, not generation.

## Input

```
ARTICLE:
{{answer_full}}
```

## Prompt

```
Extract every scripture reference cited in the article below. Output references only — never
verse text, the assembler resolves that from the canonical scripture corpus.

ARTICLE:
{{answer_full}}

Rules:
- Full book names, never abbreviations: "John 1:14" not "Jn 1:14"
- Chapter:verse with colon separator
- One verse per entry — NEVER a range like "1 Corinthians 11:24-25". The database stores one row
  per single verse and matches by exact string; a range silently fails to resolve. If several
  consecutive verses are needed, list each as its own entry.
- version must be one of: NABRE, RSV-CE, DR, NAB — default to NABRE unless another is more
  precise for the topic

Return ONLY the raw JSON object below — no explanation, no code fences, no extra text.
```

## Output

```json
{
  "scripture": [
    { "reference": "John 1:14", "version": "NABRE" }
  ]
}
```

The assembler resolves `text` from the canonical scripture corpus (`scripture_verses` table). If a
reference doesn't resolve, the record is rejected before it reaches validation — not silently
dropped at render time.
