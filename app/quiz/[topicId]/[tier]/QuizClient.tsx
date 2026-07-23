'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, XCircle, Warning } from '@phosphor-icons/react'
import { getUser } from '@/lib/supabase/auth'

interface QuizQuestion {
  id: number
  question: string
  choices: string[]
}

interface QuizClientProps {
  topicId: string
  tier: string
  topicTitle: string
}

// sessionStorage key used to resume a submission after a sign-in redirect —
// preserves the "browse and attempt freely, only gate at submission" design.
function pendingKey(topicId: string, tier: string) {
  return `pending-quiz-submit:${topicId}:${tier}`
}

export function QuizClient({ topicId, tier, topicTitle }: QuizClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathSlug = searchParams.get('path') ?? undefined

  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ scorePercent: number; passed: boolean; correctCount: number; total: number } | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const loadQuestions = useCallback(() => {
    setLoadError(null)
    setQuestions(null)
    setResult(null)
    setAnswers({})
    fetch(`/api/quiz?topicId=${encodeURIComponent(topicId)}&tier=${encodeURIComponent(tier)}`)
      .then(async (res) => {
        const body = await res.json()
        if (!res.ok) throw new Error(body.error ?? 'Failed to load quiz')
        setQuestions(body.questions)
      })
      .catch((err) => setLoadError(err.message))
  }, [topicId, tier])

  useEffect(() => { loadQuestions() }, [loadQuestions])

  const submit = useCallback(async (questionIds: number[], answerList: number[]) => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId, tier, questionIds, answers: answerList, pathSlug }),
      })
      const body = await res.json()
      if (res.status === 401) {
        // Hold the pending submission, prompt sign-in, resume on return —
        // the quiz itself was never gated, only this final step is.
        sessionStorage.setItem(pendingKey(topicId, tier), JSON.stringify({ questionIds, answers: answerList, pathSlug }))
        router.push(`/account?return=${encodeURIComponent(window.location.pathname + window.location.search)}`)
        return
      }
      if (!res.ok) throw new Error(body.error ?? 'Submission failed')
      sessionStorage.removeItem(pendingKey(topicId, tier))
      setResult(body)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }, [topicId, tier, pathSlug, router])

  // Resume a submission that was interrupted by a sign-in redirect.
  useEffect(() => {
    const pending = sessionStorage.getItem(pendingKey(topicId, tier))
    if (!pending) return
    getUser().then((user) => {
      if (!user) return
      const { questionIds, answers: answerList } = JSON.parse(pending)
      submit(questionIds, answerList)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId, tier])

  function handleSubmit() {
    if (!questions) return
    const questionIds = questions.map((q) => q.id)
    const answerList = questions.map((q) => answers[q.id] ?? -1)
    submit(questionIds, answerList)
  }

  const allAnswered = questions ? questions.every((q) => answers[q.id] !== undefined) : false

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-8">
        <Link
          href={pathSlug ? `/paths/${pathSlug}` : `/${topicId}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft weight="light" size={16} />
          Back
        </Link>

        <h1 className="text-xl font-bold text-foreground capitalize">{topicTitle} — {tier} quiz</h1>

        {loadError && (
          <div className="mt-6 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-400">
            <Warning weight="fill" size={16} className="shrink-0" />
            {loadError}
          </div>
        )}

        {result && (
          <div className={`mt-6 rounded-2xl border p-5 ${result.passed ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-900/20' : 'border-rose-200 bg-rose-50 dark:border-rose-800/60 dark:bg-rose-900/20'}`}>
            <div className="flex items-center gap-2">
              {result.passed
                ? <CheckCircle weight="fill" size={22} className="text-emerald-600 dark:text-emerald-400" />
                : <XCircle weight="fill" size={22} className="text-rose-600 dark:text-rose-400" />}
              <p className="text-base font-semibold text-foreground">
                {result.passed ? 'Passed!' : 'Not quite — try again next week'}
              </p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {result.correctCount} / {result.total} correct ({result.scorePercent}%)
            </p>
          </div>
        )}

        {!result && questions && (
          <div className="mt-6 space-y-6">
            {questions.map((q, i) => (
              <div key={q.id} className="rounded-2xl border border-border bg-card p-4">
                <p className="mb-3 text-sm font-medium text-foreground">{i + 1}. {q.question}</p>
                <div className="space-y-2">
                  {q.choices.map((choice, choiceIdx) => (
                    <label
                      key={choiceIdx}
                      className="flex items-center gap-2.5 rounded-xl border border-border px-3 py-2 text-sm cursor-pointer transition-colors hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        checked={answers[q.id] === choiceIdx}
                        onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: choiceIdx }))}
                        className="h-4 w-4"
                      />
                      <span className="text-foreground">{choice}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {submitError && <p className="text-sm text-rose-600 dark:text-rose-400">{submitError}</p>}

            <button
              onClick={handleSubmit}
              disabled={!allAnswered || submitting}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Submitting…' : 'Submit Quiz'}
            </button>
          </div>
        )}

        {result && (
          <button
            onClick={loadQuestions}
            className="mt-6 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Try a different set
          </button>
        )}
      </div>
    </div>
  )
}
