---
schema_version: 1
id: quiz-completion-duration
title: Track time-to-finish for topic quiz attempts
type: feature
status: validating
priority: medium
owners: [earlrodson]
estimate_hours: 6
hours_logged: 6
created: 2026-08-29
updated: 2026-08-29
---

## Description
`quiz_attempts` currently records only a single `attempted_at` completion
timestamp — there is no way to see how long a user took to finish a topic
quiz. This feature adds a `duration_ms` column captured client-side from
first question render to submit, threaded through the existing submit API
into the existing `quiz_attempts` row.

## Traceability & Strategic Intent
- **Outcome Alignment:** Improve visibility into quiz difficulty/engagement.
- **Strategy Intent:** Learners and admins reviewing quiz performance, not
  just pass/fail.
- **Execution Intent:** No timing signal exists today anywhere in the quiz
  flow — `duration_ms` on `page_views` is unrelated pageview analytics, not
  quiz-attempt data.
- **Benefit Hypothesis:**
  - *By implementing:* per-attempt duration capture end-to-end.
  - *We will improve:* ability to spot quizzes that are too long/short and
    surface completion time to learners and admins.
  - *As measured by:* `duration_ms` populated on new `quiz_attempts` rows.

## Product Context
- **Customer Context:** Signed-in users taking a topic quiz at any tier;
  admins reviewing quiz attempt history.
- **Operating Context:** Next.js App Router, Supabase/Postgres via
  `app/api/quiz/route.ts`, quiz UI under `app/quiz/[topicId]/[tier]/`.
- **Ecosystem Context:** No external APIs; purely internal schema + API +
  client change.
- **Regulatory Context:** None beyond existing auth gating on quiz submission
  (sign-in already required to POST an attempt).

## Behavior Specifications

```gherkin
Scenario: User completes a quiz within the time limit
  Given a signed-in user starts a topic quiz
  When they submit answers after answering all questions
  Then the resulting quiz_attempts row stores the elapsed duration in milliseconds

Scenario: User's client clock drifts or duration is missing
  Given the submit request omits or sends an invalid durationMs
  When the server processes the submission
  Then the attempt is still scored and saved with duration_ms left null

Scenario: Admin reviews quiz attempt history
  Given quiz_attempts rows have duration_ms populated
  When an admin views attempt history for a topic/tier
  Then completion time is visible alongside score and pass/fail
```

## Acceptance criteria
- [x] `quiz_attempts` gains a nullable `duration_ms integer` column via a new
      migration in `supabase/migrations/`
- [x] Quiz UI captures a start timestamp when the first question set renders
      and computes elapsed ms at submit time
- [x] `POST /api/quiz` accepts an optional `durationMs` field and persists it
      on the inserted `quiz_attempts` row
- [x] Missing/invalid `durationMs` never blocks scoring or insertion —
      stored as null
- [x] `drizzle/schema.ts` and `lib/supabase/database.types.ts` updated to
      match the new column

## Todos
- [x] Add migration for `quiz_attempts.duration_ms` (@earlrodson, est 1h, due 2026-08-29, done 2026-08-29)
- [x] Update `drizzle/schema.ts` + regenerate `database.types.ts` (@earlrodson, est 1h, due 2026-08-29, done 2026-08-29)
- [x] Capture start time + compute duration in quiz UI (@earlrodson, est 2h, due 2026-08-29, done 2026-08-29)
- [x] Accept and persist `durationMs` in `app/api/quiz/route.ts` POST (@earlrodson, est 1h, due 2026-08-29, done 2026-08-29)
- [ ] Surface duration in any admin/attempt-history view, if one exists (@earlrodson, est 1h)

## Daily log
- 2026-08-29 (@earlrodson, 0h): Spec drafted after confirming no existing
  duration tracking for quiz attempts.
- 2026-08-29 (@earlrodson, 6h): Implemented end-to-end — migration applied
  live (`supabase/migrations/20260829001633_quiz_attempts_duration_ms.sql`),
  `drizzle/schema.ts` + `database.types.ts` updated, `POST /api/quiz`
  validates/clamps `durationMs` (max 1h) before insert, `QuizClient.tsx`
  tracks `startedAtRef` from question-load to submit and threads the value
  through the sign-in-interrupt resume path so redirect time is never
  counted. Lint, type-check, and quiz unit tests (162) all green; migration
  verified live via `information_schema.columns`. No admin/attempt-history
  UI exists yet to surface this in — left as an open todo.

## Decisions & risks
- Client-reported duration is not tamper-proof (a user could send an
  arbitrary value) — acceptable since this is an engagement/analytics
  signal, not something pass/fail or certificates depend on.
- Clamped to 1 hour max (`MAX_QUIZ_DURATION_MS` in `app/api/quiz/route.ts`)
  rather than the 24h used for page-view duration — a quiz session left open
  that long is not meaningful time-on-task.

## Links
- PR:
- Branch:
