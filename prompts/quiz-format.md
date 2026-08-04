# Quiz Generation

## Prompt

Rules:
- Each question has exactly 4 choices, all distinct strings — never repeat the same
  choice text twice within a question.
- Exactly one choice is correct; the other three must be plausible but clearly wrong
  to someone who read the page — no nonsensical filler distractors.
- Cover {{count}} distinct facts spread across the whole page — do not ask
  near-duplicate questions about the same fact reworded.
- Before writing a question that quotes or attributes a line to a specific speaker (an
  angel, a saint, Scripture, a Church Father, a council), verify against the page who
  actually said it — do not guess.
- If the page does not contain enough distinct material for {{count}} good questions,
  return fewer rather than padding with weak or repetitive ones, and say so in a note
  after the JSON.

Do not paste the JSON into the chat. Generate a downloadable `.json` file named
`{{topic_id}}-{{lang}}-{{tier}}.json` containing a single raw JSON array (no markdown
fences, no commentary inside the file) — one object per question,
"topic_id"/"tier"/"lang" repeated identically on every object:

[
  {
    "topic_id": "{{topic_id}}",
    "tier": "{{tier}}",
    "question": "...",
    "choices": ["...", "...", "...", "..."],
    "correct_index": 0,
    "lang": "{{lang}}"
  }
]

"correct_index" is the 0-based index of the correct choice within "choices" — vary it
across questions, don't put the correct answer in the same position every time.

After creating the file, give me only the download link plus, if any questions were
dropped for lack of source material, a short note explaining why.

## After generating

1. Save the returned JSON array to
   `content/quiz/generated/{{topic_id}}-{{lang}}-{{tier}}.json`.
2. Review each item against `documents/content-review-checklist.md` (citation
   grounding, theological accuracy, answer correctness, clarity) before moving it to
   `validated/`.
3. `bun tools/import-quiz.ts content/quiz/validated/{{topic_id}}-{{lang}}-{{tier}}.json`
   then `bun tools/promote-quiz.ts` the same path once the import lands, same as the
   `generate-quiz.ts` flow.

## Why this exists separately from `generate-quiz.ts`

`generate-quiz.ts` grounds on the topic's own Supabase row (`answer_full`, `scripture`,
`catechism`) via a local model — no browsing needed since the source is already in the
DB. This file is for the opposite case: a URL that isn't (yet) mirrored into Supabase,
or an external reference page, read live by a model with browsing (ChatGPT), with the
same anti-hallucination and schema constraints so the output is drop-in compatible.
