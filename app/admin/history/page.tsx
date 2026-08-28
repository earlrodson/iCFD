'use client'

import { useEffect, useState } from 'react'
import {
  Plus, Trash, FloppyDisk, X, Spinner, ClockCounterClockwise,
  PencilSimple, CaretDown, CaretUp, ArrowUp, ArrowDown,
} from '@phosphor-icons/react'

interface TimelineEntry {
  id: number
  year: string
  title: string
  body: string
  icon: string
  sort_order: number
}

interface President {
  id: number
  name: string
  years: string
  sort_order: number
}

const ICONS = ['users', 'book-open', 'map-pin', 'buildings', 'broadcast'] as const

const EMPTY_TIMELINE = { year: '', title: '', body: '', icon: 'users' as string }
const EMPTY_PRESIDENT = { name: '', years: '' }

export default function AdminHistoryPage() {
  return (
    <div>
      <div className="sticky top-[57px] z-30 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
          <ClockCounterClockwise weight="light" size={20} className="text-muted-foreground" />
          <h1 className="text-base font-bold text-foreground">Our History</h1>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-6 space-y-10 pb-10">
        <TimelineSection />
        <PresidentsSection />
      </div>
    </div>
  )
}

// ── Timeline entries ─────────────────────────────────────────────────────────

function TimelineSection() {
  const [entries, setEntries] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState<TimelineEntry | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [reordering, setReordering] = useState<number | null>(null)
  const [error, setError] = useState('')

  const [showNew, setShowNew] = useState(false)
  const [newDraft, setNewDraft] = useState(EMPTY_TIMELINE)
  const [creating, setCreating] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true); setError('')
    const res = await fetch('/api/admin/history-timeline')
    if (!res.ok) { setError(`Failed to load timeline (${res.status})`); setLoading(false); return }
    setEntries(await res.json())
    setLoading(false)
  }

  function startEdit(e: TimelineEntry) {
    setEditingId(e.id); setEditDraft({ ...e }); setExpandedId(e.id)
  }
  function cancelEdit() { setEditingId(null); setEditDraft(null); setError('') }

  async function saveEdit() {
    if (!editDraft) return
    setSaving(true); setError('')
    const res = await fetch('/api/admin/history-timeline', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editDraft),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    await load()
    setEditingId(null); setEditDraft(null); setSaving(false)
  }

  async function deleteEntry(id: number) {
    setDeleting(id)
    await fetch(`/api/admin/history-timeline?id=${id}`, { method: 'DELETE' })
    setConfirmDelete(null); setDeleting(null)
    await load()
  }

  async function createEntry() {
    if (!newDraft.year.trim() || !newDraft.title.trim() || !newDraft.body.trim()) {
      setError('Year, title, and body are required.')
      return
    }
    setCreating(true); setError('')
    const sort_order = entries.length > 0 ? Math.max(...entries.map((e) => e.sort_order)) + 10 : 10
    const res = await fetch('/api/admin/history-timeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newDraft, sort_order }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setCreating(false); return }
    await load()
    setShowNew(false); setNewDraft(EMPTY_TIMELINE); setCreating(false)
  }

  async function move(idx: number, dir: -1 | 1) {
    const target = idx + dir
    if (target < 0 || target >= entries.length) return
    const a = entries[idx]
    const b = entries[target]
    setReordering(a.id)
    await Promise.all([
      fetch('/api/admin/history-timeline', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: a.id, sort_order: b.sort_order }),
      }),
      fetch('/api/admin/history-timeline', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: b.id, sort_order: a.sort_order }),
      }),
    ])
    await load()
    setReordering(null)
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-4 mb-3">
        <div>
          <h2 className="text-sm font-bold text-foreground">Timeline</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Shown on the public /history page, in this order.
          </p>
        </div>
        <button
          onClick={() => { setShowNew(true); setExpandedId(null); setEditingId(null) }}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus weight="bold" size={15} /> New Entry
        </button>
      </div>

      {error && (
        <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">{error}</p>
      )}

      {showNew && (
        <div className="mb-4 rounded-2xl border-2 border-primary/40 bg-card p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm text-foreground">New Timeline Entry</p>
            <button onClick={() => { setShowNew(false); setError('') }} className="icon-btn hover:bg-muted">
              <X weight="light" size={16} />
            </button>
          </div>
          <TimelineForm draft={newDraft} onChange={setNewDraft} />
          <div className="flex gap-2 pt-1">
            <button
              onClick={createEntry}
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

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner weight="light" size={28} className="animate-spin text-muted-foreground" />
        </div>
      ) : entries.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No timeline entries yet.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((e, idx) => {
            const isExpanded = expandedId === e.id
            const isEditing = editingId === e.id
            return (
              <div key={e.id} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3">
                  <div className="flex flex-col shrink-0">
                    <button
                      onClick={() => move(idx, -1)}
                      disabled={idx === 0 || reordering !== null}
                      className="icon-btn hover:bg-muted disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <ArrowUp weight="bold" size={12} />
                    </button>
                    <button
                      onClick={() => move(idx, 1)}
                      disabled={idx === entries.length - 1 || reordering !== null}
                      className="icon-btn hover:bg-muted disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <ArrowDown weight="bold" size={12} />
                    </button>
                  </div>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : e.id)}
                    className="flex-1 text-left flex items-center gap-3 min-w-0"
                  >
                    <span className="shrink-0 rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-mono font-semibold text-primary">
                      {e.year}
                    </span>
                    <span className="font-semibold text-sm text-foreground truncate">{e.title}</span>
                    {isExpanded
                      ? <CaretUp weight="light" size={14} className="shrink-0 text-muted-foreground ml-auto" />
                      : <CaretDown weight="light" size={14} className="shrink-0 text-muted-foreground ml-auto" />
                    }
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => isEditing ? cancelEdit() : startEdit(e)}
                      className="icon-btn hover:bg-muted hover:text-foreground"
                      title={isEditing ? 'Cancel edit' : 'Edit'}
                    >
                      {isEditing ? <X weight="light" size={15} /> : <PencilSimple weight="light" size={15} />}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(e.id)}
                      className="icon-btn hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                      title="Delete"
                    >
                      <Trash weight="light" size={15} />
                    </button>
                  </div>
                </div>

                {confirmDelete === e.id && (
                  <div className="border-t border-border bg-red-50 dark:bg-red-900/10 px-4 py-3 flex items-center justify-between gap-3">
                    <p className="text-sm text-red-700 dark:text-red-400">Delete <strong>{e.title}</strong>?</p>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => deleteEntry(e.id)}
                        disabled={deleting === e.id}
                        className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                      >
                        {deleting === e.id ? <Spinner weight="light" size={12} className="animate-spin" /> : <Trash weight="fill" size={12} />}
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
                        <TimelineForm draft={editDraft} onChange={(d) => setEditDraft({ ...editDraft, ...d })} />
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
                      <p className="text-sm text-foreground leading-relaxed">{e.body}</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function TimelineForm({
  draft, onChange,
}: {
  draft: typeof EMPTY_TIMELINE
  onChange: (v: typeof EMPTY_TIMELINE) => void
}) {
  const f = (key: keyof typeof EMPTY_TIMELINE, val: string) => onChange({ ...draft, [key]: val })
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Year / Label</label>
          <input value={draft.year} onChange={(e) => f('year', e.target.value)} placeholder="1963" className="field" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Icon</label>
          <select value={draft.icon} onChange={(e) => f('icon', e.target.value)} className="field">
            {ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Title</label>
        <input value={draft.title} onChange={(e) => f('title', e.target.value)} placeholder="Legal Incorporation" className="field" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Body</label>
        <textarea value={draft.body} onChange={(e) => f('body', e.target.value)} rows={4} placeholder="What happened…" className="field resize-y" />
      </div>
    </div>
  )
}

// ── National presidents ──────────────────────────────────────────────────────

function PresidentsSection() {
  const [rows, setRows] = useState<President[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState<President | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [reordering, setReordering] = useState<number | null>(null)
  const [error, setError] = useState('')

  const [showNew, setShowNew] = useState(false)
  const [newDraft, setNewDraft] = useState(EMPTY_PRESIDENT)
  const [creating, setCreating] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true); setError('')
    const res = await fetch('/api/admin/history-presidents')
    if (!res.ok) { setError(`Failed to load presidents (${res.status})`); setLoading(false); return }
    setRows(await res.json())
    setLoading(false)
  }

  function startEdit(p: President) { setEditingId(p.id); setEditDraft({ ...p }) }
  function cancelEdit() { setEditingId(null); setEditDraft(null); setError('') }

  async function saveEdit() {
    if (!editDraft) return
    setSaving(true); setError('')
    const res = await fetch('/api/admin/history-presidents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editDraft),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    await load()
    setEditingId(null); setEditDraft(null); setSaving(false)
  }

  async function deleteRow(id: number) {
    setDeleting(id)
    await fetch(`/api/admin/history-presidents?id=${id}`, { method: 'DELETE' })
    setConfirmDelete(null); setDeleting(null)
    await load()
  }

  async function createRow() {
    if (!newDraft.name.trim() || !newDraft.years.trim()) {
      setError('Name and years are required.')
      return
    }
    setCreating(true); setError('')
    const sort_order = rows.length > 0 ? Math.max(...rows.map((r) => r.sort_order)) + 10 : 10
    const res = await fetch('/api/admin/history-presidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newDraft, sort_order }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setCreating(false); return }
    await load()
    setShowNew(false); setNewDraft(EMPTY_PRESIDENT); setCreating(false)
  }

  async function move(idx: number, dir: -1 | 1) {
    const target = idx + dir
    if (target < 0 || target >= rows.length) return
    const a = rows[idx]
    const b = rows[target]
    setReordering(a.id)
    await Promise.all([
      fetch('/api/admin/history-presidents', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: a.id, sort_order: b.sort_order }),
      }),
      fetch('/api/admin/history-presidents', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: b.id, sort_order: a.sort_order }),
      }),
    ])
    await load()
    setReordering(null)
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-4 mb-3">
        <div>
          <h2 className="text-sm font-bold text-foreground">National Presidents</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Shown as a table on the public /history page.</p>
        </div>
        <button
          onClick={() => { setShowNew(true); setEditingId(null) }}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus weight="bold" size={15} /> New Row
        </button>
      </div>

      {error && (
        <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">{error}</p>
      )}

      {showNew && (
        <div className="mb-4 rounded-2xl border-2 border-primary/40 bg-card p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm text-foreground">New President Row</p>
            <button onClick={() => { setShowNew(false); setError('') }} className="icon-btn hover:bg-muted">
              <X weight="light" size={16} />
            </button>
          </div>
          <PresidentForm draft={newDraft} onChange={setNewDraft} />
          <div className="flex gap-2 pt-1">
            <button
              onClick={createRow}
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

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner weight="light" size={28} className="animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No presidents listed yet.</p>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
          {rows.map((p, idx) => {
            const isEditing = editingId === p.id
            return (
              <div key={p.id} className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col shrink-0">
                    <button
                      onClick={() => move(idx, -1)}
                      disabled={idx === 0 || reordering !== null}
                      className="icon-btn hover:bg-muted disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <ArrowUp weight="bold" size={12} />
                    </button>
                    <button
                      onClick={() => move(idx, 1)}
                      disabled={idx === rows.length - 1 || reordering !== null}
                      className="icon-btn hover:bg-muted disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <ArrowDown weight="bold" size={12} />
                    </button>
                  </div>
                  {isEditing && editDraft ? (
                    <div className="flex-1">
                      <PresidentForm draft={editDraft} onChange={(d) => setEditDraft({ ...editDraft, ...d })} />
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={saveEdit}
                          disabled={saving}
                          className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
                        >
                          {saving ? <Spinner weight="light" size={13} className="animate-spin" /> : <FloppyDisk weight="fill" size={13} />}
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                        <button onClick={cancelEdit} className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.years}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => startEdit(p)}
                          className="icon-btn hover:bg-muted hover:text-foreground"
                          title="Edit"
                        >
                          <PencilSimple weight="light" size={15} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(p.id)}
                          className="icon-btn hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                          title="Delete"
                        >
                          <Trash weight="light" size={15} />
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {confirmDelete === p.id && (
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-red-50 dark:bg-red-900/10 px-3 py-2">
                    <p className="text-xs text-red-700 dark:text-red-400">Delete <strong>{p.name}</strong>?</p>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => deleteRow(p.id)}
                        disabled={deleting === p.id}
                        className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                      >
                        {deleting === p.id ? <Spinner weight="light" size={12} className="animate-spin" /> : <Trash weight="fill" size={12} />}
                        Delete
                      </button>
                      <button onClick={() => setConfirmDelete(null)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function PresidentForm({
  draft, onChange,
}: {
  draft: typeof EMPTY_PRESIDENT
  onChange: (v: typeof EMPTY_PRESIDENT) => void
}) {
  const f = (key: keyof typeof EMPTY_PRESIDENT, val: string) => onChange({ ...draft, [key]: val })
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</label>
        <input value={draft.name} onChange={(e) => f('name', e.target.value)} placeholder="Bro. Ryan Mejillano" className="field" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Years Served</label>
        <input value={draft.years} onChange={(e) => f('years', e.target.value)} placeholder="2019 – 2028" className="field" />
      </div>
    </div>
  )
}
