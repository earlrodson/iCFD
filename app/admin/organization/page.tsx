'use client'

import { useEffect, useState } from 'react'
import {
  Plus, Trash, FloppyDisk, X, MagnifyingGlass,
  Spinner, Buildings, PencilSimple, CaretDown, CaretUp, MapPin,
} from '@phosphor-icons/react'
import { ChapterLocationPicker } from '@/components/admin/ChapterLocationPicker'

interface Diocese { id: string; name: string; created_at: string }
interface Chapter {
  id: string
  name: string
  type: 'parish' | 'school'
  diocese_id: string
  lat: number | null
  lng: number | null
  created_at: string
}

const CHAPTER_TYPES = ['parish', 'school'] as const

export default function OrganizationPage() {
  const [dioceses, setDioceses] = useState<Diocese[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading]   = useState(true)
  const [query, setQuery]       = useState('')
  const [error, setError]       = useState('')

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editName, setEditName]     = useState('')
  const [saving, setSaving]         = useState(false)
  const [deleting, setDeleting]     = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const [showNewDiocese, setShowNewDiocese] = useState(false)
  const [newDioceseName, setNewDioceseName] = useState('')
  const [creatingDiocese, setCreatingDiocese] = useState(false)

  const [newChapterDraft, setNewChapterDraft] = useState<{ name: string; type: typeof CHAPTER_TYPES[number] }>({ name: '', type: 'parish' })
  const [creatingChapter, setCreatingChapter] = useState<string | null>(null)
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null)
  const [editChapterDraft, setEditChapterDraft] = useState<{ name: string; type: typeof CHAPTER_TYPES[number] } | null>(null)
  const [deletingChapter, setDeletingChapter] = useState<string | null>(null)
  const [confirmDeleteChapter, setConfirmDeleteChapter] = useState<string | null>(null)
  const [locatingChapter, setLocatingChapter] = useState<Chapter | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true); setError('')
    try {
      const [dRes, cRes] = await Promise.all([
        fetch('/api/admin/dioceses'),
        fetch('/api/admin/chapters'),
      ])
      if (!dRes.ok || !cRes.ok) {
        const res = !dRes.ok ? dRes : cRes
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? `Failed to load (${res.status})`)
        setLoading(false)
        return
      }
      setDioceses(await dRes.json())
      setChapters(await cRes.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    }
    setLoading(false)
  }

  async function createDiocese() {
    if (!newDioceseName.trim()) { setError('Diocese name is required.'); return }
    setCreatingDiocese(true); setError('')
    const res = await fetch('/api/admin/dioceses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newDioceseName.trim() }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setCreatingDiocese(false); return }
    await load()
    setShowNewDiocese(false); setNewDioceseName(''); setCreatingDiocese(false)
  }

  function startEditDiocese(d: Diocese) {
    setEditingId(d.id); setEditName(d.name); setExpandedId(d.id)
  }

  async function saveDiocese() {
    if (!editingId || !editName.trim()) return
    setSaving(true); setError('')
    const res = await fetch('/api/admin/dioceses', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingId, name: editName.trim() }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    await load()
    setEditingId(null); setSaving(false)
  }

  async function deleteDiocese(id: string) {
    setDeleting(id); setError('')
    const res = await fetch(`/api/admin/dioceses?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setError(data.error ?? 'Failed to delete'); setDeleting(null); setConfirmDelete(null); return }
    setConfirmDelete(null); setDeleting(null)
    await load()
  }

  async function createChapter(dioceseId: string) {
    if (!newChapterDraft.name.trim()) { setError('Chapter name is required.'); return }
    setCreatingChapter(dioceseId); setError('')
    const res = await fetch('/api/admin/chapters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newChapterDraft.name.trim(), type: newChapterDraft.type, diocese_id: dioceseId }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setCreatingChapter(null); return }
    await load()
    setNewChapterDraft({ name: '', type: 'parish' }); setCreatingChapter(null)
  }

  function startEditChapter(c: Chapter) {
    setEditingChapterId(c.id); setEditChapterDraft({ name: c.name, type: c.type })
  }

  async function saveChapter() {
    if (!editingChapterId || !editChapterDraft?.name.trim()) return
    setSaving(true); setError('')
    const res = await fetch('/api/admin/chapters', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingChapterId, name: editChapterDraft.name.trim(), type: editChapterDraft.type }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    await load()
    setEditingChapterId(null); setEditChapterDraft(null); setSaving(false)
  }

  async function saveChapterLocation(lat: number, lng: number) {
    if (!locatingChapter) return
    const res = await fetch('/api/admin/chapters', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: locatingChapter.id, lat, lng }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); return }
    await load()
    setLocatingChapter(null)
  }

  async function deleteChapter(id: string) {
    setDeletingChapter(id); setError('')
    const res = await fetch(`/api/admin/chapters?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setError(data.error ?? 'Failed to delete'); setDeletingChapter(null); setConfirmDeleteChapter(null); return }
    setConfirmDeleteChapter(null); setDeletingChapter(null)
    await load()
  }

  const filtered = dioceses.filter((d) =>
    !query.trim() ||
    d.name.toLowerCase().includes(query.toLowerCase()) ||
    chapters.some((c) => c.diocese_id === d.id && c.name.toLowerCase().includes(query.toLowerCase())),
  )

  return (
    <div>
      <div className="sticky top-[57px] z-30 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <Buildings weight="light" size={20} className="text-muted-foreground" />
            <h1 className="text-base font-bold text-foreground">Organization</h1>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {dioceses.length} dioceses · {chapters.length} chapters
            </span>
          </div>
          <button
            onClick={() => { setShowNewDiocese(true); setExpandedId(null); setEditingId(null) }}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus weight="bold" size={15} /> New Diocese
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-6 space-y-4">
        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">{error}</p>
        )}

        <div className="relative">
          <MagnifyingGlass weight="light" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search dioceses or chapters…"
            className="field pl-9"
          />
        </div>

        {showNewDiocese && (
          <div className="rounded-2xl border-2 border-primary/40 bg-card p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm text-foreground">New Diocese</p>
              <button onClick={() => { setShowNewDiocese(false); setError('') }} className="icon-btn hover:bg-muted">
                <X weight="light" size={16} />
              </button>
            </div>
            <input
              value={newDioceseName}
              onChange={(e) => setNewDioceseName(e.target.value)}
              placeholder="Diocese of Example"
              className="field"
            />
            <div className="flex gap-2 pt-1">
              <button
                onClick={createDiocese}
                disabled={creatingDiocese}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                {creatingDiocese ? <Spinner weight="light" size={15} className="animate-spin" /> : <FloppyDisk weight="fill" size={15} />}
                {creatingDiocese ? 'Creating…' : 'Create'}
              </button>
              <button onClick={() => { setShowNewDiocese(false); setError('') }} className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2">
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner weight="light" size={28} className="animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No dioceses found.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((d) => {
              const isExpanded = expandedId === d.id
              const isEditing  = editingId === d.id
              const dioceseChapters = chapters.filter((c) => c.diocese_id === d.id)

              return (
                <div key={d.id} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : d.id)}
                      className="flex-1 text-left flex items-center gap-3 min-w-0"
                    >
                      <span className="font-semibold text-sm text-foreground truncate">{d.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {dioceseChapters.length} chapter{dioceseChapters.length === 1 ? '' : 's'}
                      </span>
                      {isExpanded
                        ? <CaretUp weight="light" size={14} className="shrink-0 text-muted-foreground ml-auto" />
                        : <CaretDown weight="light" size={14} className="shrink-0 text-muted-foreground ml-auto" />
                      }
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => isEditing ? setEditingId(null) : startEditDiocese(d)}
                        className="icon-btn hover:bg-muted hover:text-foreground"
                        title={isEditing ? 'Cancel edit' : 'Edit'}
                      >
                        {isEditing ? <X weight="light" size={15} /> : <PencilSimple weight="light" size={15} />}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(d.id)}
                        className="icon-btn hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                        title="Delete"
                      >
                        <Trash weight="light" size={15} />
                      </button>
                    </div>
                  </div>

                  {confirmDelete === d.id && (
                    <div className="border-t border-border bg-red-50 dark:bg-red-900/10 px-4 py-3 flex items-center justify-between gap-3">
                      <p className="text-sm text-red-700 dark:text-red-400">Delete <strong>{d.name}</strong>?</p>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => deleteDiocese(d.id)}
                          disabled={deleting === d.id}
                          className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                        >
                          {deleting === d.id ? <Spinner weight="light" size={12} className="animate-spin" /> : <Trash weight="fill" size={12} />}
                          Delete
                        </button>
                        <button onClick={() => setConfirmDelete(null)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {isExpanded && (
                    <div className="border-t border-border px-4 pb-5 pt-4 space-y-3">
                      {isEditing && (
                        <div className="flex gap-2">
                          <input value={editName} onChange={(e) => setEditName(e.target.value)} className="field" />
                          <button
                            onClick={saveDiocese}
                            disabled={saving}
                            className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
                          >
                            {saving ? <Spinner weight="light" size={15} className="animate-spin" /> : <FloppyDisk weight="fill" size={15} />}
                          </button>
                        </div>
                      )}

                      {/* Chapters within this diocese */}
                      <div className="space-y-2">
                        {dioceseChapters.map((c) => (
                          <div key={c.id} className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2">
                            {editingChapterId === c.id && editChapterDraft ? (
                              <>
                                <input
                                  value={editChapterDraft.name}
                                  onChange={(e) => setEditChapterDraft({ ...editChapterDraft, name: e.target.value })}
                                  className="field flex-1 py-1.5 text-sm"
                                />
                                <select
                                  value={editChapterDraft.type}
                                  onChange={(e) => setEditChapterDraft({ ...editChapterDraft, type: e.target.value as typeof CHAPTER_TYPES[number] })}
                                  className="field w-28 py-1.5 text-sm"
                                >
                                  {CHAPTER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <button onClick={saveChapter} disabled={saving} className="icon-btn hover:bg-muted hover:text-foreground">
                                  {saving ? <Spinner weight="light" size={14} className="animate-spin" /> : <FloppyDisk weight="fill" size={14} />}
                                </button>
                                <button onClick={() => { setEditingChapterId(null); setEditChapterDraft(null) }} className="icon-btn hover:bg-muted hover:text-foreground">
                                  <X weight="light" size={14} />
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="flex-1 text-sm text-foreground truncate">{c.name}</span>
                                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">{c.type}</span>
                                <button
                                  onClick={() => setLocatingChapter(c)}
                                  className={`icon-btn hover:bg-muted ${c.lat != null ? 'text-primary' : 'hover:text-foreground'}`}
                                  title={c.lat != null ? 'Location set — click to edit' : 'Set location'}
                                >
                                  <MapPin weight={c.lat != null ? 'fill' : 'light'} size={14} />
                                </button>
                                <button onClick={() => startEditChapter(c)} className="icon-btn hover:bg-muted hover:text-foreground" title="Edit">
                                  <PencilSimple weight="light" size={14} />
                                </button>
                                <button onClick={() => setConfirmDeleteChapter(c.id)} className="icon-btn hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20" title="Delete">
                                  <Trash weight="light" size={14} />
                                </button>
                              </>
                            )}
                            {confirmDeleteChapter === c.id && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => deleteChapter(c.id)}
                                  disabled={deletingChapter === c.id}
                                  className="rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                                >
                                  Confirm
                                </button>
                                <button onClick={() => setConfirmDeleteChapter(null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Add chapter */}
                      <div className="flex gap-2 pt-1">
                        <input
                          value={newChapterDraft.name}
                          onChange={(e) => setNewChapterDraft({ ...newChapterDraft, name: e.target.value })}
                          placeholder="New chapter name…"
                          className="field flex-1 py-1.5 text-sm"
                        />
                        <select
                          value={newChapterDraft.type}
                          onChange={(e) => setNewChapterDraft({ ...newChapterDraft, type: e.target.value as typeof CHAPTER_TYPES[number] })}
                          className="field w-28 py-1.5 text-sm"
                        >
                          {CHAPTER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <button
                          onClick={() => createChapter(d.id)}
                          disabled={creatingChapter === d.id}
                          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
                        >
                          {creatingChapter === d.id ? <Spinner weight="light" size={12} className="animate-spin" /> : <Plus weight="bold" size={12} />}
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {locatingChapter && (
        <ChapterLocationPicker
          chapterName={locatingChapter.name}
          initialLat={locatingChapter.lat}
          initialLng={locatingChapter.lng}
          onSave={saveChapterLocation}
          onClose={() => setLocatingChapter(null)}
        />
      )}
    </div>
  )
}
