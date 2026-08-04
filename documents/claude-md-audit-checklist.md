# CLAUDE.md Token Optimization Audit Checklist (v4)

> Purpose: Evaluate whether a Universal `CLAUDE.md` and a Project `CLAUDE.md` are optimized for low token usage, low cost, high quality, and long-term maintainability.

> Changes from v1: removed unfalsifiable items, dropped the fake /100 scoring, split file-level concerns from workflow-level concerns, added a token-count header and an ablation test. Runtime topics (model routing, conversation memory, output verbosity) moved to a separate workflow audit — they don't belong in a static-file checklist and grading a file on them just encourages stuffing routing policy into the file, which costs tokens on every session.
>
> Changes from v2: added a Measurable Limits section, splitting evidence-based recommendations (sourced from Anthropic's docs and practitioner data) from project conventions (single source of truth, retrieval granularity, no duplicated facts — internal rules with no external citation). Replaced the fixed 2,000-token cutoff with a three-tier health table so it reads as a review trigger, not a hard rule.

> Changes from v3: added token-counting commands to Step 0 (exact via the count_tokens endpoint, offline proxy, in-session), plus a tokenizer-generation caveat. Replaced the arbitrary unchecked-item thresholds in Final Evaluation with a weighted Blocking/High/Advisory rubric, and marked Part B as qualitative by design rather than by oversight.

---

# Step 0: Measure Before You Grade

Fill this in before touching any checkbox. This is the only number that matters more than the checklist.

| File | Token count | Last updated | Last ablation test |
|------|------------:|--------------|---------------------|
| Universal CLAUDE.md | | | |
| Project CLAUDE.md | | | |

## How to get the token count

**Exact (recommended)** — Anthropic's token counting endpoint returns the count under the tokenizer of the model you pass:

```bash
count_md() {
  jq -Rs --arg m "claude-opus-5" \
    '{model:$m, messages:[{role:"user",content:.}]}' "$1" \
  | curl -s https://api.anthropic.com/v1/messages/count_tokens \
      -H "x-api-key: $ANTHROPIC_API_KEY" \
      -H "anthropic-version: 2023-06-01" \
      -H "content-type: application/json" \
      -d @- | jq -r '.input_tokens'
}

count_md ~/.claude/CLAUDE.md
count_md ./CLAUDE.md
```

**Rough offline proxy** — good enough to spot a 🔴, not for tracking trends:

```bash
awk '{w+=NF} END {printf "~%d tokens\n", w*1.35}' CLAUDE.md
```

**In-session** — `/context` in Claude Code shows what's actually loaded, including MCP schemas and skill descriptions. Useful for seeing your true session floor, not just this one file.

> **Tokenizer note**: token counts vary between model families, sometimes by 30% or more for identical text. Always measure with the tokenizer for the model you actually use, and re-baseline your thresholds after a model-generation change.

---

# Part A: File Audit (CLAUDE.md itself)

## 1. Universal CLAUDE.md

- [ ] Contains permanent engineering principles only
- [ ] No project-specific implementation details
- [ ] No temporary TODOs or sprint tasks
- [ ] No duplicate information from project CLAUDE.md
- [ ] Stable enough to survive months without edits
- [ ] Stores standards instead of examples

## 2. Project CLAUDE.md

- [ ] Contains project architecture
- [ ] Lists technology stack
- [ ] Documents coding conventions
- [ ] Documents directory structure
- [ ] Includes important design decisions
- [ ] Contains recurring commands
- [ ] Excludes temporary conversations and implementation history

## 3. Context Assembly (Retrieval & Pruning)

- [ ] Avoids explaining unrelated modules
- [ ] Large reference documents are not embedded — referenced instead
- [ ] Architecture is modular with clear project boundaries
- [ ] A task touching one subsystem does not require reading the whole file

## 4. Search & Indexing

- [ ] Promotes grep/ripgrep for exact-match lookups (symbol references, error strings, config keys)
- [ ] Promotes semantic/vector search only for fuzzy or conceptual queries — not as a default or forced first step
- [ ] Directory structure and naming support quick lookup without a search tool at all

## 5. Caching & Automatic Invalidation

- [ ] Stable information (schema, architecture) is stored once, not regenerated per session
- [ ] Refresh triggers are documented (git diff, schema change, dependency update)
- [ ] Cache/snapshot regeneration is tied to a hook or CI step, not manual discipline
- [ ] Cache ownership is defined — one clear source of truth per fact

## 6. Automation

- [ ] Refreshes automatically when code changes
- [ ] Uses git metadata or generated docs instead of manual synchronization
- [ ] No red-flag risk of stale architecture (see below)

## 7. Native Platform Features

Before adding custom tooling, confirm it isn't already built in:

- [ ] Checked built-in search/agents/memory/prompt caching before building a custom equivalent
- [ ] Custom tooling adds something measurable over the native feature (state what, specifically)

## 8. Maintainability

- [ ] No duplicated sections across the two files
- [ ] No conflicting instructions
- [ ] Organized under headings, in small sections

---

# Part B: Workflow Audit (runtime behavior — separate from the file itself)

These concern *how you work*, not what's written in CLAUDE.md. Audit separately; don't let passing/failing these push you to add routing or memory policy into the file.

## Model Routing & Delegation

- [ ] Tasks suitable for a local/small model are identified and actually routed there
- [ ] Frontier model reserved for reasoning-heavy or ambiguous work
- [ ] Cost optimization is tracked separately from token optimization — a routing win is not a token win

## Conversation Memory

- [ ] Long conversation histories are summarized rather than carried in full
- [ ] Permanent knowledge gets promoted out of chat into a file; temporary discussion doesn't

## Output Optimization

- [ ] Default requests favor patches/diffs over full-file rewrites where possible
- [ ] Verbosity default is set explicitly, not left to whatever the model defaults to

---

# Measurable Limits

Some limits below are supported by industry guidance. Others are project conventions with no external source — both are useful, but they carry different weight, so they're kept separate.

## Evidence-based recommendations

- **Target size**: keep a lean CLAUDE.md around 300–600 tokens whenever practical.
- **Warning threshold**: review the file once it exceeds ~2,000 tokens — larger persistent prompts become harder to maintain and are more likely to contain redundant or stale information.

Line count is intentionally not used as the metric here. A table or bullet list burns lines fast; one long paragraph can be 5 lines and 500 tokens. Tokens are the unit that actually costs you something every session, so they're what gets measured.

| Size | Status | Action |
|---|---|---|
| ≤600 tokens | 🟢 Excellent | No action |
| 600–2,000 tokens | 🟡 Review | Check for redundancy |
| >2,000 tokens | 🔴 Audit | Split, refactor, or move information out |

2,000 is not a hard cutoff — it's the point past which an audit becomes worth your time.

## Project conventions (no external standard — your own rules)

- **Single source of truth**: each architectural fact exists in only one authoritative location. CLAUDE.md references that source rather than duplicating it.
- **Retrieval granularity**: content is organized into small, self-contained sections so a task only loads the relevant piece, not the whole file.
- **No duplicated facts**: the Universal and Project CLAUDE.md files don't repeat the same information unless there's a deliberate reason.

---

# Red Flags (any one of these overrides a high score)

- [ ] Same information appears in both files
- [ ] Full API surface or large generated file pasted into CLAUDE.md
- [ ] Old completed tasks or historical conversations still present
- [ ] Any instruction contradicts another instruction in the same file

---

# Ablation Test (replaces "would removing this reduce quality?")

Don't self-grade this — test it:

1. Pick 3 representative tasks you'd normally hand to Claude Code in this project.
2. Run them once with the section in question intact.
3. Delete the section, run the same 3 tasks fresh.
4. If output quality is indistinguishable, the section was pure token cost — cut it or shrink it.
5. Log the result in the Step 0 table so the next audit doesn't repeat the test blind.

---

# Final Evaluation

Checkboxes are not equal in weight. A missing commands section costs you on every session; a slightly disorganized heading costs you nothing. Grade by severity class, not by count.

## Severity classes

**Blocking** — fix before the audit passes. Each of these either corrupts output or silently multiplies cost:

- Any Red Flag checked
- Any stale-risk item failing in §5 or §6 (refresh not tied to a hook, no cache ownership)
- File in the 🔴 tier (>2,000 tokens)
- Conflicting instructions between Universal and Project files

**High** — fix this pass. Each has a direct, repeating token or quality cost:

- §1: project-specific detail in Universal, or TODOs/sprint tasks present
- §2: missing recurring commands or tech stack (highest-ROI content in the file)
- §3: large documents embedded instead of referenced
- §4: exact-match search discouraged or blocked in favor of semantic search
- File in the 🟡 tier with no ablation test on record

**Advisory** — fix when convenient. Real but low-amplitude:

- §7 native-feature checks
- §8 organization and section-size items
- Part B items (qualitative by design — see note below)

## Verdict

| Condition | Verdict |
|---|---|
| 0 Blocking, ≤2 High | **Pass** — audit again in a quarter or after a major refactor |
| 0 Blocking, 3+ High | **Conditional** — usable, but schedule the cleanup |
| Any Blocking | **Fail** — fix before scaling AI-assisted work on this repo |

## Trend check (overrides the verdict)

If a file's token count has risen across three consecutive audits with no ablation test justifying the growth, treat it as **Conditional** regardless of how the checkboxes score. Drift is the failure mode this document exists to catch, and a snapshot never shows it.

> Note on Part B: the workflow audit is deliberately qualitative. Runtime behavior varies too much per session to threshold honestly, and inventing numbers for it would repeat the mistake this version removed. Score it as a discussion prompt, not as a gate.

---

# Guiding Principle

> Every persistent token should eliminate more future tokens than it costs. If a sentence no longer saves context, delete it.
