'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle, XCircle, PencilSimple, ArrowClockwise,
  BookOpen, Tag, Student, CalendarBlank,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'

type SubmissionStatus = 'pending' | 'approved' | 'rejected'

interface Submission {
  id: string
  title: string
  question: string
  answer: string
  category: string
  difficulty: string
  scripture_refs: string | null
  submitter_notes: string | null
  status: string
  submitted_by: string | null
  created_at: string
}

type ActionStatus = 'idle' | 'working' | 'done' | 'error'

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending:  { label: 'Pending',  className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  rejected: { label: 'Rejected', className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' },
}

const CATEGORY_LABEL: Record<string, string> = {
  bible: 'Bible', 'church-teaching': 'Church Teaching', mary: 'Mary',
  tradition: 'Tradition', saints: 'Saints', papacy: 'Papacy',
  sacraments: 'Sacraments', salvation: 'Salvation',
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function SubmissionsPage() {
  const router = useRouter()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<SubmissionStatus | 'all'>('pending')
  const [actions, setActions] = useState<Record<string, ActionStatus>>({})
  const [actionMsg, setActionMsg] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await createClient()
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false })
    setSubmissions((data as Submission[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function setAction(id: string, status: ActionStatus, msg = '') {
    setActions((p) => ({ ...p, [id]: status }))
    setActionMsg((p) => ({ ...p, [id]: msg }))
  }

  async function approve(sub: Submission) {
    setAction(sub.id, 'working')

    const topicId = slugify(sub.title)
    const row = {
      id: topicId,
      lang: 'en',
      category: sub.category,
      difficulty: sub.difficulty,
      title: sub.title,
      question: sub.question,
      answer: sub.answer,
      scripture: sub.scripture_refs
        ? sub.scripture_refs.split(',').map((r) => ({ reference: r.trim(), text: '', version: 'NABRE' }))
        : [],
      catechism: [],
      church_fathers: [],
      objections: [],
      tags: [],
      related_topics: [],
      last_updated: new Date().toISOString(),
      translation_source: 'manual',
    }

    const supabase = createClient()
    const { error: topicErr } = await supabase
      .from('topics')
      .upsert(row, { onConflict: 'id,lang' })

    if (topicErr) {
      setAction(sub.id, 'error', topicErr.message)
      return
    }

    const { error: statusErr } = await supabase
      .from('submissions')
      .update({ status: 'approved' })
      .eq('id', sub.id)

    if (statusErr) {
      setAction(sub.id, 'error', statusErr.message)
      return
    }

    setSubmissions((prev) => prev.map((s) => s.id === sub.id ? { ...s, status: 'approved' } : s))
    setAction(sub.id, 'done', `Created topic "${topicId}"`)
  }

  async function approveAndEdit(sub: Submission) {
    await approve(sub)
    const topicId = slugify(sub.title)
    router.push(`/admin/topics/${topicId}?lang=en`)
  }

  async function reject(id: string) {
    setAction(id, 'working')
    const { error } = await createClient()
      .from('submissions')
      .update({ status: 'rejected' })
      .eq('id', id)
    if (error) { setAction(id, 'error', error.message); return }
    setSubmissions((prev) => prev.map((s) => s.id === id ? { ...s, status: 'rejected' } : s))
    setAction(id, 'done')
  }

  async function restore(id: string) {
    setAction(id, 'working')
    const { error } = await createClient()
      .from('submissions')
      .update({ status: 'pending' })
      .eq('id', id)
    if (error) { setAction(id, 'error', error.message); return }
    setSubmissions((prev) => prev.map((s) => s.id === id ? { ...s, status: 'pending' } : s))
    setAction(id, 'idle')
  }

  const counts = {
    all: submissions.length,
    pending: submissions.filter((s) => s.status === 'pending').length,
    approved: submissions.filter((s) => s.status === 'approved').length,
    rejected: submissions.filter((s) => s.status === 'rejected').length,
  }

  const filtered = tab === 'all' ? submissions : submissions.filter((s) => s.status === tab)

  return (
    <div className="pb-24">
      <div className="mx-auto max-w-3xl px-4 pt-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Submission Review</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Community-submitted topic suggestions
            </p>
          </div>
          <button
            onClick={load}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Reload"
          >
            <ArrowClockwise weight="light" size={16} />
          </button>
        </div>

        {/* Status tabs */}
        <div className="flex gap-1 border-b border-border">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors capitalize flex items-center gap-1.5 ${
                tab === t
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t}
              {counts[t] > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  t === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-muted text-muted-foreground'
                }`}>
                  {counts[t]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">
              {tab === 'pending' ? 'No pending submissions.' : `No ${tab} submissions.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((sub) => {
              const action = actions[sub.id] ?? 'idle'
              const msg = actionMsg[sub.id] ?? ''
              const isExpanded = expanded === sub.id
              const badge = STATUS_BADGE[sub.status] ?? STATUS_BADGE.pending

              return (
                <div key={sub.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                  {/* Card header */}
                  <div
                    className="px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setExpanded(isExpanded ? null : sub.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
                            {badge.label}
                          </span>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">
                            {CATEGORY_LABEL[sub.category] ?? sub.category}
                          </span>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">
                            {sub.difficulty}
                          </span>
                        </div>
                        <h3 className="font-semibold text-foreground text-sm leading-snug">{sub.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{sub.question}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
                          <CalendarBlank size={10} />
                          {new Date(sub.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-border px-5 py-4 space-y-4 bg-muted/20">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                          <BookOpen size={11} /> Question
                        </p>
                        <p className="text-sm text-foreground">{sub.question}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Answer</p>
                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{sub.answer}</p>
                      </div>
                      {sub.scripture_refs && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                            <Tag size={11} /> Scripture References
                          </p>
                          <p className="text-xs text-foreground font-mono">{sub.scripture_refs}</p>
                        </div>
                      )}
                      {sub.submitter_notes && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                            <Student size={11} /> Submitter Notes
                          </p>
                          <p className="text-sm text-muted-foreground italic">{sub.submitter_notes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="border-t border-border px-5 py-3 flex items-center justify-between gap-3 bg-muted/10">
                    {action === 'working' ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        Processing…
                      </div>
                    ) : action === 'done' ? (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                        <CheckCircle weight="fill" size={14} />
                        {msg || 'Done'}
                      </div>
                    ) : action === 'error' ? (
                      <p className="text-xs text-rose-600">{msg}</p>
                    ) : (
                      <span />
                    )}

                    <div className="flex items-center gap-2 ml-auto">
                      {sub.status === 'pending' && (
                        <>
                          <button
                            onClick={() => reject(sub.id)}
                            disabled={action === 'working'}
                            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 disabled:opacity-50 transition-colors"
                          >
                            <XCircle weight="light" size={14} />
                            Reject
                          </button>
                          <button
                            onClick={() => approveAndEdit(sub)}
                            disabled={action === 'working'}
                            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
                          >
                            <PencilSimple weight="light" size={14} />
                            Approve & Edit
                          </button>
                          <button
                            onClick={() => approve(sub)}
                            disabled={action === 'working'}
                            className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
                          >
                            <CheckCircle weight="fill" size={14} />
                            Approve
                          </button>
                        </>
                      )}
                      {sub.status === 'approved' && (
                        <button
                          onClick={() => router.push(`/admin/topics/${slugify(sub.title)}?lang=en`)}
                          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                        >
                          <PencilSimple weight="light" size={14} />
                          Edit Topic
                        </button>
                      )}
                      {sub.status === 'rejected' && (
                        <button
                          onClick={() => restore(sub.id)}
                          disabled={action === 'working'}
                          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
                        >
                          <ArrowClockwise weight="light" size={14} />
                          Restore to Pending
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
