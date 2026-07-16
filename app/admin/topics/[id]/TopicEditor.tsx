'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { FloppyDisk, ArrowLeft, Plus, Trash, Spinner, MagnifyingGlass, X } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import type { Json } from '@/lib/supabase/database.types'

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false })

// ── Reference types ────────────────────────────────────────────────────────────

interface ScriptureVerse { id: number; reference: string; version: string; text: string }
interface CCCParagraph  { paragraph: number; summary: string | null; text: string | null }
interface FatherQuote   { id: number; author: string; quote: string; source: string; year_approx: number | null }
interface Objection     { objection: string; response: string }

type Lang = 'en' | 'tl' | 'ceb'

interface FormState {
  id: string; lang: Lang; category: string; title: string
  question: string; answer: string; difficulty: string
  tags: string; relatedTopics: string
  scriptureIds: number[]; scriptureItems: ScriptureVerse[]
  catechismNums: number[]
  fatherIds: number[]; fatherItems: FatherQuote[]
  objections: Objection[]
  translationNotes: string; answerFull: string
  published: boolean
}

const CATEGORIES = ['sacraments','mary','papacy','salvation','bible','saints','tradition','church-teaching']
const DIFFICULTIES = ['beginner','intermediate','advanced']
const LANGS = ['en','tl','ceb']

const EMPTY: FormState = {
  id:'', lang:'en', category:'bible', title:'', question:'', answer:'',
  difficulty:'beginner', tags:'', relatedTopics:'',
  scriptureIds:[], scriptureItems:[],
  catechismNums:[],
  fatherIds:[], fatherItems:[],
  objections:[],
  translationNotes:'', answerFull:'',
  published: true,
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

// ── Scripture picker ───────────────────────────────────────────────────────────

function ScripturePicker({
  selected, items,
  onAdd, onRemove, onNewAdded,
}: {
  selected: number[]
  items: ScriptureVerse[]
  onAdd: (v: ScriptureVerse) => void
  onRemove: (id: number) => void
  onNewAdded: (v: ScriptureVerse) => void
}) {
  const supabase = createClient()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ScriptureVerse[]>([])
  const [searching, setSearching] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ reference:'', version:'NABRE', text:'' })
  const [saving, setSaving] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    clearTimeout(debounce.current)
    if (!query.trim()) { setResults([]); return }
    debounce.current = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase
        .from('scripture_verses')
        .select('id,reference,version,text')
        .ilike('reference', `%${query}%`)
        .limit(8)
      setResults((data ?? []).filter(v => !selected.includes(v.id)))
      setSearching(false)
    }, 250)
  }, [query, selected])

  async function addNew() {
    if (!newForm.reference.trim() || !newForm.text.trim()) return
    setSaving(true)
    const { data } = await supabase
      .from('scripture_verses')
      .insert({ reference: newForm.reference, version: newForm.version, text: newForm.text })
      .select('id,reference,version,text')
      .single()
    if (data) { onAdd(data); onNewAdded(data) }
    setNewForm({ reference:'', version:'NABRE', text:'' })
    setShowNew(false)
    setSaving(false)
  }

  return (
    <div className="space-y-3">
      {/* Selected verses */}
      {items.map(v => (
        <div key={v.id} className="flex gap-2 items-start rounded-xl border border-border bg-card p-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-primary">{v.reference} <span className="font-normal text-muted-foreground text-xs">({v.version})</span></p>
            <p className="text-xs text-muted-foreground mt-0.5 italic leading-relaxed line-clamp-2">&ldquo;{v.text}&rdquo;</p>
          </div>
          <button onClick={() => onRemove(v.id)} className="shrink-0 p-1 text-muted-foreground hover:text-red-500 transition-colors">
            <X size={14} weight="bold" />
          </button>
        </div>
      ))}

      {/* Search */}
      <div className="relative">
        <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search verses (e.g. John 1, Exodus 25)…"
          className="field pl-8"
        />
        {searching && <Spinner size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>

      {results.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
          {results.map(v => (
            <button key={v.id} onClick={() => { onAdd(v); setQuery(''); setResults([]) }}
              className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors">
              <p className="text-sm font-medium text-foreground">{v.reference} <span className="text-muted-foreground font-normal">({v.version})</span></p>
              <p className="text-xs text-muted-foreground italic truncate">{v.text.slice(0, 80)}{v.text.length > 80 ? '…' : ''}</p>
            </button>
          ))}
        </div>
      )}

      {/* Add new inline */}
      {showNew ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3 space-y-2">
          <div className="flex gap-2">
            <input value={newForm.reference} onChange={e => setNewForm(f => ({...f, reference:e.target.value}))}
              placeholder="Reference (e.g. John 1:1)" className="field flex-1" />
            <select value={newForm.version} onChange={e => setNewForm(f => ({...f, version:e.target.value}))}
              className="field w-28">
              {['NABRE','RSV-CE','DRB','NRSV'].map(v => <option key={v}>{v}</option>)}
            </select>
          </div>
          <textarea value={newForm.text} onChange={e => setNewForm(f => ({...f, text:e.target.value}))}
            rows={2} placeholder="Verse text…" className="field resize-none" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowNew(false)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1">Cancel</button>
            <button onClick={addNew} disabled={saving}
              className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50">
              {saving ? 'Saving…' : 'Add to library & attach'}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-1 text-xs text-primary hover:underline">
          <Plus size={12} weight="bold" /> Add new verse to library
        </button>
      )}
    </div>
  )
}

// ── Catechism picker ───────────────────────────────────────────────────────────

function CatechismPicker({
  selected, onAdd, onRemove,
}: { selected: number[]; onAdd: (n: number) => void; onRemove: (n: number) => void }) {
  const supabase = createClient()
  const [input, setInput] = useState('')
  const [preview, setPreview] = useState<CCCParagraph | null>(null)
  const [notFound, setNotFound] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    clearTimeout(debounce.current)
    const num = parseInt(input)
    if (!num) { setPreview(null); setNotFound(false); return }
    debounce.current = setTimeout(async () => {
      const { data } = await supabase
        .from('ccc_paragraphs')
        .select('paragraph,summary,text')
        .eq('paragraph', num)
        .maybeSingle()
      setPreview(data ?? null)
      setNotFound(!data)
    }, 300)
  }, [input])

  async function add() {
    const num = parseInt(input)
    if (!num || selected.includes(num)) return
    if (!preview) {
      // auto-create stub
      await supabase.from('ccc_paragraphs').upsert({ paragraph: num })
    }
    onAdd(num)
    setInput('')
    setPreview(null)
    setNotFound(false)
  }

  return (
    <div className="space-y-3">
      {/* Selected */}
      <div className="flex flex-wrap gap-2">
        {selected.map(n => (
          <span key={n} className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary">
            CCC {n}
            <button onClick={() => onRemove(n)} className="hover:text-red-500 transition-colors">
              <X size={12} weight="bold" />
            </button>
          </span>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Paragraph number (e.g. 464)"
          type="number"
          className="field flex-1"
        />
        <button onClick={add} disabled={!input}
          className="rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40">
          Add
        </button>
      </div>

      {preview && (
        <div className="rounded-xl bg-muted/50 border border-border px-3 py-2">
          <p className="text-xs font-semibold text-primary">CCC {preview.paragraph}</p>
          {preview.summary && <p className="text-xs text-foreground mt-0.5">{preview.summary}</p>}
          {!preview.summary && <p className="text-xs text-muted-foreground italic">No summary stored yet.</p>}
        </div>
      )}
      {notFound && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          CCC {input} not in library yet — will be created as a stub when added.
        </p>
      )}
    </div>
  )
}

// ── Church Father picker ───────────────────────────────────────────────────────

function FatherPicker({
  selected, items,
  onAdd, onRemove, onNewAdded,
}: {
  selected: number[]
  items: FatherQuote[]
  onAdd: (q: FatherQuote) => void
  onRemove: (id: number) => void
  onNewAdded: (q: FatherQuote) => void
}) {
  const supabase = createClient()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FatherQuote[]>([])
  const [searching, setSearching] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ author:'', quote:'', source:'', year_approx:'' })
  const [saving, setSaving] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    clearTimeout(debounce.current)
    if (!query.trim()) { setResults([]); return }
    debounce.current = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase
        .from('church_father_quotes')
        .select('id,author,quote,source,year_approx')
        .or(`author.ilike.%${query}%,quote.ilike.%${query}%`)
        .limit(6)
      setResults((data ?? []).filter(q => !selected.includes(q.id)))
      setSearching(false)
    }, 250)
  }, [query, selected])

  async function addNew() {
    if (!newForm.author.trim() || !newForm.quote.trim() || !newForm.source.trim()) return
    setSaving(true)
    const { data } = await supabase
      .from('church_father_quotes')
      .insert({
        author: newForm.author, quote: newForm.quote, source: newForm.source,
        year_approx: newForm.year_approx ? parseInt(newForm.year_approx) : null,
      })
      .select('id,author,quote,source,year_approx')
      .single()
    if (data) { onAdd(data); onNewAdded(data) }
    setNewForm({ author:'', quote:'', source:'', year_approx:'' })
    setShowNew(false)
    setSaving(false)
  }

  return (
    <div className="space-y-3">
      {/* Selected */}
      {items.map(q => (
        <div key={q.id} className="flex gap-2 items-start rounded-xl border border-border bg-card p-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{q.author}
              {q.year_approx && <span className="font-normal text-muted-foreground ml-1 text-xs">(c. {q.year_approx} AD)</span>}
            </p>
            <p className="text-xs text-muted-foreground italic mt-0.5 leading-relaxed line-clamp-2">&ldquo;{q.quote}&rdquo;</p>
            <p className="text-xs text-muted-foreground mt-0.5">— {q.source}</p>
          </div>
          <button onClick={() => onRemove(q.id)} className="shrink-0 p-1 text-muted-foreground hover:text-red-500 transition-colors">
            <X size={14} weight="bold" />
          </button>
        </div>
      ))}

      {/* Search */}
      <div className="relative">
        <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search by author or quote text…"
          className="field pl-8" />
        {searching && <Spinner size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>

      {results.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
          {results.map(q => (
            <button key={q.id} onClick={() => { onAdd(q); setQuery(''); setResults([]) }}
              className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors">
              <p className="text-sm font-medium text-foreground">{q.author}</p>
              <p className="text-xs text-muted-foreground italic truncate">&ldquo;{q.quote.slice(0,80)}{q.quote.length > 80 ? '…' : ''}&rdquo;</p>
            </button>
          ))}
        </div>
      )}

      {showNew ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3 space-y-2">
          <div className="flex gap-2">
            <input value={newForm.author} onChange={e => setNewForm(f => ({...f, author:e.target.value}))}
              placeholder="Author (e.g. St. Athanasius)" className="field flex-1" />
            <input value={newForm.year_approx} onChange={e => setNewForm(f => ({...f, year_approx:e.target.value}))}
              placeholder="Year" type="number" className="field w-24" />
          </div>
          <textarea value={newForm.quote} onChange={e => setNewForm(f => ({...f, quote:e.target.value}))}
            rows={3} placeholder="Quote text…" className="field resize-none" />
          <input value={newForm.source} onChange={e => setNewForm(f => ({...f, source:e.target.value}))}
            placeholder="Source (e.g. On the Incarnation, 54, c. AD 318)" className="field" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowNew(false)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1">Cancel</button>
            <button onClick={addNew} disabled={saving}
              className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50">
              {saving ? 'Saving…' : 'Add to library & attach'}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-1 text-xs text-primary hover:underline">
          <Plus size={12} weight="bold" /> Add new quote to library
        </button>
      )}
    </div>
  )
}

// ── TopicEditor ────────────────────────────────────────────────────────────────

export function TopicEditor({ topicId, lang }: { topicId: string; lang: string }) {
  const router  = useRouter()
  const isNew   = topicId === 'new'
  const safeLang = (['en','tl','ceb'].includes(lang) ? lang : 'en') as Lang

  const [form, setForm]     = useState<FormState>({ ...EMPTY, lang: safeLang })
  const [loading, setLoading] = useState(!isNew)
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [error, setError]   = useState('')

  useEffect(() => {
    if (isNew) return
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('topics').select('*')
        .eq('id', topicId).eq('lang', safeLang).single()

      if (data) {
        const scriptureIds: number[] = Array.isArray(data.scripture)
          ? (data.scripture as number[]).filter((x): x is number => typeof x === 'number')
          : []
        const fatherIds: number[] = Array.isArray(data.church_fathers)
          ? (data.church_fathers as number[]).filter((x): x is number => typeof x === 'number')
          : []
        const catechismNums: number[] = Array.isArray(data.catechism)
          ? (data.catechism as number[]).filter((x): x is number => typeof x === 'number')
          : []

        // Batch resolve IDs to display objects
        const [verseRows, quoteRows] = await Promise.all([
          scriptureIds.length
            ? supabase.from('scripture_verses').select('id,reference,version,text').in('id', scriptureIds).then(r => r.data ?? [])
            : Promise.resolve([]),
          fatherIds.length
            ? supabase.from('church_father_quotes').select('id,author,quote,source,year_approx').in('id', fatherIds).then(r => r.data ?? [])
            : Promise.resolve([]),
        ])

        const verseMap  = new Map((verseRows  as ScriptureVerse[]).map(v => [v.id, v]))
        const quoteMap  = new Map((quoteRows  as FatherQuote[]).map(q => [q.id, q]))

        const answer = typeof data.answer === 'string'
          ? data.answer
          : (data.answer as Record<string,string>)?.summary ?? (data.answer as Record<string,string>)?.full ?? ''

        setForm({
          id: data.id, lang: data.lang as Lang, category: data.category,
          title: data.title, question: data.question, answer,
          difficulty: data.difficulty,
          tags: Array.isArray(data.tags) ? (data.tags as string[]).join(', ') : '',
          relatedTopics: Array.isArray(data.related_topics) ? (data.related_topics as string[]).join(', ') : '',
          scriptureIds,
          scriptureItems: scriptureIds.map(id => verseMap.get(id)).filter((v): v is ScriptureVerse => !!v),
          catechismNums,
          fatherIds,
          fatherItems: fatherIds.map(id => quoteMap.get(id)).filter((q): q is FatherQuote => !!q),
          objections: Array.isArray(data.objections) ? data.objections as unknown as Objection[] : [],
          translationNotes: data.translation_notes ?? '',
          answerFull: data.answer_full ?? '',
          published: data.published ?? true,
        })
      }
      setLoading(false)
    }
    load()
  }, [isNew, topicId, lang])

  async function handleSave() {
    if (!form.id.trim() || !form.title.trim()) { setError('ID and Title are required.'); return }
    setStatus('saving'); setError('')

    type Category = 'sacraments'|'mary'|'papacy'|'salvation'|'bible'|'saints'|'tradition'|'church-teaching'
    type Difficulty = 'beginner'|'intermediate'|'advanced'

    const row = {
      id: form.id.trim().toLowerCase().replace(/\s+/g,'-'),
      lang: form.lang,
      category: form.category as Category,
      title: form.title.trim(),
      question: form.question.trim(),
      answer: form.answer.trim(),
      difficulty: form.difficulty as Difficulty,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) as unknown as Json,
      related_topics: form.relatedTopics.split(',').map(t => t.trim()).filter(Boolean) as unknown as Json,
      scripture: form.scriptureIds as unknown as Json,
      catechism: form.catechismNums as unknown as Json,
      church_fathers: form.fatherIds as unknown as Json,
      objections: form.objections.filter(o => o.objection.trim()) as unknown as Json,
      translation_notes: form.translationNotes.trim() || null,
      answer_full: form.answerFull.trim() || null,
      published: form.published,
      last_updated: new Date().toISOString(),
    }

    const { error: dbErr } = await createClient().from('topics').upsert(row, { onConflict: 'id,lang' })
    if (dbErr) { setError(dbErr.message); setStatus('error') }
    else {
      setStatus('saved')
      setTimeout(() => { setStatus('idle'); if (isNew) router.push('/admin/topics') }, 1200)
    }
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  // ── Objection helpers ────────────────────────────────────────────────────────

  function addObjection()  { set('objections', [...form.objections, { objection:'', response:'' }]) }
  function updateObjection(i: number, field: keyof Objection, val: string) {
    set('objections', form.objections.map((o, idx) => idx === i ? { ...o, [field]: val } : o))
  }
  function removeObjection(i: number) { set('objections', form.objections.filter((_,idx) => idx !== i)) }

  // ── Scripture helpers ────────────────────────────────────────────────────────

  function addVerse(v: ScriptureVerse) {
    if (form.scriptureIds.includes(v.id)) return
    set('scriptureIds',   [...form.scriptureIds,   v.id])
    set('scriptureItems', [...form.scriptureItems, v])
  }
  function removeVerse(id: number) {
    set('scriptureIds',   form.scriptureIds.filter(x => x !== id))
    set('scriptureItems', form.scriptureItems.filter(x => x.id !== id))
  }

  // ── Church Father helpers ────────────────────────────────────────────────────

  function addFather(q: FatherQuote) {
    if (form.fatherIds.includes(q.id)) return
    set('fatherIds',   [...form.fatherIds,   q.id])
    set('fatherItems', [...form.fatherItems, q])
  }
  function removeFather(id: number) {
    set('fatherIds',   form.fatherIds.filter(x => x !== id))
    set('fatherItems', form.fatherItems.filter(x => x.id !== id))
  }

  // ── Render ───────────────────────────────────────────────────────────────────

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
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft weight="light" size={18} /> Back
          </button>
          <h2 className="text-sm font-semibold text-foreground">{isNew ? 'New Topic' : 'Edit Topic'}</h2>
          <button onClick={handleSave} disabled={status === 'saving'}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors">
            {status === 'saving' ? <Spinner weight="light" size={16} className="animate-spin" /> : <FloppyDisk weight="fill" size={16} />}
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
              <input value={form.id} onChange={e => set('id', e.target.value)} disabled={!isNew}
                placeholder="e.g. papal-infallibility"
                className="field disabled:opacity-50 disabled:cursor-not-allowed" />
            </div>
            <div>
              <Label>Language</Label>
              <select value={form.lang} onChange={e => set('lang', e.target.value as Lang)} disabled={!isNew}
                className="field disabled:opacity-50 disabled:cursor-not-allowed">
                {LANGS.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <Label>Difficulty</Label>
              <select value={form.difficulty} onChange={e => set('difficulty', e.target.value)} className="field">
                {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label>Category</Label>
            <select value={form.category} onChange={e => set('category', e.target.value)} className="field">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Published</p>
              <p className="text-xs text-muted-foreground">Unpublished topics are hidden from the handbook</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.published}
              onClick={() => set('published', !form.published)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${form.published ? 'bg-primary' : 'bg-muted-foreground/30'}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${form.published ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>
        </Section>

        {/* ── Content ── */}
        <Section title="Content">
          <div>
            <Label>Title</Label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="The Immaculate Conception of Mary" className="field" />
          </div>
          <div>
            <Label>Question</Label>
            <textarea value={form.question} onChange={e => set('question', e.target.value)}
              rows={2} placeholder="Why do Catholics believe Mary was sinless?" className="field resize-none" />
          </div>
          <div>
            <Label>Answer <span className="text-muted-foreground font-normal">(Concise — shown on the Concise tab)</span></Label>
            <textarea value={form.answer} onChange={e => set('answer', e.target.value)}
              rows={6} placeholder="5-paragraph summary answer…" className="field resize-y" />
          </div>
          <div>
            <Label>Comprehensive Answer <span className="text-muted-foreground font-normal">(Markdown — shown on the Comprehensive tab)</span></Label>
            <div data-color-mode="auto" className="rounded-xl overflow-hidden border border-border">
              <MDEditor value={form.answerFull} onChange={val => set('answerFull', val ?? '')} height={400} preview="live" />
            </div>
          </div>
        </Section>

        {/* ── Tags & Related ── */}
        <Section title="Tags & Related Topics">
          <div>
            <Label>Tags <span className="text-muted-foreground font-normal">(comma-separated)</span></Label>
            <input value={form.tags} onChange={e => set('tags', e.target.value)}
              placeholder="mary, immaculate conception, original sin" className="field" />
          </div>
          <div>
            <Label>Related Topic IDs <span className="text-muted-foreground font-normal">(comma-separated slugs)</span></Label>
            <input value={form.relatedTopics} onChange={e => set('relatedTopics', e.target.value)}
              placeholder="perpetual-virginity, prayer-to-saints" className="field" />
          </div>
        </Section>

        {/* ── Scripture ── */}
        <Section title="Scripture References">
          <p className="text-xs text-muted-foreground -mt-1">
            Search the shared verse library. Verses added here are reused across all topics.
          </p>
          <ScripturePicker
            selected={form.scriptureIds}
            items={form.scriptureItems}
            onAdd={addVerse}
            onRemove={removeVerse}
            onNewAdded={addVerse}
          />
        </Section>

        {/* ── Catechism ── */}
        <Section title="Catechism Citations">
          <p className="text-xs text-muted-foreground -mt-1">
            Enter CCC paragraph numbers. Text will be pulled from the shared library when available.
          </p>
          <CatechismPicker
            selected={form.catechismNums}
            onAdd={n => set('catechismNums', [...form.catechismNums, n])}
            onRemove={n => set('catechismNums', form.catechismNums.filter(x => x !== n))}
          />
        </Section>

        {/* ── Church Fathers ── */}
        <Section title="Church Fathers">
          <p className="text-xs text-muted-foreground -mt-1">
            Search the shared quote library. Quotes added here are reused across all topics.
          </p>
          <FatherPicker
            selected={form.fatherIds}
            items={form.fatherItems}
            onAdd={addFather}
            onRemove={removeFather}
            onNewAdded={addFather}
          />
        </Section>

        {/* ── Objections ── */}
        <Section title="Common Objections" action={<AddButton onClick={addObjection} label="Add objection" />}>
          {form.objections.length === 0 && (
            <p className="text-xs text-muted-foreground">No objections yet.</p>
          )}
          {form.objections.map((o, i) => (
            <div key={i} className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">#{i+1}</p>
                <button onClick={() => removeObjection(i)} className="icon-btn ml-auto text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20">
                  <Trash weight="light" size={15} />
                </button>
              </div>
              <div>
                <Label>Objection</Label>
                <textarea value={o.objection} onChange={e => updateObjection(i,'objection',e.target.value)}
                  rows={2} placeholder="e.g. Mary was a sinner too…" className="field resize-none" />
              </div>
              <div>
                <Label>Response</Label>
                <textarea value={o.response} onChange={e => updateObjection(i,'response',e.target.value)}
                  rows={4} placeholder="Catholic response…" className="field resize-y" />
              </div>
            </div>
          ))}
        </Section>

        {/* ── Translation Notes ── */}
        <Section title="Translation Notes">
          <p className="text-xs text-muted-foreground -mt-1">
            Injected into the AI prompt when auto-translating this topic.
          </p>
          <textarea value={form.translationNotes} onChange={e => set('translationNotes', e.target.value)}
            rows={4}
            placeholder={'Do not translate: kecharitomene, latria, hyperdulia.\n\'grace\' → \'biyaya\' not \'pagpapala\'.'}
            className="field resize-y font-mono text-xs" />
        </Section>
      </div>
    </div>
  )
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
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
    <button onClick={onClick}
      className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors">
      <Plus weight="bold" size={13} />
      {label}
    </button>
  )
}
