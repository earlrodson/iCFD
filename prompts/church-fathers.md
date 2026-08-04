# Phase 6 — Church Fathers (library search + selection only)

Model: `qwen3.5:9b` — selection, not generation.

## Input

```
ARTICLE:
{{answer_full}}

RETRIEVED FATHER QUOTES (from Phase 0):
{{retrieved_father_quotes}}
```

## Prompt

```
Select the Church Father quotes that support the article below, from the retrieved quotes
provided. These are real, verbatim quotes already retrieved — choose among them, copy exactly,
do not paraphrase or invent a new one.

ARTICLE:
{{answer_full}}

RETRIEVED FATHER QUOTES:
{{retrieved_father_quotes}}

Rules:
- Author: canonical name form only — must match the form used in the retrieved passage exactly
  (matters for ON CONFLICT dedup against church_father_quotes)
- Quote: copied verbatim from the retrieved passage, never summarized
- Source: copied verbatim from the retrieved passage
- If the article needs a Father quote not present in the retrieved set, set
  "library_match": false for that entry and still include your best-effort author/quote/source —
  it will be routed to Claude for verification, never inserted unverified

Return ONLY the raw JSON object below — no explanation, no code fences, no extra text.
```

## Output

```json
{
  "church_fathers": [
    { "author": "", "quote": "", "source": "", "library_match": true }
  ]
}
```

`library_match: false` should now be rare — it means the topic needs a quote retrieval didn't
surface, not a quote the model invented outright.
