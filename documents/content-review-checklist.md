# Content Review Checklist (Claude, in-session)

Applies to any `qwen3:14b`-generated content — quiz questions, topics, objections —
after it passes structural validation (`validate-topic.ts` or equivalent) and before
it moves to `published/`. This is a judgment pass, not a mechanical one — it stays a
manual/in-session review, not a scripted API call, so it only costs input tokens to
read the content plus a short verdict, never a full regeneration. See project
`CLAUDE.md` → "Local LLM use in this project" for why generation and review are kept
on different tiers (14b drafts, Claude judges).

## Per-item checks

1. **Citation grounding** — every scripture reference, CCC number, and Church Father
   quote actually appears in the topic's own `scripture`/`catechism`/`church_fathers`
   fields or the retrieved passages it was generated from. Flag anything cited that
   isn't traceable to source.
2. **Theological accuracy** — no claim contradicts or overstates what the source
   material says, and nothing conflicts with actual Catholic teaching. This is the
   check a script cannot do; it's the reason this step exists.
3. **Answer correctness (quiz only)** — `correct_index` genuinely points at the right
   choice per the source material, and no distractor is *arguably* also correct.
4. **Clarity** — question/prose is unambiguous, distractors are plausible (not
   nonsensical filler), and nothing is doctrinally misleading if skimmed.

## Verdict

- **Pass** → move to `validated/` (quiz) or leave in `validated/` → `published/` flow
  (topics, matching the existing `published: false` DB default as the final gate).
- **Fail** → move to (or leave in) `needs-review/` with the specific defect noted
  inline (not just "looks wrong" — name the check that failed and why).

## Cost note

Reading N generated items + writing a short verdict is input-token-dominated: cheap.
Do not "fix" a failed item by having Claude rewrite it wholesale in this pass — send
the specific defect back to the local model for a targeted regeneration first. Only
escalate to Claude-authored content if the same item fails the same check twice.
