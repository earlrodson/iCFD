'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MagnifyingGlass, Plus, Trash, BookOpen, Quotes, Scroll } from '@phosphor-icons/react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScriptureVerse {
  id: number
  reference: string
  version: string
  text: string
}

interface CCCParagraph {
  paragraph: number
  text: string | null
  summary: string | null
  section: string | null
}

interface ChurchFatherQuote {
  id: number
  author: string
  quote: string
  source: string
  year_approx: number | null
}

type ActiveTab = 'scripture' | 'ccc' | 'fathers'

// ── Shared UI ─────────────────────────────────────────────────────────────────

function SectionHeader({ icon, label, count }: { icon: React.ReactNode; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-muted-foreground">{icon}</span>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{label}</h2>
      <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{count}</span>
    </div>
  )
}

// ── Scripture tab ─────────────────────────────────────────────────────────────

function ScriptureTab() {
  const supabase = createClient()
  const [verses, setVerses] = useState<ScriptureVerse[]>([])
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ reference: '', version: 'NABRE', text: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('scripture_verses').select('*').order('reference')
    setVerses(data ?? [])
  }

  async function save() {
    if (!form.reference.trim() || !form.text.trim()) return
    setSaving(true)
    await supabase.from('scripture_verses').insert({ ...form })
    setForm({ reference: '', version: 'NABRE', text: '' })
    setAdding(false)
    setSaving(false)
    await load()
  }

  async function remove(id: number) {
    if (!confirm('Delete this verse? Topics referencing it will lose this entry.')) return
    await supabase.from('scripture_verses').delete().eq('id', id)
    setVerses(v => v.filter(x => x.id !== id))
  }

  const filtered = verses.filter(v =>
    !query || v.reference.toLowerCase().includes(query.toLowerCase()) || v.text.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div>
      <SectionHeader icon={<BookOpen size={16} weight="light" />} label="Scripture Verses" count={verses.length} />

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search by reference or text…"
            className="w-full rounded-xl bg-muted pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          onClick={() => setAdding(a => !a)}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          <Plus size={14} weight="bold" /> Add
        </button>
      </div>

      {adding && (
        <div className="mb-4 rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex gap-2">
            <input
              value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
              placeholder="Reference (e.g. John 1:1)"
              className="flex-1 rounded-xl bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <select
              value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))}
              className="rounded-xl bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {['NABRE', 'RSV-CE', 'DRB', 'NRSV'].map(v => <option key={v}>{v}</option>)}
            </select>
          </div>
          <textarea
            value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
            placeholder="Verse text…"
            rows={3}
            className="w-full rounded-xl bg-muted px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setAdding(false)} className="rounded-xl px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
            <button onClick={save} disabled={saving} className="rounded-xl bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(v => (
          <div key={v.id} className="flex gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary">{v.reference} <span className="font-normal text-muted-foreground text-xs">({v.version})</span></p>
              <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed italic truncate">&ldquo;{v.text}&rdquo;</p>
            </div>
            <button onClick={() => remove(v.id)} className="shrink-0 text-muted-foreground hover:text-red-500 transition-colors p-1">
              <Trash size={15} weight="light" />
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No verses found.</p>
        )}
      </div>
    </div>
  )
}

// ── CCC tab ───────────────────────────────────────────────────────────────────

function CCCTab() {
  const supabase = createClient()
  const [paragraphs, setParagraphs] = useState<CCCParagraph[]>([])
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ paragraph: '', summary: '', text: '', section: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('ccc_paragraphs').select('*').order('paragraph')
    setParagraphs(data ?? [])
  }

  async function save() {
    const num = parseInt(form.paragraph)
    if (!num) return
    setSaving(true)
    await supabase.from('ccc_paragraphs').upsert({ paragraph: num, summary: form.summary || null, text: form.text || null, section: form.section || null })
    setForm({ paragraph: '', summary: '', text: '', section: '' })
    setAdding(false)
    setSaving(false)
    await load()
  }

  const filtered = paragraphs.filter(p =>
    !query ||
    String(p.paragraph).includes(query) ||
    p.summary?.toLowerCase().includes(query.toLowerCase()) ||
    p.text?.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div>
      <SectionHeader icon={<Scroll size={16} weight="light" />} label="CCC Paragraphs" count={paragraphs.length} />

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search by paragraph number or text…"
            className="w-full rounded-xl bg-muted pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          onClick={() => setAdding(a => !a)}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          <Plus size={14} weight="bold" /> Add
        </button>
      </div>

      {adding && (
        <div className="mb-4 rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex gap-2">
            <input
              value={form.paragraph} onChange={e => setForm(f => ({ ...f, paragraph: e.target.value }))}
              placeholder="Paragraph number (e.g. 464)"
              type="number"
              className="w-40 rounded-xl bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))}
              placeholder="Section (e.g. Part 1 › Chapter 2)"
              className="flex-1 rounded-xl bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <input
            value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
            placeholder="One-line summary…"
            className="w-full rounded-xl bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <textarea
            value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
            placeholder="Full paragraph text…"
            rows={4}
            className="w-full rounded-xl bg-muted px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setAdding(false)} className="rounded-xl px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
            <button onClick={save} disabled={saving} className="rounded-xl bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(p => (
          <div key={p.paragraph} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-primary">CCC {p.paragraph}</p>
              {p.section && <p className="text-xs text-muted-foreground">{p.section}</p>}
            </div>
            {p.summary && <p className="text-sm text-foreground mt-1">{p.summary}</p>}
            {p.text && <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{p.text}</p>}
            {!p.summary && !p.text && <p className="text-xs text-muted-foreground mt-1 italic">No text stored yet.</p>}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No paragraphs found.</p>
        )}
      </div>
    </div>
  )
}

// ── Church Fathers tab ────────────────────────────────────────────────────────

function FathersTab() {
  const supabase = createClient()
  const [quotes, setQuotes] = useState<ChurchFatherQuote[]>([])
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ author: '', quote: '', source: '', year_approx: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('church_father_quotes').select('*').order('author')
    setQuotes(data ?? [])
  }

  async function save() {
    if (!form.author.trim() || !form.quote.trim() || !form.source.trim()) return
    setSaving(true)
    await supabase.from('church_father_quotes').insert({
      author: form.author, quote: form.quote, source: form.source,
      year_approx: form.year_approx ? parseInt(form.year_approx) : null,
    })
    setForm({ author: '', quote: '', source: '', year_approx: '' })
    setAdding(false)
    setSaving(false)
    await load()
  }

  async function remove(id: number) {
    if (!confirm('Delete this quote? Topics referencing it will lose this entry.')) return
    await supabase.from('church_father_quotes').delete().eq('id', id)
    setQuotes(q => q.filter(x => x.id !== id))
  }

  const filtered = quotes.filter(q =>
    !query ||
    q.author.toLowerCase().includes(query.toLowerCase()) ||
    q.quote.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div>
      <SectionHeader icon={<Quotes size={16} weight="light" />} label="Church Father Quotes" count={quotes.length} />

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search by author or quote…"
            className="w-full rounded-xl bg-muted pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          onClick={() => setAdding(a => !a)}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          <Plus size={14} weight="bold" /> Add
        </button>
      </div>

      {adding && (
        <div className="mb-4 rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex gap-2">
            <input
              value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))}
              placeholder="Author (e.g. St. Athanasius of Alexandria)"
              className="flex-1 rounded-xl bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              value={form.year_approx} onChange={e => setForm(f => ({ ...f, year_approx: e.target.value }))}
              placeholder="Year (e.g. 318)"
              type="number"
              className="w-28 rounded-xl bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <textarea
            value={form.quote} onChange={e => setForm(f => ({ ...f, quote: e.target.value }))}
            placeholder="Quote text…"
            rows={3}
            className="w-full rounded-xl bg-muted px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
            placeholder="Source (e.g. On the Incarnation, 54, c. AD 318)"
            className="w-full rounded-xl bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setAdding(false)} className="rounded-xl px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
            <button onClick={save} disabled={saving} className="rounded-xl bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(q => (
          <div key={q.id} className="flex gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{q.author}
                {q.year_approx && <span className="font-normal text-muted-foreground ml-1 text-xs">(c. {q.year_approx} AD)</span>}
              </p>
              <p className="text-sm text-muted-foreground mt-1 italic leading-relaxed">&ldquo;{q.quote}&rdquo;</p>
              <p className="text-xs text-muted-foreground mt-1">— {q.source}</p>
            </div>
            <button onClick={() => remove(q.id)} className="shrink-0 text-muted-foreground hover:text-red-500 transition-colors p-1">
              <Trash size={15} weight="light" />
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No quotes found.</p>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReferencesPage() {
  const [tab, setTab] = useState<ActiveTab>('scripture')

  const tabs: { id: ActiveTab; label: string }[] = [
    { id: 'scripture', label: 'Scripture' },
    { id: 'ccc', label: 'CCC' },
    { id: 'fathers', label: 'Church Fathers' },
  ]

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-xl font-bold text-foreground mb-1">Reference Library</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Shared scripture verses, CCC paragraphs, and patristic quotes — stored once, reused across all topics.
      </p>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-border mb-6">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'scripture' && <ScriptureTab />}
      {tab === 'ccc'       && <CCCTab />}
      {tab === 'fathers'   && <FathersTab />}
    </div>
  )
}
