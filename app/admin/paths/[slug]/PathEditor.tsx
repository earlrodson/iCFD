'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, FloppyDisk, Plus, Trash,
  ArrowUp, ArrowDown, MagnifyingGlass,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'

interface TopicOption { id: string; title: string; category: string }

interface PathFormState {
  slug: string
  title: string
  description: string
  audience: string
  difficulty: string
  estimated_minutes: number
  icon: string
  topicIds: string[]
}

const ICON_OPTIONS = ['cross', 'shield', 'star', 'ladder', 'book', 'heart']
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced']

const EMPTY: PathFormState = {
  slug: '', title: '', description: '', audience: '',
  difficulty: 'beginner', estimated_minutes: 30, icon: 'cross', topicIds: [],
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function PathEditor({ slug }: { slug: string }) {
  const router = useRouter()
  const isNew = slug === 'new'

  const [form, setForm] = useState<PathFormState>({ ...EMPTY })
  const [loading, setLoading] = useState(!isNew)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState('')

  const [allTopics, setAllTopics] = useState<TopicOption[]>([])
  const [topicMap, setTopicMap] = useState<Record<string, TopicOption>>({})
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  function set<K extends keyof PathFormState>(key: K, val: PathFormState[K]) {
    setForm((p) => ({ ...p, [key]: val }))
  }

  // Load EN topics for the picker
  useEffect(() => {
    createClient()
      .from('topics')
      .select('id, title, category')
      .eq('lang', 'en')
      .order('title')
      .then(({ data }) => {
        const opts = (data ?? []) as TopicOption[]
        setAllTopics(opts)
        setTopicMap(Object.fromEntries(opts.map((t) => [t.id, t])))
      })
  }, [])

  // Load existing path
  useEffect(() => {
    if (isNew) return
    async function load() {
      const supabase = createClient()
      const { data: path } = await supabase.from('paths').select('*').eq('slug', slug).single()
      const { data: pts } = await supabase
        .from('path_topics')
        .select('topic_id, position')
        .eq('path_slug', slug)
        .order('position')

      if (path) {
        setForm({
          slug: path.slug,
          title: path.title,
          description: path.description,
          audience: path.audience,
          difficulty: path.difficulty,
          estimated_minutes: path.estimated_minutes,
          icon: path.icon,
          topicIds: (pts ?? []).map((r) => r.topic_id),
        })
      }
      setLoading(false)
    }
    load()
  }, [isNew, slug])

  // Close search dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleSave() {
    if (!form.title.trim()) { setError('Title is required.'); return }
    setStatus('saving'); setError('')

    const finalSlug = isNew ? slugify(form.title) : form.slug
    if (!finalSlug) { setError('Could not generate slug from title.'); setStatus('error'); return }

    const supabase = createClient()

    const { error: pathErr } = await supabase.from('paths').upsert({
      slug: finalSlug,
      title: form.title.trim(),
      description: form.description.trim(),
      audience: form.audience.trim(),
      difficulty: form.difficulty,
      estimated_minutes: form.estimated_minutes,
      icon: form.icon,
    }, { onConflict: 'slug' })

    if (pathErr) { setError(pathErr.message); setStatus('error'); return }

    // Replace all path_topics
    await supabase.from('path_topics').delete().eq('path_slug', finalSlug)

    if (form.topicIds.length > 0) {
      const { error: ptErr } = await supabase.from('path_topics').insert(
        form.topicIds.map((topic_id, position) => ({ path_slug: finalSlug, topic_id, position }))
      )
      if (ptErr) { setError(ptErr.message); setStatus('error'); return }
    }

    setStatus('saved')
    setTimeout(() => {
      if (isNew) router.replace(`/admin/paths/${finalSlug}`)
      else setStatus('idle')
    }, 1200)
  }

  function addTopic(id: string) {
    if (form.topicIds.includes(id)) return
    set('topicIds', [...form.topicIds, id])
    setSearch('')
    setShowSearch(false)
  }

  function removeTopic(id: string) {
    set('topicIds', form.topicIds.filter((t) => t !== id))
  }

  function moveTopic(idx: number, dir: -1 | 1) {
    const next = [...form.topicIds]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    set('topicIds', next)
  }

  const searchResults = search.trim()
    ? allTopics.filter(
        (t) =>
          !form.topicIds.includes(t.id) &&
          (t.title.toLowerCase().includes(search.toLowerCase()) ||
           t.id.includes(search.toLowerCase()))
      ).slice(0, 8)
    : []

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="pb-24">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <button onClick={() => router.push('/admin/paths')} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <ArrowLeft weight="light" size={18} />
          </button>
          <h1 className="flex-1 text-sm font-semibold text-foreground truncate">
            {isNew ? 'New Path' : form.title || slug}
          </h1>
          {error && <p className="text-xs text-rose-600 truncate max-w-[200px]">{error}</p>}
          <button
            onClick={handleSave}
            disabled={status === 'saving'}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <FloppyDisk weight="fill" size={15} />
            {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 pt-6 space-y-8">

        {/* Metadata */}
        <section>
          <h3 className="mb-3 text-base font-semibold text-foreground">Details</h3>
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Title</p>
              <input
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="e.g. New Catholic"
                className="field"
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Description</p>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={2}
                placeholder="Brief description shown on the paths list…"
                className="field resize-none"
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Audience</p>
              <input
                value={form.audience}
                onChange={(e) => set('audience', e.target.value)}
                placeholder="e.g. New Catholics, RCIA candidates…"
                className="field"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Difficulty</p>
                <select value={form.difficulty} onChange={(e) => set('difficulty', e.target.value)} className="field">
                  {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Est. Minutes</p>
                <input
                  type="number"
                  min={1}
                  value={form.estimated_minutes}
                  onChange={(e) => set('estimated_minutes', Number(e.target.value))}
                  className="field"
                />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Icon</p>
                <select value={form.icon} onChange={(e) => set('icon', e.target.value)} className="field">
                  {ICON_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Topics */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">
              Topics <span className="text-sm font-normal text-muted-foreground">({form.topicIds.length})</span>
            </h3>
          </div>

          {/* Topic list */}
          <div className="space-y-2 mb-3">
            {form.topicIds.length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center">No topics yet. Search below to add.</p>
            )}
            {form.topicIds.map((id, idx) => {
              const topic = topicMap[id]
              return (
                <div key={id} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
                  <span className="w-5 text-center text-xs font-mono text-muted-foreground">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{topic?.title ?? id}</p>
                    <p className="text-xs text-muted-foreground font-mono">{id}</p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => moveTopic(idx, -1)} disabled={idx === 0} className="icon-btn disabled:opacity-30" aria-label="Move up">
                      <ArrowUp weight="light" size={14} />
                    </button>
                    <button onClick={() => moveTopic(idx, 1)} disabled={idx === form.topicIds.length - 1} className="icon-btn disabled:opacity-30" aria-label="Move down">
                      <ArrowDown weight="light" size={14} />
                    </button>
                    <button onClick={() => removeTopic(id)} className="icon-btn hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20" aria-label="Remove">
                      <Trash weight="light" size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Topic search */}
          <div ref={searchRef} className="relative">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2 focus-within:ring-2 focus-within:ring-primary">
              <MagnifyingGlass weight="light" size={15} className="text-muted-foreground shrink-0" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setShowSearch(true) }}
                onFocus={() => setShowSearch(true)}
                placeholder="Search topics to add…"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
            {showSearch && searchResults.length > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-card shadow-lg overflow-hidden">
                {searchResults.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => addTopic(t.id)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted transition-colors"
                  >
                    <Plus weight="bold" size={12} className="text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground font-mono">{t.id}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {showSearch && search.trim() && searchResults.length === 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-card px-4 py-3 shadow-lg">
                <p className="text-sm text-muted-foreground">No topics match "{search}"</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
