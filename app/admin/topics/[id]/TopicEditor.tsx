'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FloppyDisk, ArrowLeft, Plus, Trash, Spinner } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import type { Json } from '@/lib/supabase/database.types'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Scripture { reference: string; text: string; version: string }
interface ChurchFather { author: string; quote: string; source: string }

type Lang = 'en' | 'tl' | 'ceb'

interface FormState {
  id: string
  lang: Lang
  category: string
  title: string
  question: string
  answer: string
  difficulty: string
  tags: string
  relatedTopics: string
  scripture: Scripture[]
  catechism: string[]
  churchFathers: ChurchFather[]
}

const CATEGORIES = ['sacraments', 'mary', 'papacy', 'salvation', 'bible', 'saints', 'tradition', 'church-teaching']
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced']
const LANGS = ['en', 'tl', 'ceb']

const EMPTY: FormState = {
  id: '', lang: 'en', category: 'bible', title: '', question: '', answer: '',
  difficulty: 'beginner', tags: '', relatedTopics: '',
  scripture: [], catechism: [], churchFathers: [],
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

// ── Component ──────────────────────────────────────────────────────────────────

export function TopicEditor({ topicId, lang }: { topicId: string; lang: string }) {
  const router = useRouter()
  const isNew = topicId === 'new'
  const safeLang = (['en', 'tl', 'ceb'].includes(lang) ? lang : 'en') as Lang

  const [form, setForm]       = useState<FormState>({ ...EMPTY, lang: safeLang })
  const [loading, setLoading] = useState(!isNew)
  const [status, setStatus]   = useState<SaveStatus>('idle')
  const [error, setError]     = useState('')

  useEffect(() => {
    if (isNew) return
    async function load() {
      const { data } = await createClient()
        .from('topics')
        .select('*')
        .eq('id', topicId)
        .eq('lang', safeLang)
        .single()
      if (data) {
        setForm({
          id: data.id,
          lang: data.lang,
          category: data.category,
          title: data.title,
          question: data.question,
          answer: typeof data.answer === 'string' ? data.answer : (data.answer as { full?: string })?.full ?? '',
          difficulty: data.difficulty,
          tags: Array.isArray(data.tags) ? (data.tags as unknown as string[]).join(', ') : '',
          relatedTopics: Array.isArray(data.related_topics) ? (data.related_topics as unknown as string[]).join(', ') : '',
          scripture: Array.isArray(data.scripture) ? data.scripture as unknown as Scripture[] : [],
          catechism: Array.isArray(data.catechism) ? data.catechism as unknown as string[] : [],
          churchFathers: Array.isArray(data.church_fathers) ? data.church_fathers as unknown as ChurchFather[] : [],
        })
      }
      setLoading(false)
    }
    load()
  }, [isNew, topicId, lang])

  async function handleSave() {
    if (!form.id.trim() || !form.title.trim()) {
      setError('ID and Title are required.'); return
    }
    setStatus('saving'); setError('')

    type Category = 'sacraments' | 'mary' | 'papacy' | 'salvation' | 'bible' | 'saints' | 'tradition' | 'church-teaching'
    type Difficulty = 'beginner' | 'intermediate' | 'advanced'

    const row = {
      id: form.id.trim().toLowerCase().replace(/\s+/g, '-'),
      lang: form.lang,
      category: form.category as Category,
      title: form.title.trim(),
      question: form.question.trim(),
      answer: form.answer.trim(),
      difficulty: form.difficulty as Difficulty,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean) as unknown as Json,
      related_topics: form.relatedTopics.split(',').map((t) => t.trim()).filter(Boolean) as unknown as Json,
      scripture: form.scripture.filter((s) => s.reference.trim()) as unknown as Json,
      catechism: form.catechism.filter((c) => c.trim()) as unknown as Json,
      church_fathers: form.churchFathers.filter((f) => f.author.trim()) as unknown as Json,
      last_updated: new Date().toISOString(),
    }

    const { error: dbErr } = await createClient()
      .from('topics')
      .upsert(row, { onConflict: 'id,lang' })

    if (dbErr) {
      setError(dbErr.message)
      setStatus('error')
    } else {
      setStatus('saved')
      setTimeout(() => {
        setStatus('idle')
        if (isNew) router.push('/admin/topics')
      }, 1200)
    }
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  // ── Scripture helpers ───────────────────────────────────────────────────────

  function addScripture() {
    set('scripture', [...form.scripture, { reference: '', text: '', version: 'NABRE' }])
  }
  function updateScripture(i: number, field: keyof Scripture, val: string) {
    const next = form.scripture.map((s, idx) => idx === i ? { ...s, [field]: val } : s)
    set('scripture', next)
  }
  function removeScripture(i: number) {
    set('scripture', form.scripture.filter((_, idx) => idx !== i))
  }

  // ── Catechism helpers ───────────────────────────────────────────────────────

  function addCatechism() { set('catechism', [...form.catechism, '']) }
  function updateCatechism(i: number, val: string) {
    set('catechism', form.catechism.map((c, idx) => idx === i ? val : c))
  }
  function removeCatechism(i: number) {
    set('catechism', form.catechism.filter((_, idx) => idx !== i))
  }

  // ── Church Father helpers ───────────────────────────────────────────────────

  function addFather() {
    set('churchFathers', [...form.churchFathers, { author: '', quote: '', source: '' }])
  }
  function updateFather(i: number, field: keyof ChurchFather, val: string) {
    const next = form.churchFathers.map((f, idx) => idx === i ? { ...f, [field]: val } : f)
    set('churchFathers', next)
  }
  function removeFather(i: number) {
    set('churchFathers', form.churchFathers.filter((_, idx) => idx !== i))
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner weight="light" size={32} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="pb-32">
      {/* Sticky header */}
      <div className="sticky top-[57px] z-30 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft weight="light" size={18} />
            Back
          </button>
          <h2 className="text-sm font-semibold text-foreground">
            {isNew ? 'New Topic' : 'Edit Topic'}
          </h2>
          <button
            onClick={handleSave}
            disabled={status === 'saving'}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {status === 'saving'
              ? <Spinner weight="light" size={16} className="animate-spin" />
              : <FloppyDisk weight="fill" size={16} />}
            {status === 'saved' ? 'Saved!' : status === 'saving' ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-8 space-y-8">
        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">{error}</p>
        )}

        {/* ── Identity ── */}
        <Section title="Identity">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="col-span-2 sm:col-span-1">
              <Label>ID (slug)</Label>
              <input
                value={form.id}
                onChange={(e) => set('id', e.target.value)}
                disabled={!isNew}
                placeholder="e.g. papal-infallibility"
                className="field disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <Label>Language</Label>
              <select
                value={form.lang}
                onChange={(e) => set('lang', e.target.value as Lang)}
                disabled={!isNew}
                className="field disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {LANGS.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <Label>Difficulty</Label>
              <select value={form.difficulty} onChange={(e) => set('difficulty', e.target.value)} className="field">
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label>Category</Label>
            <select value={form.category} onChange={(e) => set('category', e.target.value)} className="field">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </Section>

        {/* ── Content ── */}
        <Section title="Content">
          <div>
            <Label>Title</Label>
            <input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="The Immaculate Conception of Mary"
              className="field"
            />
          </div>
          <div>
            <Label>Question</Label>
            <textarea
              value={form.question}
              onChange={(e) => set('question', e.target.value)}
              rows={2}
              placeholder="Why do Catholics believe Mary was sinless?"
              className="field resize-none"
            />
          </div>
          <div>
            <Label>Answer</Label>
            <textarea
              value={form.answer}
              onChange={(e) => set('answer', e.target.value)}
              rows={8}
              placeholder="Full answer text…"
              className="field resize-y"
            />
          </div>
        </Section>

        {/* ── Tags & Related ── */}
        <Section title="Tags & Related Topics">
          <div>
            <Label>Tags <span className="text-muted-foreground font-normal">(comma-separated)</span></Label>
            <input
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
              placeholder="mary, immaculate conception, original sin"
              className="field"
            />
          </div>
          <div>
            <Label>Related Topic IDs <span className="text-muted-foreground font-normal">(comma-separated slugs)</span></Label>
            <input
              value={form.relatedTopics}
              onChange={(e) => set('relatedTopics', e.target.value)}
              placeholder="perpetual-virginity, prayer-to-saints"
              className="field"
            />
          </div>
        </Section>

        {/* ── Scripture ── */}
        <Section
          title="Scripture References"
          action={<AddButton onClick={addScripture} label="Add verse" />}
        >
          {form.scripture.length === 0 && (
            <p className="text-xs text-muted-foreground">No verses yet. Click "Add verse" to add one.</p>
          )}
          {form.scripture.map((s, i) => (
            <div key={i} className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-2 flex-1">
                  <input
                    value={s.reference}
                    onChange={(e) => updateScripture(i, 'reference', e.target.value)}
                    placeholder="Luke 1:28"
                    className="field w-32 shrink-0"
                  />
                  <input
                    value={s.version}
                    onChange={(e) => updateScripture(i, 'version', e.target.value)}
                    placeholder="NABRE"
                    className="field w-24 shrink-0"
                  />
                </div>
                <button onClick={() => removeScripture(i)} className="icon-btn text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20">
                  <Trash weight="light" size={15} />
                </button>
              </div>
              <textarea
                value={s.text}
                onChange={(e) => updateScripture(i, 'text', e.target.value)}
                rows={2}
                placeholder="Verse text…"
                className="field resize-none"
              />
            </div>
          ))}
        </Section>

        {/* ── Catechism ── */}
        <Section
          title="Catechism Citations"
          action={<AddButton onClick={addCatechism} label="Add citation" />}
        >
          {form.catechism.length === 0 && (
            <p className="text-xs text-muted-foreground">No citations yet.</p>
          )}
          {form.catechism.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={c}
                onChange={(e) => updateCatechism(i, e.target.value)}
                placeholder="CCC 491"
                className="field flex-1"
              />
              <button onClick={() => removeCatechism(i)} className="icon-btn text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20">
                <Trash weight="light" size={15} />
              </button>
            </div>
          ))}
        </Section>

        {/* ── Church Fathers ── */}
        <Section
          title="Church Fathers"
          action={<AddButton onClick={addFather} label="Add quote" />}
        >
          {form.churchFathers.length === 0 && (
            <p className="text-xs text-muted-foreground">No patristic quotes yet.</p>
          )}
          {form.churchFathers.map((f, i) => (
            <div key={i} className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-2 flex-1">
                  <input
                    value={f.author}
                    onChange={(e) => updateFather(i, 'author', e.target.value)}
                    placeholder="Author"
                    className="field flex-1"
                  />
                  <input
                    value={f.source}
                    onChange={(e) => updateFather(i, 'source', e.target.value)}
                    placeholder="Source / Work"
                    className="field flex-1"
                  />
                </div>
                <button onClick={() => removeFather(i)} className="icon-btn text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20">
                  <Trash weight="light" size={15} />
                </button>
              </div>
              <textarea
                value={f.quote}
                onChange={(e) => updateFather(i, 'quote', e.target.value)}
                rows={3}
                placeholder="Quote text…"
                className="field resize-none"
              />
            </div>
          ))}
        </Section>
      </div>
    </div>
  )
}

// ── Small helpers ──────────────────────────────────────────────────────────────

function Section({
  title, action, children,
}: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1 text-xs font-medium text-muted-foreground">{children}</p>
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
    >
      <Plus weight="bold" size={13} />
      {label}
    </button>
  )
}
