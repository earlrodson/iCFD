# Phase 2 — Comprehensive Answer (retrieval-grounded)

Model: `qwen3:14b` — the one phase that justifies the larger model (see Model Routing in
`documents/VerifyArchitecture/content-generation-architecture-proposal.md`). Every other field is
derived from this one, so a quality miss here propagates everywhere.

## Input

```
TOPIC: {{topic_title}}
QUESTION: {{apologetics_question}}

RETRIEVED PASSAGES (from Phase 0 — bun tools/vector-search-theology.ts):
{{retrieved_passages}}
```

`{{retrieved_passages}}` is the top-K JSON array from Phase 0, formatted as labeled blocks, e.g.:

```
[CCC 1234] "..."
[Canon 1055] "..."
[GIRM 27] "..."
[church_documents: Lumen Gentium §8] "..."
[church_father_quotes: St. John Chrysostom] "..."
```

## Prompt

```
You are a Catholic apologetics content writer for the "Codex Defensoris" app — a mobile reference
for Filipino Catholics. Write the comprehensive answer for the topic below.

TOPIC: {{topic_title}}
QUESTION: {{apologetics_question}}

RETRIEVED PASSAGES (use these — do not rely on memory for any of them):
{{retrieved_passages}}

CRITICAL — Use ONLY the passages above for CCC references, conciliar text, and Church Father
quotes. If a required section below has no matching passage above, write
"[NEEDS SOURCE: <what's missing>]" in its place instead of inventing a citation. This is a hard
stop for the assembler — flagging a gap is correct behavior, inventing a citation is not.

Write in clear, modern English for a lay Catholic audience. Bold key theological terms on first
use (e.g. **latria**, **hyperdulia**). Cite scripture inline by reference only, e.g. (John 1:14) —
never write the verse text yourself, the assembler resolves it separately (see scripture.md).

"answer_full" — 1,500–2,500 words:
- Open with a Markdown blockquote (Father or Council quote, from the passages above)
- 2-3 sentence thesis paragraph before any section headers
- Use ## for major sections, ### for sub-points
- Required sections (any logical order):
    1. Exegetical analysis of the key biblical text invoked in the objection
    2. Positive biblical evidence (at least 3 passages with commentary, references only)
    3. The core theological distinction at stake
    4. At least 3 named Church Fathers with direct quotes and sources, copied verbatim from the
       retrieved passages above
    5. One Ecumenical Council with its definition, from the retrieved passages
    6. A CCC reference table (Markdown table: Reference | Teaching), numbers from the retrieved
       passages only
    7. Common Objections section (bold each objection, answer in prose below it)
    8. A 2-3 sentence conclusion
- Use --- between all major ## sections
- Format patristic/conciliar quotes as Markdown blockquotes
- Use Markdown tables for comparisons

Before returning:
✓ Verify every Father quote and CCC number traces to one of the retrieved passages above
✓ Verify valid JSON, JSON.parse() succeeds, no trailing commas

Return ONLY the raw JSON object below — no explanation, no code fences, no extra text.
```

## Output

```json
{ "answer_full": "..." }
```
