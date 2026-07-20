'use client'

import { useEffect, useState, useMemo } from 'react'
import { ArrowClockwise, ChartBar, Users, BookOpen, MagnifyingGlass } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface TopicStat {
  topic_id: string
  title: string
  lang: string
  category: string
  view_count: number
  reader_count: number
}

interface UserStat {
  user_id: string
  email: string
  topic_views: number
  topics_read: number
  last_active: string | null
}

const CATEGORY_COLORS: Record<string, string> = {
  'bible':          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'church-teaching':'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'mary':           'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  'tradition':      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  'saints':         'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  'papacy':         'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  'sacraments':     'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  'salvation':      'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
}

export default function AnalyticsPage() {
  const [tab, setTab]                 = useState<'topics' | 'users'>('topics')
  const [topics, setTopics]           = useState<TopicStat[]>([])
  const [users, setUsers]             = useState<UserStat[]>([])
  const [loading, setLoading]         = useState(true)
  const [filterUser, setFilterUser]   = useState<string>('')  // uuid or ''
  const [filterLang, setFilterLang]   = useState<string>('')
  const [filterCat, setFilterCat]     = useState<string>('')
  const [search, setSearch]           = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const db = createClient() as any // eslint-disable-line @typescript-eslint/no-explicit-any
    const [t, u] = await Promise.all([
      db.rpc('get_topic_analytics', {}),
      db.rpc('get_user_activity_summary'),
    ])
    if (t.data) setTopics(t.data as TopicStat[])
    if (u.data) setUsers(u.data as UserStat[])
    setLoading(false)
  }

  async function loadTopicsForUser(userId: string) {
    setLoading(true)
    const db = createClient() as any // eslint-disable-line @typescript-eslint/no-explicit-any
    const { data } = await db.rpc('get_topic_analytics', { filter_user_id: userId || null })
    if (data) setTopics(data as TopicStat[])
    setLoading(false)
  }

  function handleUserFilter(uid: string) {
    setFilterUser(uid)
    if (uid) {
      loadTopicsForUser(uid)
    } else {
      loadAll()
    }
  }

  const filteredTopics = useMemo(() => {
    const q = search.toLowerCase()
    return topics.filter((t) => {
      if (filterLang && t.lang !== filterLang) return false
      if (filterCat && t.category !== filterCat) return false
      if (q && !t.title.toLowerCase().includes(q)) return false
      return true
    })
  }, [topics, filterLang, filterCat, search])

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase()
    return users.filter((u) => !q || u.email.toLowerCase().includes(q))
  }, [users, search])

  const totalViews   = topics.reduce((s, t) => s + t.view_count, 0)
  const uniqueReaders = users.filter((u) => u.topic_views > 0).length
  const maxViews     = Math.max(...filteredTopics.map((t) => t.view_count), 1)

  const categories = [...new Set(topics.map((t) => t.category))].sort()
  const langs      = [...new Set(topics.map((t) => t.lang))].sort()

  return (
    <div className="pb-24">
      <div className="mx-auto max-w-3xl px-4 pt-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Analytics</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalViews.toLocaleString()} total views · {uniqueReaders} active readers
            </p>
          </div>
          <button
            onClick={loadAll}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Refresh"
          >
            <ArrowClockwise weight="light" size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: ChartBar, label: 'Total views',   value: totalViews.toLocaleString() },
            { icon: BookOpen, label: 'Topics tracked', value: topics.length.toLocaleString() },
            { icon: Users,    label: 'Active readers', value: uniqueReaders.toLocaleString() },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-3 text-center">
              <Icon weight="light" size={18} className="text-muted-foreground mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground leading-none">{value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border gap-4">
          {(['topics', 'users'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'pb-2 text-sm font-medium border-b-2 -mb-px capitalize transition-colors',
                tab === t
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t === 'topics' ? 'Topics' : 'Users'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <MagnifyingGlass weight="light" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === 'topics' ? 'Search topics…' : 'Search users…'}
              className="w-full rounded-xl border border-border bg-card pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {tab === 'topics' && (
            <>
              {/* Filter by user */}
              <select
                value={filterUser}
                onChange={(e) => handleUserFilter(e.target.value)}
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All users</option>
                {users.map((u) => (
                  <option key={u.user_id} value={u.user_id}>{u.email}</option>
                ))}
              </select>

              {langs.length > 1 && (
                <select
                  value={filterLang}
                  onChange={(e) => setFilterLang(e.target.value)}
                  className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All langs</option>
                  {langs.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              )}

              <select
                value={filterCat}
                onChange={(e) => setFilterCat(e.target.value)}
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c.replace('-', ' ')}</option>
                ))}
              </select>
            </>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : tab === 'topics' ? (

          /* ── Topic ranking ── */
          <div className="space-y-2">
            {filteredTopics.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card py-12 text-center">
                <p className="text-sm text-muted-foreground">No topic views recorded yet.</p>
              </div>
            ) : filteredTopics.map((t, i) => (
              <div key={`${t.topic_id}-${t.lang}`} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
                {/* Rank */}
                <span className="w-6 shrink-0 text-right text-xs font-semibold text-muted-foreground">
                  {i + 1}
                </span>

                {/* Bar + label */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                    <span className={cn(
                      'shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase',
                      CATEGORY_COLORS[t.category] ?? 'bg-muted text-muted-foreground',
                    )}>
                      {t.category.replace('-', ' ')}
                    </span>
                    <span className="shrink-0 rounded-full bg-muted text-muted-foreground px-1.5 py-0.5 text-[9px] font-medium uppercase">
                      {t.lang}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(t.view_count / maxViews) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-foreground">{t.view_count.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {t.reader_count} {t.reader_count === 1 ? 'reader' : 'readers'}
                  </p>
                </div>
              </div>
            ))}
          </div>

        ) : (

          /* ── User activity ── */
          <div className="space-y-2">
            {filteredUsers.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card py-12 text-center">
                <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
              </div>
            ) : filteredUsers.map((u) => (
              <div key={u.user_id} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{u.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Last active{' '}
                    {u.last_active
                      ? new Date(u.last_active).toLocaleDateString()
                      : 'never'}
                  </p>
                </div>
                <div className="shrink-0 text-right space-y-0.5">
                  <p className="text-sm font-bold text-foreground">{u.topic_views.toLocaleString()} views</p>
                  <p className="text-[10px] text-muted-foreground">{u.topics_read} completed</p>
                </div>
                <button
                  onClick={() => { setTab('topics'); handleUserFilter(u.user_id) }}
                  className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  View topics
                </button>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
