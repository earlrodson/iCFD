# Phase 3 — Summary (condensation, not independent generation)

Model: `qwen3.5:9b` — mechanical condensation, not synthesis.

## Input

```
ARTICLE:
{{answer_full}}
```

`{{answer_full}}` is Phase 2's output, verbatim.

## Prompt

```
Condense the article below into a 5-paragraph, 600-900 word summary for the "Codex Defensoris" app.

ARTICLE:
{{answer_full}}

Rules:
- Do NOT introduce claims, distinctions, or emphasis not present in the article
- Preserve the article's doctrinal framing exactly
- Open with a Markdown blockquote from a Church Father or Council quoted in the article
- Paragraph 1: State the Catholic position clearly and firmly
- Paragraph 2: Address the main biblical objection or common misreading
- Paragraph 3: Give the strongest positive biblical or historical evidence
- Paragraph 4: Explain the key theological distinction
- Paragraph 5: Close with early Church evidence or a Council definition
- Format: Markdown, flowing prose only — no headers, no bullet lists
- Any scripture reference, CCC number, or Father quote you use must already appear in the
  article above — do not add a new one

Return ONLY the raw JSON object below — no explanation, no code fences, no extra text.
```

## Output

```json
{ "summary": "..." }
```

This is the fix for the biggest v1.0 quality risk (summary/answer_full drift) and costs nothing
extra in tokens — still one local call.
