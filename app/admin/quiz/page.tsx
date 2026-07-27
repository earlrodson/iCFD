'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Plus, Trash, FloppyDisk, X, MagnifyingGlass,
  Spinner, ListChecks, PencilSimple, CaretDown, CaretUp, Check,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { QUIZ_TIERS, type QuizTier } from '@/lib/content/quizTiers'
import { cn } from '@/lib/utils'

interface TopicOption {
  id: string
  title: string
  category: string
}

interface PathOption {
  slug: string
  title: string
}

interface QuizQuestion {
  id: number
  topic_id: string
  tier: QuizTier
  question: string
  choices: string[]
  correct_index: number
  active: boolean
  path_slug: string | null
  created_at: string
}

interface QuizSetting {
  tier: QuizTier
  item_count: number
  bank_size: number
  pass_percent: number
}

type QuestionDraft = Pick<QuizQuestion, 'question' | 'choices' | 'correct_index' | 'active' | 'path_slug'>

const EMPTY_DRAFT: QuestionDraft = { question: '', choices: ['', ''], correct_index: 0, active: true, path_slug: null }

const TIER_LABELS: Record<QuizTier, string> = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' }
const TIER_COLORS: Record<QuizTier, string> = {
  beginner: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  intermediate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  advanced: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
}

export default function QuizAdminPage() {
  const [topics, setTopics] = useState<TopicOption[]>([])
  const [topicQuery, setTopicQuery] = useState('')
  const [selectedTopic, setSelectedTopic] = useState<TopicOption | null>(null)
  const [paths, setPaths] = useState<PathOption[]>([])

  const [settings, setSettings] = useState<Record<string, QuizSetting>>({})
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [selectedTier, setSelectedTier] = useState<QuizTier>('beginner')

  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState<QuestionDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [error, setError] = useState('')

  const [showNew, setShowNew] = useState(false)
  const [newDraft, setNewDraft] = useState<QuestionDraft>(EMPTY_DRAFT)
  const [creating, setCreating] = useState(false)

  // Topics for the picker + quiz_settings for target bank sizes — both public reads.
  useEffect(() => {
    const supabase = createClient()
    supabase.from('topics').select('id, title, category').eq('lang', 'en').order('title')
      .then(({ data }) => setTopics((data ?? []) as TopicOption[]))
    supabase.from('quiz_settings').select('tier, item_count, bank_size, pass_percent')
      .then(({ data }) => {
        const map: Record<string, QuizSetting> = {}
        for (const row of (data ?? []) as QuizSetting[]) map[row.tier] = row
        setSettings(map)
      })
    supabase.from('paths').select('slug, title').is('deleted_at', null).order('title')
      .then(({ data }) => setPaths((data ?? []) as PathOption[]))
  }, [])

  const pathTitle = (slug: string | null) => (slug ? paths.find((p) => p.slug === slug)?.title ?? slug : null)

  async function loadQuestions(topicId: string) {
    setLoadingQuestions(true)
    setError('')
    setExpandedId(null); setEditingId(null); setEditDraft(null); setShowNew(false)
    try {
      const res = await fetch(`/api/admin/quiz?topicId=${encodeURIComponent(topicId)}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to load'); setQuestions([]); return }
      setQuestions(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setLoadingQuestions(false)
    }
  }

  function selectTopic(t: TopicOption) {
    setSelectedTopic(t)
    setTopicQuery('')
    setSelectedTier('beginner')
    loadQuestions(t.id)
  }

  const filteredTopics = useMemo(() => {
    if (!topicQuery.trim()) return []
    const q = topicQuery.toLowerCase()
    return topics.filter((t) => t.title.toLowerCase().includes(q) || t.id.includes(q)).slice(0, 20)
  }, [topics, topicQuery])

  const tierQuestions = questions.filter((q) => q.tier === selectedTier)
  const countsByTier = useMemo(() => {
    const counts: Record<string, number> = { beginner: 0, intermediate: 0, advanced: 0 }
    for (const q of questions) counts[q.tier] = (counts[q.tier] ?? 0) + 1
    return counts
  }, [questions])

  function startEdit(q: QuizQuestion) {
    setEditingId(q.id)
    setEditDraft({ question: q.question, choices: [...q.choices], correct_index: q.correct_index, active: q.active, path_slug: q.path_slug })
    setExpandedId(q.id)
  }

  function cancelEdit() {
    setEditingId(null); setEditDraft(null); setError('')
  }

  function validateDraft(d: QuestionDraft): string | null {
    if (!d.question.trim()) return 'Question text is required.'
    const filled = d.choices.map((c) => c.trim())
    if (filled.length < 2 || filled.some((c) => !c)) return 'At least 2 non-empty choices are required.'
    if (d.correct_index < 0 || d.correct_index >= filled.length) return 'Pick which choice is correct.'
    return null
  }

  async function saveEdit() {
    if (!editDraft || !editingId) return
    const invalid = validateDraft(editDraft)
    if (invalid) { setError(invalid); return }
    setSaving(true); setError('')
    const res = await fetch('/api/admin/quiz', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingId,
        question: editDraft.question.trim(),
        choices: editDraft.choices.map((c) => c.trim()),
        correct_index: editDraft.correct_index,
        active: editDraft.active,
        path_slug: editDraft.path_slug,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    if (selectedTopic) await loadQuestions(selectedTopic.id)
    setEditingId(null); setEditDraft(null); setSaving(false)
  }

  async function toggleActive(q: QuizQuestion) {
    await fetch('/api/admin/quiz', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: q.id, active: !q.active }),
    })
    if (selectedTopic) await loadQuestions(selectedTopic.id)
  }

  async function deleteQuestion(id: number) {
    setDeleting(id)
    await fetch(`/api/admin/quiz?id=${id}`, { method: 'DELETE' })
    setConfirmDelete(null); setDeleting(null)
    if (selectedTopic) await loadQuestions(selectedTopic.id)
  }

  async function createQuestion() {
    if (!selectedTopic) return
    const invalid = validateDraft(newDraft)
    if (invalid) { setError(invalid); return }
    setCreating(true); setError('')
    const res = await fetch('/api/admin/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic_id: selectedTopic.id,
        tier: selectedTier,
        question: newDraft.question.trim(),
        choices: newDraft.choices.map((c) => c.trim()),
        correct_index: newDraft.correct_index,
        active: newDraft.active,
        path_slug: newDraft.path_slug,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setCreating(false); return }
    await loadQuestions(selectedTopic.id)
    setShowNew(false); setNewDraft(EMPTY_DRAFT); setCreating(false)
  }

  const setting = settings[selectedTier]

  return (
    <div>
      {/* Header */}
      <div className="sticky top-[57px] z-30 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
          <ListChecks weight="light" size={20} className="text-muted-foreground shrink-0" />
          <h1 className="text-base font-bold text-foreground shrink-0">Quiz Questions</h1>
          {selectedTopic && (
            <span className="truncate text-sm text-muted-foreground">— {selectedTopic.title}</span>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-6 space-y-4">
        {/* Topic picker */}
        <div className="relative">
          <MagnifyingGlass weight="light" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={topicQuery}
            onChange={(e) => setTopicQuery(e.target.value)}
            placeholder="Search a topic to manage its quiz questions…"
            className="field pl-9"
          />
          {filteredTopics.length > 0 && (
            <div className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
              {filteredTopics.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectTopic(t)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                >
                  <span className="truncate text-foreground">{t.title}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">{t.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {!selectedTopic && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Search for a topic above to view or author its quiz questions.
          </p>
        )}

        {selectedTopic && (
          <>
            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">{error}</p>
            )}

            {/* Tier tabs */}
            <div className="flex gap-2">
              {QUIZ_TIERS.map((tier) => (
                <button
                  key={tier}
                  onClick={() => { setSelectedTier(tier); setExpandedId(null); setEditingId(null); setShowNew(false) }}
                  className={cn(
                    'flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                    selectedTier === tier
                      ? 'border-primary bg-primary/8 text-primary'
                      : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  {TIER_LABELS[tier]}
                  <span className="ml-1.5 text-xs opacity-70">
                    {countsByTier[tier]}{settings[tier] ? ` / ${settings[tier].bank_size}` : ''}
                  </span>
                </button>
              ))}
            </div>

            {setting && (
              <p className="text-xs text-muted-foreground">
                {TIER_LABELS[selectedTier]} quizzes serve {setting.item_count} questions per attempt, rotated from this bank,
                and require {setting.pass_percent}% to pass.
              </p>
            )}

            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">
                {loadingQuestions ? 'Loading…' : `${tierQuestions.length} question${tierQuestions.length !== 1 ? 's' : ''}`}
              </p>
              <button
                onClick={() => { setShowNew(true); setExpandedId(null); setEditingId(null) }}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus weight="bold" size={15} /> New Question
              </button>
            </div>

            {/* New question form */}
            {showNew && (
              <div className="rounded-2xl border-2 border-primary/40 bg-card p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm text-foreground">New {TIER_LABELS[selectedTier]} Question</p>
                  <button onClick={() => { setShowNew(false); setError('') }} className="icon-btn hover:bg-muted">
                    <X weight="light" size={16} />
                  </button>
                </div>
                <QuestionForm draft={newDraft} onChange={setNewDraft} paths={paths} />
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={createQuestion}
                    disabled={creating}
                    className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
                  >
                    {creating ? <Spinner weight="light" size={15} className="animate-spin" /> : <FloppyDisk weight="fill" size={15} />}
                    {creating ? 'Creating…' : 'Create'}
                  </button>
                  <button onClick={() => { setShowNew(false); setError('') }} className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Question list */}
            {loadingQuestions ? (
              <div className="flex justify-center py-12">
                <Spinner weight="light" size={28} className="animate-spin text-muted-foreground" />
              </div>
            ) : tierQuestions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No {selectedTier} questions yet.</p>
            ) : (
              <div className="space-y-2">
                {tierQuestions.map((q, i) => {
                  const isExpanded = expandedId === q.id
                  const isEditing = editingId === q.id
                  return (
                    <div key={q.id} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : q.id)}
                          className="flex-1 text-left flex items-center gap-3 min-w-0"
                        >
                          <span className={cn('shrink-0 rounded-lg px-2 py-0.5 text-xs font-mono font-semibold', TIER_COLORS[q.tier])}>
                            {i + 1}
                          </span>
                          <span className="truncate text-sm text-foreground">{q.question}</span>
                          {!q.active && (
                            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">inactive</span>
                          )}
                          <span
                            className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary"
                            title={q.path_slug ? `Only used by the "${pathTitle(q.path_slug)}" path` : 'Reusable by any path that includes this topic'}
                          >
                            {q.path_slug ? pathTitle(q.path_slug) : 'Shared'}
                          </span>
                          {isExpanded
                            ? <CaretUp weight="light" size={14} className="shrink-0 text-muted-foreground ml-auto" />
                            : <CaretDown weight="light" size={14} className="shrink-0 text-muted-foreground ml-auto" />}
                        </button>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => toggleActive(q)}
                            className="icon-btn hover:bg-muted hover:text-foreground"
                            title={q.active ? 'Deactivate (hide from rotation)' : 'Activate'}
                          >
                            {q.active ? <Check weight="bold" size={15} /> : <X weight="light" size={15} />}
                          </button>
                          <button
                            onClick={() => (isEditing ? cancelEdit() : startEdit(q))}
                            className="icon-btn hover:bg-muted hover:text-foreground"
                            title={isEditing ? 'Cancel edit' : 'Edit'}
                          >
                            {isEditing ? <X weight="light" size={15} /> : <PencilSimple weight="light" size={15} />}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(q.id)}
                            className="icon-btn hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                            title="Delete"
                          >
                            <Trash weight="light" size={15} />
                          </button>
                        </div>
                      </div>

                      {confirmDelete === q.id && (
                        <div className="border-t border-border bg-red-50 dark:bg-red-900/10 px-4 py-3 flex items-center justify-between gap-3">
                          <p className="text-sm text-red-700 dark:text-red-400">Delete this question permanently?</p>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => deleteQuestion(q.id)}
                              disabled={deleting === q.id}
                              className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                            >
                              {deleting === q.id ? <Spinner weight="light" size={12} className="animate-spin" /> : <Trash weight="fill" size={12} />}
                              Delete
                            </button>
                            <button onClick={() => setConfirmDelete(null)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {isExpanded && (
                        <div className="border-t border-border px-4 pb-5 pt-4">
                          {isEditing && editDraft ? (
                            <>
                              <QuestionForm draft={editDraft} onChange={(d) => setEditDraft({ ...editDraft, ...d })} paths={paths} />
                              <div className="flex gap-2 mt-4">
                                <button
                                  onClick={saveEdit}
                                  disabled={saving}
                                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
                                >
                                  {saving ? <Spinner weight="light" size={15} className="animate-spin" /> : <FloppyDisk weight="fill" size={15} />}
                                  {saving ? 'Saving…' : 'Save'}
                                </button>
                                <button onClick={cancelEdit} className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2">
                                  Cancel
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="space-y-1.5 text-sm">
                              {q.choices.map((c, ci) => (
                                <div
                                  key={ci}
                                  className={cn(
                                    'flex items-center gap-2 rounded-lg px-3 py-1.5',
                                    ci === q.correct_index ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' : 'text-foreground',
                                  )}
                                >
                                  {ci === q.correct_index && <Check weight="bold" size={14} className="shrink-0" />}
                                  <span>{c}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Shared question form ──────────────────────────────────────────────────────

function QuestionForm({ draft, onChange, paths }: { draft: QuestionDraft; onChange: (d: QuestionDraft) => void; paths: PathOption[] }) {
  function setChoice(i: number, val: string) {
    const choices = [...draft.choices]
    choices[i] = val
    onChange({ ...draft, choices })
  }
  function addChoice() {
    onChange({ ...draft, choices: [...draft.choices, ''] })
  }
  function removeChoice(i: number) {
    const choices = draft.choices.filter((_, ci) => ci !== i)
    const correct_index = draft.correct_index >= choices.length ? 0 : draft.correct_index
    onChange({ ...draft, choices, correct_index })
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Question</label>
        <textarea
          value={draft.question}
          onChange={(e) => onChange({ ...draft, question: e.target.value })}
          rows={2}
          placeholder="According to the topic, …?"
          className="field resize-y"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Choices <span className="font-normal normal-case">(select the correct one)</span>
        </label>
        <div className="space-y-2">
          {draft.choices.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChange({ ...draft, correct_index: i })}
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors',
                  draft.correct_index === i
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
                title="Mark as correct answer"
              >
                <Check weight="bold" size={14} />
              </button>
              <input
                value={c}
                onChange={(e) => setChoice(i, e.target.value)}
                placeholder={`Choice ${i + 1}`}
                className="field flex-1"
              />
              {draft.choices.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeChoice(i)}
                  className="icon-btn hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 shrink-0"
                  title="Remove choice"
                >
                  <X weight="light" size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addChoice}
          className="mt-2 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <Plus weight="bold" size={12} /> Add choice
        </button>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Assign to
        </label>
        <select
          value={draft.path_slug ?? ''}
          onChange={(e) => onChange({ ...draft, path_slug: e.target.value || null })}
          className="field"
        >
          <option value="">All paths (reusable)</option>
          {paths.map((p) => (
            <option key={p.slug} value={p.slug}>{p.title} (this path only)</option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={draft.active}
          onChange={(e) => onChange({ ...draft, active: e.target.checked })}
          className="h-4 w-4 rounded border-border"
        />
        Active (included in quiz rotation)
      </label>
    </div>
  )
}
