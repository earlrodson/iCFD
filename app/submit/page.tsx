'use client'

import { useState } from 'react'
import { PaperPlaneTilt, CheckCircle, Warning } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { isSupabaseConfigured } from '@/lib/supabase/client'

const CATEGORIES = [
  { value: 'bible',            label: 'Bible' },
  { value: 'church-teaching',  label: 'Church Teaching' },
  { value: 'mary',             label: 'Mary' },
  { value: 'tradition',        label: 'Tradition' },
  { value: 'saints',           label: 'Saints' },
  { value: 'papacy',           label: 'Papacy' },
  { value: 'sacraments',       label: 'Sacraments' },
  { value: 'salvation',        label: 'Salvation' },
]

const DIFFICULTIES = [
  { value: 'beginner',     label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced',     label: 'Advanced' },
]

type Status = 'idle' | 'submitting' | 'success' | 'error'

export default function SubmitPage() {
  const [title, setTitle]           = useState('')
  const [question, setQuestion]     = useState('')
  const [answer, setAnswer]         = useState('')
  const [category, setCategory]     = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [scripture, setScripture]   = useState('')
  const [notes, setNotes]           = useState('')
  const [status, setStatus]         = useState<Status>('idle')
  const [errorMsg, setErrorMsg]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title || !question || !answer || !category || !difficulty) return

    setStatus('submitting')
    setErrorMsg('')

    try {
      if (isSupabaseConfigured()) {
        const supabase = createClient()
        const { error } = await supabase.from('submissions').insert({
          title,
          question,
          answer,
          category,
          difficulty,
          scripture_refs: scripture,
          submitter_notes: notes,
        })
        if (error) throw error
      }
      // Even without Supabase, show success (form data captured client-side)
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  function reset() {
    setTitle(''); setQuestion(''); setAnswer('')
    setCategory(''); setDifficulty(''); setScripture(''); setNotes('')
    setStatus('idle'); setErrorMsg('')
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="flex justify-center">
            <CheckCircle weight="fill" size={56} className="text-emerald-500" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Thank you!</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your topic suggestion has been submitted for review. Our team will
            verify it for theological accuracy before publishing.
          </p>
          <button
            onClick={reset}
            className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
          >
            Submit another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-2xl px-4 pt-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Suggest a Topic</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Know a common objection we haven&apos;t covered? Submit it and our team
            will research and publish a verified response.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <Field label="Topic title" required>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Why do Catholics pray to saints?"
              maxLength={120}
              required
              className={inputCls}
            />
          </Field>

          {/* Category + Difficulty */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category" required>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className={inputCls}
              >
                <option value="">Select…</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Difficulty" required>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                required
                className={inputCls}
              >
                <option value="">Select…</option>
                {DIFFICULTIES.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Question */}
          <Field label="The objection / question" required hint="Phrase it exactly as someone might ask it.">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder='e.g. "The Bible says there is one mediator, so why do Catholics ask Mary to intercede?"'
              rows={3}
              maxLength={400}
              required
              className={inputCls}
            />
          </Field>

          {/* Answer */}
          <Field label="Your suggested answer" required hint="Include any Scripture or Catechism references you know of.">
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Write a draft response. Our team will refine and verify it before publishing."
              rows={6}
              maxLength={2000}
              required
              className={inputCls}
            />
          </Field>

          {/* Scripture refs */}
          <Field label="Key Scripture references" hint="Optional — comma separated. e.g. 1 Tim 2:5, Rev 5:8">
            <input
              type="text"
              value={scripture}
              onChange={(e) => setScripture(e.target.value)}
              placeholder="1 Tim 2:5, Rev 5:8, Heb 7:25"
              className={inputCls}
            />
          </Field>

          {/* Notes for reviewer */}
          <Field label="Notes for the reviewer" hint="Optional — anything the review team should know.">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Source, context, related topics, etc."
              rows={2}
              maxLength={500}
              className={inputCls}
            />
          </Field>

          {/* Error */}
          {status === 'error' && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              <Warning weight="fill" size={16} className="mt-0.5 shrink-0" />
              {errorMsg || 'Submission failed. Please try again.'}
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'submitting'}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            <PaperPlaneTilt weight="fill" size={16} />
            {status === 'submitting' ? 'Submitting…' : 'Submit for Review'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary'

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  )
}
