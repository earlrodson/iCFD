# Codex Defensoris Content Generation Pipeline

**Version 1.2** — v1.1 closed three quality risks by *verifying* citations after generation.
v1.2 goes further: retrieval happens *before* generation, so Qwen drafts grounded in real CCC
paragraphs, conciliar texts, and patristic quotes instead of writing from memory and getting
caught after the fact. Verification becomes a safety net, not the primary defense.

## Goal

Generate thousands of high-quality Catholic apologetics topics while minimizing Claude token usage
— **without** trading away the accuracy and coherence of the existing hand-written topics.

**Core Principle**

* Local LLMs perform **generation**, grounded by **retrieval** — not by memory.
* A **canonical source layer**, exposed as a local RAG index, supplies both the passages Qwen
  drafts from and the facts validation checks against.
* Validation scripts enforce **structure and truth**, not just JSON shape.
* Claude performs **review**, **quality assurance**, and **architecture**.

Claude should never be the bulk content generator. Qwen should never write citation text — verse
text, CCC text, conciliar text, or patristic quotes — from memory; it should always be handed the
real passage and asked to reason about it.

---

# What Changed from v1.0 → v1.1 → v1.2

| Risk | v1.0 | v1.1 | v1.2 |
|---|---|---|---|
| `summary` / `answer_full` drift | generated independently | `summary` condenses `answer_full` | unchanged from v1.1 |
| Verse text accuracy | Qwen writes text from memory | Qwen picks reference only; assembler resolves real text | same, plus retrieval surfaces the *right* verses to cite in the first place |
| Father quote fabrication | Qwen writes quotes from memory | Qwen matches against a vetted library; misses flagged for Claude | Qwen is **handed** the top-K retrieved real quotes as context before drafting — fabrication drops at the source, library-match is now confirmation, not first defense |
| CCC / conciliar grounding | not addressed | not addressed | **new**: `answer_full` is drafted with retrieved CCC paragraphs, canons, and conciliar text already in the prompt — the model reasons over real text instead of recalling it |
| Validation | JSON shape only | + Reference Resolution + Father Quote Verification | unchanged — still the safety net, now catching fewer things because generation starts from real sources |

This is not a bigger-model upgrade. A 14B → 32B jump improves recall of facts the model already
half-remembers; retrieval removes the need to recall at all. The reliability gain is structural,
not a function of parameter count.

---

# Retrieval Layer: build it local and standalone, not inside Next.js

**Is RAG possible in Next.js?** Yes — it's just an API route doing embed → similarity search →
prompt assembly. Nothing about the framework blocks it.

**Should it live there?** No. Two reasons:

1. **This already exists in the repo, pointed at the wrong corpus.** `tools/vector-index.ts` /
   `tools/vector-search.ts` is a complete, working local RAG stack — bun + SQLite + Ollama
   (`nomic-embed-text` embeddings) + cosine similarity, zero cloud cost, zero Next.js coupling.
   It currently indexes source code (`app/ lib/ components/ store/ drizzle/`). The
   content-generation retriever is the same script shape pointed at the theology corpus instead:
   pull `ccc_paragraphs`, `canons`, `girm_articles`, `church_father_quotes`, `church_documents`
   from Supabase, embed each row, store in a separate local index (e.g.
   `.claude/vectors-theology.db`), query by topic title/question at generation time.
   Scripture is excluded from the retrieval corpus — verse lookup is exact-reference match
   (Phase 4), not semantic, so it doesn't need embedding.

2. **Content generation is an offline batch job, not a request-response flow.** It runs from the
   terminal against Qwen, not from a browser hitting the app. Coupling retrieval to a Next.js API
   route would mean standing up the app server just to run a content batch, and it entangles an
   authoring tool with the production app's deploy surface. A standalone script also travels to
   other projects for free — same script, different corpus — and stays portable to the planned
   private-server migration, since it only needs Postgres read access, nothing Supabase-specific.

If the app itself later wants user-facing RAG (an in-app "ask a question" feature), extract the
retrieval function into a shared module both the `tools/` script and an app API route can import.
Don't build that now — nothing in this pipeline needs it yet.

---

# Overall Architecture

```text
                  Claude Code
            (Architect / Reviewer)
                     │
                     ▼
          Prompt Library (Markdown)
                     │
                     ▼
        Local RAG Retrieval (tools/vector-search-theology.ts)
   top-K CCC paragraphs · canons · conciliar text · Father quotes
                     │
                     ▼
        ┌─────────────────────────┐
        │  Local LLM (Qwen)       │
        │  drafts grounded in     │
        │  retrieved passages     │
        └─────────────────────────┘
                     │
                     ▼
        Canonical Source Resolution
   (scripture_verses exact match / CCC exists / Father library confirm)
                     │
                     ▼
             JSON + Fact Validation
                     │
                     ▼
            Content Assembler
                     │
                     ▼
          Supabase Importer
                     │
                     ▼
                 Production
```

---

# Responsibilities

## Claude

Use Claude only for tasks requiring high-level reasoning or judgment calls a lookup can't settle.

Examples:

* Prompt engineering
* Theology review
* Historical review
* Architecture
* Refactoring
* SQL design
* TypeScript generation
* Content consistency
* Detecting contradictions
* Verifying the small number of Father quotes not found in the vetted library
* Final approval

Never use Claude to generate thousands of records.

---

## Qwen

Use Qwen for:

* Topic generation
* JSON generation
* Quiz generation
* Flashcards
* Metadata
* Tags
* Related topics
* Scripture **reference selection** (never verse text — see Phase 4)
* CCC reference selection
* Church Father quote **selection from the vetted library** (never invented quotes)
* Objections
* Translation drafts

---

## Canonical Source Layer (new in v1.1)

A deterministic, non-LLM layer that supplies facts the model must not be trusted to recall:

* **Scripture text** — a local corpus or API keyed by `(book, chapter, verse, version)` for
  NABRE / RSV-CE / DR / NAB. Given a reference Qwen selects, this resolves the exact verse
  string. Qwen never writes verse text into the output.
* **Father quote library** — a growing table of pre-vetted `(author, quote, source)` entries
  (seeded from `church_father_quotes`, the same table the app already reads from). Qwen searches
  it and cites by match; a miss is a flag, not a fabrication.
* **CCC paragraph index** — used to confirm a cited `CCC ####` number actually exists before it's
  accepted, catching the exact kind of error Claude currently has to catch by hand
  ("CCC reference should be CCC 971").

This layer is cheap (local DB reads), runs between generation and validation, and is what makes
"same quality, lower token cost" possible — it's the piece that was missing in v1.0.

---

# Prompt Library

Instead of maintaining one massive prompt, split prompts into reusable modules.

```
prompts/
  metadata.md
  answer.md
  summary.md          (condensation prompt, takes answer_full as input)
  scripture.md         (reference selection only)
  catechism.md
  church-fathers.md    (library search + selection only)
  objections.md
  quiz.md
  flashcards.md
```

Benefits

* Smaller prompts
* Easier maintenance
* Better instruction following
* Easier testing
* Lower failure rate

---

# Model Routing (Qwen 9B vs 14B)

Two local Qwen sizes, routed per phase. This is **not** a token-cost lever — local inference is
free either way, so it doesn't move the cloud (Claude) token number the rest of this pipeline
optimizes for. It's a quality/latency tradeoff: `14B` costs more compute time per call, spent only
where a phase does real synthesis rather than selection or condensation.

| Phase | Task | Model | Why |
|---|---|---|---|
| 1 — Metadata | tags, category, difficulty | `qwen3.5:9b` | trivial extraction |
| 2 — `answer_full` | retrieval-grounded synthesis, 1500–2500 words | `qwen3:14b` | hardest phase — every other field derives from it, so a quality miss here propagates everywhere |
| 3 — Summary | condense Phase 2's text | `qwen3.5:9b` | mechanical condensation, not independent reasoning |
| 4 — Scripture | select reference from retrieved passages | `qwen3.5:9b` | selection, not generation |
| 5 — Catechism | select CCC # from Phase 0 retrieval | `qwen3.5:9b` | selection |
| 6 — Church Fathers | select quote from Phase 0 retrieval | `qwen3.5:9b` | selection |
| 7 — Objections | generate | `qwen3.5:9b` (try first, escalate to `14b` if quality is weak) | moderate reasoning |

Only Phase 2 clearly justifies `14b`. Every other phase is selecting from or condensing text the
model was already handed (by Phase 0 retrieval or an earlier phase's output) — that's exactly the
kind of task retrieval was meant to make cheap, and throwing a bigger model at it would spend
compute without buying anything the architecture doesn't already provide for free.

---

# Generation Pipeline

Instead of asking for one 3,500-word JSON document...

```
One Prompt
↓
Everything
```

Generate in phases, in dependency order — later phases receive earlier phases' output as context
where content must stay consistent.

---

# Phase 0 — Retrieval (new in v1.2)

Before any generation, query the local theology RAG index with the topic title + question:

```
bun tools/vector-search-theology.ts "<topic title> <question>" --top 8 --json
```

Returns the top-K most relevant chunks across `ccc_paragraphs`, `canons`, `girm_articles`,
`church_documents`, and `church_father_quotes` — each tagged with its source table and ID so the
assembler can cite it precisely later. This is a local embedding lookup, not an LLM call — no
token cost at all.

These retrieved passages are passed into Phase 2's prompt as grounding context.

---

# Phase 1 — Metadata

Generate only:

```json
{
    "topic_id": "",
    "title": "",
    "category": "",
    "difficulty": "",
    "tags": [],
    "related_topics": []
}
```

Expected size: < 300 tokens

---

# Phase 2 — Comprehensive Answer (generated first, retrieval-grounded)

Input: the topic title/question, plus the top-K passages retrieved in Phase 0 (CCC paragraphs,
canons, GIRM articles, conciliar/document excerpts, candidate Father quotes) inserted into the
prompt as labeled context blocks.

Prompt instructs Qwen to write from the supplied passages, not from memory:

```
Use ONLY the passages below for CCC references, conciliar text, and Church Father quotes.
If a required section (e.g. an Ecumenical Council) has no matching passage below, write
"[NEEDS SOURCE: <what's missing>]" instead of inventing one.
```

Requirements

* 1500–2500 words
* Markdown
* Sections, tables, horizontal rules

This is the canonical article for the topic — every other field derives from it. Generating it
first, and treating it as the source of truth, is what keeps `summary` from drifting into a
different emphasis or a different doctrinal framing than the full answer. Grounding it in
retrieved passages is what keeps the CCC references, conciliar citations, and Father quotes real
in the first place, instead of catching fabrications after the fact in validation. Any
`[NEEDS SOURCE]` marker is a hard stop for the assembler — it means retrieval didn't find enough
for this topic, and it's cheaper to flag that now than to publish a plausible-sounding invention.

Return

```json
{ "answer_full": "..." }
```

---

# Phase 3 — Summary (condensation, not independent generation)

Input: the `answer_full` text from Phase 2.

Prompt instructs Qwen to **condense**, not re-derive:

```
Condense the article below into a 5-paragraph, 600–900 word summary.
Do not introduce claims, distinctions, or emphasis not present in the article.
Preserve the article's doctrinal framing exactly.
```

Requirements

* 5 paragraphs, 600–900 words, Markdown, no headers

Return

```json
{ "summary": "..." }
```

This single change — condense instead of regenerate — is the fix for the biggest quality risk in
v1.0 and costs nothing extra in tokens (still one local Qwen call).

---

# Phase 4 — Scripture

Qwen output — **references only, no verse text**:

```json
{
    "scripture": [
        { "reference": "John 1:14", "version": "NABRE" }
    ]
}
```

Rules

* Full book names, never abbreviations
* One verse per object — no ranges (matches the existing DB constraint: one row per verse,
  matched by exact string)
* Version must be one of NABRE, RSV-CE, DR, NAB

The assembler then resolves `text` from the canonical scripture corpus. If a reference doesn't
resolve, the record is rejected before it reaches validation — not silently dropped at render
time, which is what happens today if a range citation slips through.

---

# Phase 5 — Catechism

Generate only, selecting from the CCC paragraphs already surfaced in Phase 0 retrieval (falls back
to a fresh retrieval query if the topic needs a paragraph outside the top-K):

```json
{ "catechism": [] }
```

Each `CCC ####` is checked against the CCC paragraph index before acceptance — this stays as a
backstop even though retrieval already makes a wrong number unlikely, since it's a free lookup.

---

# Phase 6 — Church Fathers

Qwen selects from the Father quotes already retrieved in Phase 0 — the model is choosing among
real, verbatim quotes it was handed, not recalling one from memory:

```json
{
    "church_fathers": [
        { "author": "", "quote": "", "source": "", "library_match": true }
    ]
}
```

Rules

* Canonical author names (must match library convention for `ON CONFLICT` dedup)
* Direct quotes only, copied verbatim from the retrieved passage
* `library_match: false` (i.e. Qwen wrote a quote not present in Phase 0's retrieved set) →
  routed to the Claude verification pass in the Validation Pipeline below, never inserted
  unverified. This should now be rare — it means the topic needs a quote retrieval didn't surface,
  not a quote the model invented outright.

---

# Phase 7 — Objections

Generate only

```json
{ "objections": [] }
```

---

# Phase 8 — Merge

Node.js merges every fragment, plus resolved scripture text and CCC/Father verification results,
into

```
topic.json
```

---

# Validation Pipeline

Never trust LLM output directly, and never trust it just because it's valid JSON.

```
Generate
↓
JSON Schema
↓
Required Fields
↓
Markdown Validation
↓
Duplicate Detection
↓
Reference Resolution           (new: scripture reference → real corpus text, CCC number exists)
↓
Father Quote Verification      (new: library match, or flagged for Claude verification)
↓
Save
```

Reference Resolution and Father Quote Verification are the two stages that were missing in v1.0.
Both are cheap: the first is a deterministic corpus lookup (no LLM call at all), the second is
either a corpus lookup (library hit) or a short, targeted Claude call only for the quotes that
missed — typically a handful per topic, not the whole article.

---

# Self-Validation Prompt

Append this to every generation prompt.

```
Before returning:
✓ Verify valid JSON
✓ Verify every required key exists
✓ Verify no trailing commas
✓ Verify JSON.parse() succeeds
✓ Verify all arrays match schema
✓ Verify no null values unless allowed
Return ONLY JSON.
```

---

# Content Review

Only after JSON is complete and fact-validated.

Claude reviews.

```
Review ONLY.
Do not rewrite.

Check:
- Catholic doctrine
- Scripture interpretation (references are already known-real; check interpretation, not existence)
- Church Fathers (unverified quotes were already resolved before this step)
- Ecumenical Councils
- CCC references
- Historical accuracy

Return
Errors
Warnings
Suggestions
```

Claude should never regenerate the article unless requested. Because Reference Resolution and
Father Quote Verification already caught the mechanical errors (wrong CCC number, unverifiable
quote), this review is free to spend its tokens on judgment calls — doctrine and interpretation —
instead of fact-checking things a lookup could have caught.

---

# Specialized Reviews

Instead of one expensive review, perform multiple focused reviews.

## Theology Review
Checks: Doctrine, Dogma, Heresy, Terminology

## Scripture Review
Checks: Context, Interpretation, Misquotation
(Existence and exact text are no longer this review's job — Phase 4 + Reference Resolution
already guarantee the verse is real and correctly quoted. This review checks whether it's being
*used* correctly.)

## Historical Review
Checks: Councils, Fathers, Dates, Historical claims

## Editorial Review
Checks: Readability, Grammar, Flow, Repetition

---

# Database Import

```
topic.json
↓
Validator
↓
Importer
↓
Supabase
```

No manual SQL writing. Generate SQL only if needed for migrations.

---

# Token Optimization Strategy

## Expensive (avoid)

Claude generates: Summary, Full Answer, JSON, References → very high token usage.

## Efficient (this pipeline)

Qwen generates everything; the canonical source layer supplies facts; Claude only reviews
judgment calls.

Example Claude output:

```
Errors
1. Latria/dulia distinction in paragraph 3 conflates the two — needs correction.

Warnings
1. Consider mentioning the Council of Ephesus alongside Chalcedon.

Suggestions
1. Clarify the distinction between latria and dulia earlier in the article.
```

Note what's *not* in this list anymore: wrong CCC numbers and unverifiable quotes, because those
are now caught mechanically before Claude ever sees the record. The review stays a few hundred
tokens, but it's now spent entirely on things only Claude can judge — which is also why quality
doesn't regress even though Claude sees less of the raw content.

---

# Recommended Workflow

```
Claude
↓
Improve Prompt
↓
Qwen (answer_full → summary → scripture refs → CCC → Father quotes → objections)
↓
Canonical Source Resolution (verse text, CCC existence, Father library match)
↓
Validator (structure + facts)
↓
Merge
↓
Claude Review (judgment calls only)
↓
Human Approval
↓
Publish
```

---

# Folder Structure

```
content/
  topics/
  quiz/
  flashcards/
  translations/
  generated/
  validated/
  published/
  prompts/
    metadata.md
    answer.md
    summary.md
    scripture.md
    catechism.md
    church-fathers.md
    objections.md
    quiz.md
  sources/
    scripture-corpus/     # NABRE / RSV-CE / DR / NAB verse text, keyed for exact lookup
    father-quotes/        # vetted quote library, seeded from church_father_quotes
```

---

# Long-Term Vision

The canonical theological article (`answer_full`) is the authoritative source. Everything else —
summary, quiz, flashcards, timeline, infographic, study guide, social media, translations — is
derived from it, generated once, and reused everywhere.

```
Canonical Article
↓
Summary
↓
Quiz
↓
Flashcards
↓
Timeline
↓
Infographic
↓
Study Guide
↓
Social Media
↓
Translations
```

This approach maximizes consistency, minimizes cloud token usage, and — with the retrieval-grounded
generation added in v1.2 on top of the fact-validation stages from v1.1 — holds the line on quality
instead of trading it away for cost. The next reliability gain here comes from growing the
retrieval corpus (more indexed conciliar texts, more Father quotes), not from a bigger local model.
It's suitable for scaling to thousands of Catholic apologetics topics.
