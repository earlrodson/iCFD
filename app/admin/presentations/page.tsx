'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Plus, Trash, FloppyDisk, X, MagnifyingGlass,
  Spinner, Presentation, PencilSimple, UploadSimple,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface TopicOption {
  id: string
  title: string
  category: string
}

interface Slide {
  heading: string
  bullets: string[]
}

interface PresentationRow {
  topic_id: string
  slides: Slide[]
  published: boolean
  last_updated: string
}

interface Overview {
  topic_id: string
  published: boolean
  last_updated: string
}

const EMPTY_SLIDE: Slide = { heading: '', bullets: [''] }

export default function PresentationsAdminPage() {
  const [topics, setTopics] = useState<TopicOption[]>([])
  const [topicQuery, setTopicQuery] = useState('')
  const [selectedTopic, setSelectedTopic] = useState<TopicOption | null>(null)
  const [overview, setOverview] = useState<Overview[]>([])

  const [presentation, setPresentation] = useState<PresentationRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [slides, setSlides] = useState<Slide[]>([])
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [importText, setImportText] = useState('')
  const [showImport, setShowImport] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('topics').select('id, title, category').eq('lang', 'en').order('title')
      .then(({ data }) => setTopics((data ?? []) as TopicOption[]))
    loadOverview()
  }, [])

  async function loadOverview() {
    const res = await fetch('/api/admin/presentations')
    const data = await res.json()
    if (res.ok) setOverview(Array.isArray(data) ? data : [])
  }

  function flash(text: string) {
    setMsg(text)
    setTimeout(() => setMsg(''), 4000)
  }

  const overviewByTopic = useMemo(() => {
    const map: Record<string, Overview> = {}
    for (const o of overview) map[o.topic_id] = o
    return map
  }, [overview])

  const filteredTopics = useMemo(() => {
    if (!topicQuery.trim()) return []
    const q = topicQuery.toLowerCase()
    return topics.filter((t) => t.title.toLowerCase().includes(q) || t.id.includes(q)).slice(0, 20)
  }, [topics, topicQuery])

  async function selectTopic(t: TopicOption) {
    setSelectedTopic(t)
    setTopicQuery('')
    setEditing(false)
    setError('')
    setShowImport(false)
    setLoading(true)
    const res = await fetch(`/api/admin/presentations?topicId=${encodeURIComponent(t.id)}`)
    const data = await res.json()
    setPresentation(res.ok ? data : null)
    setSlides(data?.slides ?? [])
    setLoading(false)
  }

  function startEdit() {
    setSlides(presentation?.slides ?? [{ ...EMPTY_SLIDE }])
    setEditing(true)
    setError('')
  }

  function validateSlides(s: Slide[]): string | null {
    if (s.length === 0) return 'At least one slide is required.'
    for (const slide of s) {
      if (!slide.heading.trim()) return 'Every slide needs a heading.'
      if (slide.bullets.length === 0 || slide.bullets.every((b) => !b.trim())) return 'Every slide needs at least one bullet.'
    }
    return null
  }

  async function saveSlides() {
    if (!selectedTopic) return
    const cleaned = slides.map((s) => ({ heading: s.heading.trim(), bullets: s.bullets.map((b) => b.trim()).filter(Boolean) }))
    const invalid = validateSlides(cleaned)
    if (invalid) { setError(invalid); return }
    setSaving(true); setError('')
    const method = presentation ? 'PATCH' : 'POST'
    const res = await fetch('/api/admin/presentations', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic_id: selectedTopic.id, slides: cleaned }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    await selectTopic(selectedTopic)
    await loadOverview()
    setEditing(false); setSaving(false)
    flash('Presentation saved.')
  }

  async function togglePublished() {
    if (!selectedTopic || !presentation) return
    await fetch('/api/admin/presentations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic_id: selectedTopic.id, published: !presentation.published }),
    })
    await selectTopic(selectedTopic)
    await loadOverview()
  }

  async function deletePresentation() {
    if (!selectedTopic) return
    if (!confirm('Delete this presentation permanently?')) return
    await fetch(`/api/admin/presentations?topicId=${encodeURIComponent(selectedTopic.id)}`, { method: 'DELETE' })
    await selectTopic(selectedTopic)
    await loadOverview()
    flash('Presentation deleted.')
  }

  async function importJson() {
    if (!selectedTopic) return
    let parsed: unknown
    try {
      parsed = JSON.parse(importText)
    } catch {
      setError('Invalid JSON.')
      return
    }
    const s = (parsed as { slides?: unknown })?.slides ?? parsed
    setError('')
    setSaving(true)
    const res = await fetch('/api/admin/presentations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic_id: selectedTopic.id, slides: s }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    await selectTopic(selectedTopic)
    await loadOverview()
    setShowImport(false); setImportText(''); setSaving(false)
    flash('Presentation imported.')
  }

  function updateSlide(i: number, patch: Partial<Slide>) {
    setSlides((prev) => prev.map((s, si) => (si === i ? { ...s, ...patch } : s)))
  }
  function updateBullet(si: number, bi: number, val: string) {
    setSlides((prev) => prev.map((s, i) => (i === si ? { ...s, bullets: s.bullets.map((b, bii) => (bii === bi ? val : b)) } : s)))
  }
  function addBullet(si: number) {
    setSlides((prev) => prev.map((s, i) => (i === si ? { ...s, bullets: [...s.bullets, ''] } : s)))
  }
  function removeBullet(si: number, bi: number) {
    setSlides((prev) => prev.map((s, i) => (i === si ? { ...s, bullets: s.bullets.filter((_, bii) => bii !== bi) } : s)))
  }
  function addSlide() {
    setSlides((prev) => [...prev, { ...EMPTY_SLIDE, bullets: [''] }])
  }
  function removeSlide(si: number) {
    setSlides((prev) => prev.filter((_, i) => i !== si))
  }

  return (
    <div>
      <div className="sticky top-[57px] z-30 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
          <Presentation weight="light" size={20} className="text-muted-foreground shrink-0" />
          <h1 className="text-base font-bold text-foreground shrink-0">Presentations</h1>
          {selectedTopic && (
            <span className="truncate text-sm text-muted-foreground">— {selectedTopic.title}</span>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-6 space-y-4">
        <div className="relative">
          <MagnifyingGlass weight="light" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={topicQuery}
            onChange={(e) => setTopicQuery(e.target.value)}
            placeholder="Search a topic to manage its presentation…"
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
                  {overviewByTopic[t.id] && (
                    <span className={cn(
                      'ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                      overviewByTopic[t.id].published
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-muted text-muted-foreground',
                    )}>
                      {overviewByTopic[t.id].published ? 'published' : 'draft'}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {!selectedTopic && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Search for a topic above to view or author its presentation.
          </p>
        )}

        {msg && (
          <p className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">{msg}</p>
        )}

        {selectedTopic && (
          <>
            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">{error}</p>
            )}

            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner weight="light" size={28} className="animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {presentation ? (
                      <span className={cn(
                        'rounded-full px-2.5 py-1 text-xs font-semibold',
                        presentation.published
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'bg-muted text-muted-foreground',
                      )}>
                        {presentation.published ? 'Published' : 'Draft'}
                      </span>
                    ) : (
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">No presentation yet</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {presentation && (
                      <button
                        onClick={togglePublished}
                        className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                      >
                        {presentation.published ? 'Unpublish' : 'Publish'}
                      </button>
                    )}
                    <button
                      onClick={() => setShowImport((v) => !v)}
                      className="flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                      <UploadSimple weight="light" size={13} /> Import JSON
                    </button>
                    {presentation && !editing && (
                      <button
                        onClick={deletePresentation}
                        className="flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash weight="light" size={13} /> Delete
                      </button>
                    )}
                    {!editing && (
                      <button
                        onClick={startEdit}
                        className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        <PencilSimple weight="light" size={15} /> {presentation ? 'Edit' : 'Create'}
                      </button>
                    )}
                  </div>
                </div>

                {showImport && (
                  <div className="rounded-2xl border-2 border-primary/40 bg-card p-4 space-y-3 shadow-sm">
                    <textarea
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      rows={6}
                      placeholder='{"slides": [{"heading": "...", "bullets": ["...", "..."]}]}'
                      className="field resize-y font-mono text-xs"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={importJson}
                        disabled={saving}
                        className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
                      >
                        {saving ? <Spinner weight="light" size={15} className="animate-spin" /> : <UploadSimple weight="light" size={15} />}
                        Import
                      </button>
                      <button onClick={() => setShowImport(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {editing ? (
                  <div className="space-y-3">
                    {slides.map((slide, si) => (
                      <div key={si} className="rounded-2xl border border-border bg-card p-4 space-y-2 shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="shrink-0 rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-mono font-semibold text-primary">{si + 1}</span>
                          <input
                            value={slide.heading}
                            onChange={(e) => updateSlide(si, { heading: e.target.value })}
                            placeholder="Slide heading"
                            className="field flex-1"
                          />
                          <button onClick={() => removeSlide(si)} className="icon-btn hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 shrink-0" title="Remove slide">
                            <Trash weight="light" size={14} />
                          </button>
                        </div>
                        <div className="space-y-1.5 pl-8">
                          {slide.bullets.map((b, bi) => (
                            <div key={bi} className="flex items-center gap-2">
                              <input
                                value={b}
                                onChange={(e) => updateBullet(si, bi, e.target.value)}
                                placeholder={`Bullet ${bi + 1}`}
                                className="field flex-1"
                              />
                              {slide.bullets.length > 1 && (
                                <button onClick={() => removeBullet(si, bi)} className="icon-btn hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 shrink-0" title="Remove bullet">
                                  <X weight="light" size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                          <button onClick={() => addBullet(si)} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                            <Plus weight="bold" size={12} /> Add bullet
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={addSlide}
                      className="flex items-center gap-1.5 rounded-xl border border-dashed border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors w-full justify-center"
                    >
                      <Plus weight="bold" size={15} /> Add slide
                    </button>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={saveSlides}
                        disabled={saving}
                        className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
                      >
                        {saving ? <Spinner weight="light" size={15} className="animate-spin" /> : <FloppyDisk weight="fill" size={15} />}
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button onClick={() => { setEditing(false); setError('') }} className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : presentation ? (
                  <div className="space-y-2">
                    {presentation.slides.map((slide, si) => (
                      <div key={si} className="rounded-2xl border border-border bg-card p-4">
                        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <span className="shrink-0 rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-mono font-semibold text-primary">{si + 1}</span>
                          {slide.heading}
                        </p>
                        <ul className="mt-2 space-y-1 pl-8 text-sm text-muted-foreground list-disc">
                          {slide.bullets.map((b, bi) => <li key={bi}>{b}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">No presentation for this topic yet.</p>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
