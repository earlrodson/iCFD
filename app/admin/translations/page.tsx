'use client'

import { useEffect, useState, useCallback } from 'react'
import { ArrowClockwise, Translate, CheckCircle, Warning, Robot, User } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'

type Lang = 'tl' | 'ceb'
type Source = 'manual' | 'machine' | 'stub' | 'missing'

interface TopicStatus {
  id: string
  title: string
  category: string
  tl: Source
  ceb: Source
}

type TranslateStatus = 'idle' | 'translating' | 'done' | 'error'

interface CellState {
  status: TranslateStatus
  error?: string
}

const SOURCE_BADGE: Record<Source, { label: string; className: string; icon: React.ReactNode }> = {
  manual:  { label: 'Manual',  className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: <User weight="fill" size={10} /> },
  machine: { label: 'Machine', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',           icon: <Robot weight="fill" size={10} /> },
  stub:    { label: 'Stub',    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',        icon: <Warning weight="fill" size={10} /> },
  missing: { label: 'Missing', className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',           icon: <Warning weight="fill" size={10} /> },
}

export default function TranslationsPage() {
  const [topics, setTopics] = useState<TopicStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [cells, setCells] = useState<Record<string, CellState>>({})
  const [filterLang, setFilterLang] = useState<Lang | 'all'>('all')
  const [filterSource, setFilterSource] = useState<Source | 'all'>('all')
  const [bulkRunning, setBulkRunning] = useState(false)
  const [bulkMsg, setBulkMsg] = useState('')

  const cellKey = (id: string, lang: Lang) => `${id}:${lang}`

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const { data: enRows } = await supabase
      .from('topics')
      .select('id, title, category')
      .eq('lang', 'en')
      .order('title')

    const { data: otherRows } = await supabase
      .from('topics')
      .select('id, lang, translation_source')
      .in('lang', ['tl', 'ceb'])

    const sourceMap: Record<string, Source> = {}
    for (const r of otherRows ?? []) {
      const src = r.translation_source as string
      sourceMap[`${r.id}:${r.lang}`] =
        src === 'manual' ? 'manual' : src === 'machine' ? 'machine' : 'stub'
    }

    const statuses: TopicStatus[] = (enRows ?? []).map((en) => ({
      id: en.id,
      title: en.title,
      category: en.category,
      tl:  sourceMap[`${en.id}:tl`]  ?? 'missing',
      ceb: sourceMap[`${en.id}:ceb`] ?? 'missing',
    }))

    setTopics(statuses)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function retranslate(topicId: string, lang: Lang) {
    const key = cellKey(topicId, lang)
    setCells((p) => ({ ...p, [key]: { status: 'translating' } }))

    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId, lang }),
    })

    if (res.ok) {
      setCells((p) => ({ ...p, [key]: { status: 'done' } }))
      setTopics((prev) => prev.map((t) =>
        t.id === topicId ? { ...t, [lang]: 'machine' as Source } : t
      ))
      setTimeout(() => setCells((p) => ({ ...p, [key]: { status: 'idle' } })), 3000)
    } else {
      const { error } = await res.json() as { error: string }
      setCells((p) => ({ ...p, [key]: { status: 'error', error } }))
    }
  }

  async function translateAllStubs() {
    const stubs = topics.flatMap((t) => {
      const pairs: Array<{ id: string; lang: Lang }> = []
      if (t.tl === 'stub' || t.tl === 'missing') pairs.push({ id: t.id, lang: 'tl' })
      if (t.ceb === 'stub' || t.ceb === 'missing') pairs.push({ id: t.id, lang: 'ceb' })
      return pairs
    })

    if (stubs.length === 0) { setBulkMsg('No stubs to translate.'); return }

    setBulkRunning(true)
    setBulkMsg(`Translating ${stubs.length} topics…`)
    let done = 0, errors = 0

    for (const { id, lang } of stubs) {
      const key = cellKey(id, lang)
      setCells((p) => ({ ...p, [key]: { status: 'translating' } }))
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId: id, lang }),
      })
      if (res.ok) {
        done++
        setCells((p) => ({ ...p, [key]: { status: 'done' } }))
        setTopics((prev) => prev.map((t) =>
          t.id === id ? { ...t, [lang]: 'machine' as Source } : t
        ))
      } else {
        errors++
        const { error } = await res.json() as { error: string }
        setCells((p) => ({ ...p, [key]: { status: 'error', error } }))
      }
      setBulkMsg(`Translating… ${done + errors} / ${stubs.length}`)
    }

    setBulkRunning(false)
    setBulkMsg(`Done — ${done} translated, ${errors} errors`)
    load()
  }

  const filtered = topics.filter((t) => {
    if (filterSource !== 'all') {
      if (filterLang === 'tl'  && t.tl  !== filterSource) return false
      if (filterLang === 'ceb' && t.ceb !== filterSource) return false
      if (filterLang === 'all' && t.tl !== filterSource && t.ceb !== filterSource) return false
    }
    return true
  })

  const NEEDS_TRANSLATION: Source[] = ['stub', 'missing']
  const stubCount = topics.reduce((n, t) =>
    n + (NEEDS_TRANSLATION.includes(t.tl) ? 1 : 0) + (NEEDS_TRANSLATION.includes(t.ceb) ? 1 : 0), 0)

  return (
    <div className="pb-24">
      <div className="mx-auto max-w-4xl px-4 pt-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Translate weight="light" size={22} />
              Translation Status
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {topics.length} EN topics — {stubCount} TL/CEB stubs/missing
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Reload"
            >
              <ArrowClockwise weight="light" size={16} />
            </button>
            <button
              onClick={translateAllStubs}
              disabled={bulkRunning || stubCount === 0}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Robot weight="fill" size={15} />
              {bulkRunning ? 'Translating…' : `Translate All Stubs (${stubCount})`}
            </button>
          </div>
        </div>

        {bulkMsg && (
          <p className="rounded-xl bg-muted px-4 py-2 text-sm text-muted-foreground">{bulkMsg}</p>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs">
          {Object.entries(SOURCE_BADGE).map(([src, cfg]) => (
            <span key={src} className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${cfg.className}`}>
              {cfg.icon} {cfg.label}
            </span>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'tl', 'ceb'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setFilterLang(l)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filterLang === l
                  ? 'bg-primary text-white'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {l === 'all' ? 'All Languages' : l.toUpperCase()}
            </button>
          ))}
          <div className="w-px bg-border mx-1" />
          {(['all', 'stub', 'missing', 'machine', 'manual'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterSource(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors capitalize ${
                filterSource === s
                  ? 'bg-primary text-white'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {s === 'all' ? 'All Status' : s}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Topic</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground w-32">TL</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground w-32">CEB</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground text-sm">{t.title}</p>
                      <p className="text-xs text-muted-foreground font-mono">{t.id}</p>
                    </td>
                    {(['tl', 'ceb'] as Lang[]).map((lang) => {
                      const src = t[lang]
                      const key = cellKey(t.id, lang)
                      const cell = cells[key]
                      const canRetranslate = src !== 'manual'

                      return (
                        <td key={lang} className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            {cell?.status === 'translating' ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            ) : cell?.status === 'done' ? (
                              <CheckCircle weight="fill" size={18} className="text-emerald-500" />
                            ) : (
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${SOURCE_BADGE[src].className}`}>
                                {SOURCE_BADGE[src].icon}
                                {SOURCE_BADGE[src].label}
                              </span>
                            )}
                            {canRetranslate && cell?.status !== 'translating' && (
                              <button
                                onClick={() => retranslate(t.id, lang)}
                                className="text-[10px] text-primary hover:underline"
                              >
                                {src === 'machine' ? 'Re-translate' : 'Translate'}
                              </button>
                            )}
                            {cell?.status === 'error' && (
                              <p className="text-[10px] text-rose-600 max-w-[100px] text-center">{cell.error?.slice(0, 60)}</p>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No topics match the current filter.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
