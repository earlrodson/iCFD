'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, MagnifyingGlass, PencilSimple, Trash, ArrowClockwise, Warning } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface TopicRow {
  id: string
  lang: 'en' | 'tl' | 'ceb'
  category: string
  title: string
  difficulty: string
  last_updated: string
  tags: string[]
}

const CATEGORIES = ['sacraments', 'mary', 'papacy', 'salvation', 'bible', 'saints', 'tradition', 'church-teaching']
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced']
const LANGS = ['en', 'tl', 'ceb']

const CATEGORY_COLORS: Record<string, string> = {
  sacraments: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  mary: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  papacy: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  salvation: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  bible: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  saints: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  tradition: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  'church-teaching': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
}

const DIFF_COLORS: Record<string, string> = {
  beginner: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  intermediate: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  advanced: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

export default function AdminTopicsPage() {
  const [topics, setTopics]       = useState<TopicRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterLang, setFilterLang]       = useState('en')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState('')
  const [deleteTarget, setDeleteTarget]   = useState<TopicRow | null>(null)
  const [deleting, setDeleting]           = useState(false)
  const [deleteError, setDeleteError]     = useState('')

  useEffect(() => { loadTopics() }, [])

  async function loadTopics() {
    setLoading(true)
    const { data } = await createClient()
      .from('topics')
      .select('id, lang, category, title, difficulty, last_updated, tags')
      .order('title')
    setTopics((data ?? []) as TopicRow[])
    setLoading(false)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return topics.filter((t) => {
      if (filterLang && t.lang !== filterLang) return false
      if (filterCategory && t.category !== filterCategory) return false
      if (filterDifficulty && t.difficulty !== filterDifficulty) return false
      if (q && !t.title.toLowerCase().includes(q) && !t.id.toLowerCase().includes(q)) return false
      return true
    })
  }, [topics, search, filterLang, filterCategory, filterDifficulty])

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true); setDeleteError('')
    const { error } = await createClient()
      .from('topics')
      .delete()
      .eq('id', deleteTarget.id)
      .eq('lang', deleteTarget.lang)
    if (error) {
      setDeleteError(error.message)
      setDeleting(false)
    } else {
      setDeleteTarget(null)
      setDeleting(false)
      loadTopics()
    }
  }

  return (
    <div className="pb-24">
      <div className="mx-auto max-w-5xl px-4 pt-8">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Topics</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} of {topics.length} topics</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadTopics}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Refresh"
            >
              <ArrowClockwise weight="light" size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <Link
              href="/admin/topics/new"
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              <Plus weight="bold" size={15} />
              New Topic
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-5 flex flex-wrap gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <MagnifyingGlass weight="light" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search topics…"
              className="w-full rounded-xl border border-border bg-card pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {/* Lang tabs */}
          <div className="flex rounded-xl border border-border bg-card overflow-hidden">
            {LANGS.map((l) => (
              <button
                key={l}
                onClick={() => setFilterLang(l === filterLang ? '' : l)}
                className={cn(
                  'px-3 py-2 text-sm font-medium transition-colors uppercase',
                  filterLang === l ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {l}
              </button>
            ))}
          </div>
          {/* Category */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {/* Difficulty */}
          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All difficulties</option>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card py-16 text-center">
            <p className="text-sm text-muted-foreground">No topics match your filters.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Difficulty</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Updated</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((t) => (
                  <tr key={`${t.id}-${t.lang}`} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground line-clamp-1">{t.title}</div>
                      <div className="text-xs text-muted-foreground font-mono">{t.id} <span className="uppercase ml-1">[{t.lang}]</span></div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize', CATEGORY_COLORS[t.category] ?? 'bg-muted text-muted-foreground')}>
                        {t.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize', DIFF_COLORS[t.difficulty] ?? 'bg-muted text-muted-foreground')}>
                        {t.difficulty}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                      {t.last_updated ? new Date(t.last_updated).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/topics/${t.id}?lang=${t.lang}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          aria-label="Edit"
                        >
                          <PencilSimple weight="light" size={16} />
                        </Link>
                        <button
                          onClick={() => { setDeleteTarget(t); setDeleteError('') }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20 transition-colors"
                          aria-label="Delete"
                        >
                          <Trash weight="light" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-card border border-border p-6 shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <Warning weight="fill" size={22} className="text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground text-sm">Delete topic?</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <strong className="text-foreground">{deleteTarget.title}</strong> [{deleteTarget.lang.toUpperCase()}] will be permanently deleted. This cannot be undone.
                </p>
              </div>
            </div>
            {deleteError && (
              <p className="mb-3 text-xs text-rose-600">{deleteError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
