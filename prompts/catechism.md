# Phase 5 — Catechism (selection from Phase 0 retrieval)

Model: `qwen3.5:9b` — selection, not generation.

## Input

```
ARTICLE:
{{answer_full}}

RETRIEVED CCC PARAGRAPHS (from Phase 0):
{{retrieved_ccc_passages}}
```

## Prompt

```
Select the CCC paragraph numbers that support the article below, from the retrieved passages
provided. Do not invent a number that isn't in the retrieved set — if the article references a
CCC number not present below, note it is unresolved and it will be re-queried.

ARTICLE:
{{answer_full}}

RETRIEVED CCC PARAGRAPHS:
{{retrieved_ccc_passages}}

Return ONLY the raw JSON object below — no explanation, no code fences, no extra text.
```

## Output

```json
{ "catechism": ["CCC 1234", "CCC 1235"] }
```

Each number is checked against the CCC paragraph index before acceptance — a free lookup, kept as
a backstop even though retrieval already makes a wrong number unlikely. If a needed paragraph
isn't in the Phase 0 top-K, the assembler re-queries `vector-search-theology.ts` restricted to
`ccc_paragraphs` before falling back to a validation flag.
