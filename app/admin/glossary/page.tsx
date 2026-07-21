'use client'

import { useEffect, useState } from 'react'
import {
  Plus, Trash, FloppyDisk, X, MagnifyingGlass,
  Spinner, TextAa, PencilSimple, CaretDown, CaretUp,
} from '@phosphor-icons/react'

interface Term {
  slug: string
  term: string
  pronunciation: string | null
  language: string
  root_text: string | null
  root_meaning: string
  definition: string
  debate_note: string | null
  keywords: string | null
}

const EMPTY_TERM: Omit<Term, 'slug'> = {
  term: '', pronunciation: '', language: 'Greek',
  root_text: '', root_meaning: '', definition: '',
  debate_note: '', keywords: '',
}

const LANGUAGES = ['Greek', 'Latin', 'Hebrew', 'Aramaic', 'English']

export default function GlossaryPage() {
  const [terms, setTerms] = useState<Term[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null)
  const [editingSlug, setEditingSlug] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Term | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [error, setError] = useState('')

  // New term form
  const [showNew, setShowNew] = useState(false)
  const [newSlug, setNewSlug] = useState('')
  const [newDraft, setNewDraft] = useState<Omit<Term, 'slug'>>(EMPTY_TERM)
  const [creating, setCreating] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/glossary')
    const data = await res.json()
    setTerms(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  function startEdit(t: Term) {
    setEditingSlug(t.slug)
    setEditDraft({ ...t })
    setExpandedSlug(t.slug)
  }

  function cancelEdit() {
    setEditingSlug(null)
    setEditDraft(null)
    setError('')
  }

  async function saveEdit() {
    if (!editDraft) return
    setSaving(true); setError('')
    const res = await fetch('/api/admin/glossary', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editDraft),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    await load()
    setEditingSlug(null); setEditDraft(null); setSaving(false)
  }

  async function deleteTerm(slug: string) {
    setDeleting(slug)
    await fetch(`/api/admin/glossary?slug=${encodeURIComponent(slug)}`, { method: 'DELETE' })
    setConfirmDelete(null); setDeleting(null)
    await load()
  }

  async function createTerm() {
    if (!newSlug.trim() || !newDraft.term.trim() || !newDraft.root_meaning.trim() || !newDraft.definition.trim()) {
      setError('Slug, term, root meaning, and definition are required.')
      return
    }
    setCreating(true); setError('')
    const res = await fetch('/api/admin/glossary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: newSlug.trim().toLowerCase().replace(/\s+/g, '-'), ...newDraft }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setCreating(false); return }
    await load()
    setShowNew(false); setNewSlug(''); setNewDraft(EMPTY_TERM); setCreating(false)
  }

  const filtered = terms.filter((t) =>
    !query.trim() ||
    t.term.toLowerCase().includes(query.toLowerCase()) ||
    t.language.toLowerCase().includes(query.toLowerCase()) ||
    t.root_meaning.toLowerCase().includes(query.toLowerCase()) ||
    (t.keywords ?? '').toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <div className="pb-32">
      {/* Header */}
      <div className="sticky top-[57px] z-30 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <TextAa weight="light" size={20} className="text-muted-foreground" />
            <h1 className="text-base font-bold text-foreground">Theological Glossary</h1>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{terms.length}</span>
          </div>
          <button
            onClick={() => { setShowNew(true); setExpandedSlug(null); setEditingSlug(null) }}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus weight="bold" size={15} /> New Term
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-6 space-y-4">
        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">{error}</p>
        )}

        {/* Search */}
        <div className="relative">
          <MagnifyingGlass weight="light" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search terms, language, keywords…"
            className="field pl-9"
          />
        </div>

        {/* New term form */}
        {showNew && (
          <div className="rounded-2xl border-2 border-primary/40 bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm text-foreground">New Term</p>
              <button onClick={() => { setShowNew(false); setError('') }} className="icon-btn hover:bg-muted">
                <X weight="light" size={16} />
              </button>
            </div>
            <TermForm
              slug={newSlug} onSlugChange={setNewSlug}
              draft={newDraft} onChange={setNewDraft}
              showSlug
            />
            <div className="flex gap-2 pt-1">
              <button
                onClick={createTerm}
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

        {/* Term list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner weight="light" size={28} className="animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No terms found.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((t) => {
              const isExpanded = expandedSlug === t.slug
              const isEditing  = editingSlug  === t.slug

              return (
                <div key={t.slug} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                  {/* Row header */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      onClick={() => setExpandedSlug(isExpanded ? null : t.slug)}
                      className="flex-1 text-left flex items-center gap-3 min-w-0"
                    >
                      <span className="shrink-0 rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-mono font-semibold text-primary">
                        {t.language.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="font-semibold text-sm text-foreground truncate">{t.term}</span>
                      {t.pronunciation && (
                        <span className="text-xs text-muted-foreground hidden sm:block">/{t.pronunciation}/</span>
                      )}
                      <span className="text-xs text-muted-foreground truncate hidden sm:block">&ldquo;{t.root_meaning}&rdquo;</span>
                      {isExpanded
                        ? <CaretUp weight="light" size={14} className="shrink-0 text-muted-foreground ml-auto" />
                        : <CaretDown weight="light" size={14} className="shrink-0 text-muted-foreground ml-auto" />
                      }
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => isEditing ? cancelEdit() : startEdit(t)}
                        className="icon-btn hover:bg-muted hover:text-foreground"
                        title={isEditing ? 'Cancel edit' : 'Edit'}
                      >
                        {isEditing ? <X weight="light" size={15} /> : <PencilSimple weight="light" size={15} />}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(t.slug)}
                        className="icon-btn hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                        title="Delete"
                      >
                        <Trash weight="light" size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Delete confirm */}
                  {confirmDelete === t.slug && (
                    <div className="border-t border-border bg-red-50 dark:bg-red-900/10 px-4 py-3 flex items-center justify-between gap-3">
                      <p className="text-sm text-red-700 dark:text-red-400">Delete <strong>{t.term}</strong>? This also removes all topic links.</p>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => deleteTerm(t.slug)}
                          disabled={deleting === t.slug}
                          className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                        >
                          {deleting === t.slug ? <Spinner weight="light" size={12} className="animate-spin" /> : <Trash weight="fill" size={12} />}
                          Delete
                        </button>
                        <button onClick={() => setConfirmDelete(null)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-border px-4 pb-5 pt-4">
                      {isEditing && editDraft ? (
                        <>
                          <TermForm
                            slug={editDraft.slug} onSlugChange={() => {}}
                            draft={editDraft} onChange={(d) => setEditDraft({ ...editDraft, ...d })}
                            showSlug={false}
                          />
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
                        <div className="space-y-3 text-sm">
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span><span className="font-semibold text-foreground">Language:</span> {t.language}</span>
                            {t.root_text && <span><span className="font-semibold text-foreground">Root:</span> {t.root_text}</span>}
                            {t.pronunciation && <span><span className="font-semibold text-foreground">Pronunciation:</span> /{t.pronunciation}/</span>}
                          </div>
                          <p className="text-foreground leading-relaxed">{t.definition}</p>
                          {t.debate_note && (
                            <div className="rounded-xl border-l-4 border-primary bg-primary/8 px-4 py-3">
                              <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">Apologetics Note</p>
                              <p className="text-sm text-foreground leading-relaxed">{t.debate_note}</p>
                            </div>
                          )}
                          {t.keywords && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              <span className="text-xs text-muted-foreground font-semibold">Matches:</span>
                              {t.keywords.split(',').map((k) => k.trim()).filter(Boolean).map((k) => (
                                <span key={k} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{k}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Shared form ────────────────────────────────────────────────────────────────

function TermForm({
  slug, onSlugChange, draft, onChange, showSlug,
}: {
  slug: string
  onSlugChange: (v: string) => void
  draft: Omit<Term, 'slug'>
  onChange: (v: Omit<Term, 'slug'>) => void
  showSlug: boolean
}) {
  const f = (key: keyof Omit<Term, 'slug'>, val: string) => onChange({ ...draft, [key]: val })
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {showSlug && (
          <div className="col-span-2 sm:col-span-1">
            <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Slug (unique ID)</label>
            <input value={slug} onChange={(e) => onSlugChange(e.target.value)} placeholder="ex-cathedra" className="field font-mono text-xs" />
          </div>
        )}
        <div className={showSlug ? 'col-span-2 sm:col-span-1' : 'col-span-2 sm:col-span-1'}>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Term Name</label>
          <input value={draft.term} onChange={(e) => f('term', e.target.value)} placeholder="Ex Cathedra" className="field" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Language</label>
          <select value={draft.language} onChange={(e) => f('language', e.target.value)} className="field">
            {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pronunciation</label>
          <input value={draft.pronunciation ?? ''} onChange={(e) => f('pronunciation', e.target.value)} placeholder="eks KA-the-dra" className="field" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Root Text</label>
          <input value={draft.root_text ?? ''} onChange={(e) => f('root_text', e.target.value)} placeholder="ex cathedra" className="field" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Root Meaning</label>
          <input value={draft.root_meaning} onChange={(e) => f('root_meaning', e.target.value)} placeholder="from the chair" className="field" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Definition</label>
        <textarea value={draft.definition} onChange={(e) => f('definition', e.target.value)} rows={4} placeholder="Full definition…" className="field resize-y" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Apologetics Note</label>
        <textarea value={draft.debate_note ?? ''} onChange={(e) => f('debate_note', e.target.value)} rows={3} placeholder="How to use this in debate or dialogue…" className="field resize-y" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Match Keywords <span className="font-normal normal-case">(comma-separated — words in content that trigger this tooltip)</span>
        </label>
        <input value={draft.keywords ?? ''} onChange={(e) => f('keywords', e.target.value)} placeholder="purgatory,purification,purified" className="field font-mono text-xs" />
      </div>
    </div>
  )
}
