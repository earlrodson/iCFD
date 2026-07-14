'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/useAuthStore'
import {
  listUsers, setUserRole, adminListTopics, adminUpsertTopic, adminDeleteTopic,
  type AdminUser, type TopicFormData,
} from '@/lib/supabase/admin'
import type { Role } from '@/drizzle/schema'
import {
  ArrowLeft, Users, BookOpen, Crown, MagnifyingGlass,
  PencilSimple, Trash, Plus, Check, X, Warning, CircleNotch,
} from '@phosphor-icons/react'

type AdminTab = 'users' | 'content' | 'paths'

const ROLE_OPTIONS: Role[] = ['user', 'editor', 'admin']
const CATEGORIES = ['sacraments', 'mary', 'papacy', 'salvation', 'bible', 'saints', 'tradition', 'church-teaching']
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced']
const LANGS = ['en', 'tl', 'ceb']

// ── Users Tab ──────────────────────────────────────────────────────────────────

function UsersTab({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await listUsers()
    if (error) setError(error)
    else setUsers(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleRoleChange = async (userId: string, newRole: Role) => {
    setUpdating(userId)
    const { error } = await setUserRole(userId, newRole)
    if (error) setError(error)
    else setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role: newRole } : u))
    setUpdating(null)
  }

  const filtered = users.filter(u =>
    !search || u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.display_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="relative">
        <MagnifyingGlass weight="light" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-[13px] p-3 bg-destructive/10 rounded-xl">
          <Warning weight="light" className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <CircleNotch weight="light" className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-2xl bg-card overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.07),0_0_1px_rgba(0,0,0,0.04)] divide-y divide-border">
          {filtered.map(user => (
            <div key={user.user_id} className="flex items-center gap-3 px-4 py-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-[13px] font-semibold text-primary">
                  {(user.display_name ?? user.email ?? '?')[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium truncate">{user.display_name ?? '—'}</p>
                <p className="text-[12px] text-muted-foreground truncate">{user.email}</p>
              </div>
              {user.user_id === currentUserId ? (
                <Badge className="text-[11px] shrink-0">You</Badge>
              ) : (
                <div className="flex gap-1 shrink-0">
                  {ROLE_OPTIONS.map(r => (
                    <button
                      key={r}
                      onClick={() => handleRoleChange(user.user_id, r)}
                      disabled={updating === user.user_id}
                      className={`px-2 py-1 rounded-lg text-[11px] font-medium capitalize transition-all ${
                        user.role === r
                          ? r === 'admin' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : r === 'editor' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-muted text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {updating === user.user_id && user.role !== r ? (
                        <CircleNotch weight="light" className="h-3 w-3 animate-spin" />
                      ) : r}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-10 text-center text-[13px] text-muted-foreground">No users found</div>
          )}
        </div>
      )}

      <p className="text-[12px] text-muted-foreground text-center">{filtered.length} user{filtered.length !== 1 ? 's' : ''}</p>
    </div>
  )
}

// ── Topic Form ─────────────────────────────────────────────────────────────────

const EMPTY_TOPIC: TopicFormData = {
  id: '', lang: 'en', category: 'bible', title: '', question: '', answer: '', tags: '', difficulty: 'beginner'
}

function TopicForm({ initial, onSave, onCancel }: {
  initial: TopicFormData
  onSave: (d: TopicFormData) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof TopicFormData, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.id || !form.title || !form.question || !form.answer) {
      setError('ID, title, question, and answer are required.')
      return
    }
    setSaving(true)
    setError('')
    await onSave(form)
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-muted/30 border border-border p-4">
      {error && <p className="text-[13px] text-destructive">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[12px] font-medium text-muted-foreground block mb-1">Topic ID *</label>
          <Input value={form.id} onChange={e => set('id', e.target.value)} placeholder="baptism-meaning" required />
        </div>
        <div>
          <label className="text-[12px] font-medium text-muted-foreground block mb-1">Language</label>
          <select value={form.lang} onChange={e => set('lang', e.target.value)}
            className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm">
            {LANGS.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[12px] font-medium text-muted-foreground block mb-1">Category</label>
          <select value={form.category} onChange={e => set('category', e.target.value)}
            className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm capitalize">
            {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('-', ' ')}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[12px] font-medium text-muted-foreground block mb-1">Difficulty</label>
          <select value={form.difficulty} onChange={e => set('difficulty', e.target.value)}
            className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm capitalize">
            {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="text-[12px] font-medium text-muted-foreground block mb-1">Title *</label>
        <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="What is Baptism?" required />
      </div>

      <div>
        <label className="text-[12px] font-medium text-muted-foreground block mb-1">Question *</label>
        <textarea
          value={form.question}
          onChange={e => set('question', e.target.value)}
          placeholder="The apologetics question this topic answers…"
          rows={2}
          className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-primary"
          required
        />
      </div>

      <div>
        <label className="text-[12px] font-medium text-muted-foreground block mb-1">Answer *</label>
        <textarea
          value={form.answer}
          onChange={e => set('answer', e.target.value)}
          placeholder="The full apologetics answer…"
          rows={5}
          className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-primary"
          required
        />
      </div>

      <div>
        <label className="text-[12px] font-medium text-muted-foreground block mb-1">Tags (comma-separated)</label>
        <Input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="baptism, sacrament, water" />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <X weight="light" className="h-4 w-4 mr-1" /> Cancel
        </Button>
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? <CircleNotch weight="light" className="h-4 w-4 mr-1 animate-spin" /> : <Check weight="light" className="h-4 w-4 mr-1" />}
          {saving ? 'Saving…' : 'Save topic'}
        </Button>
      </div>
    </form>
  )
}

// ── Content Tab ────────────────────────────────────────────────────────────────

function ContentTab() {
  const [topics, setTopics] = useState<{ id: string; lang: string; category: string; title: string; difficulty: string }[]>([])
  const [lang, setLang] = useState('en')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<TopicFormData | null>(null)
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  const PAGE_SIZE = 20

  const load = useCallback(async () => {
    setLoading(true)
    const { data, count, error } = await adminListTopics(lang, page, PAGE_SIZE)
    if (error) setError(error)
    else { setTopics(data); setTotal(count) }
    setLoading(false)
  }, [lang, page])

  useEffect(() => { load() }, [load])

  const handleSave = async (data: TopicFormData) => {
    const { error } = await adminUpsertTopic(data)
    if (error) { setError(error); return }
    setEditing(null)
    setCreating(false)
    load()
  }

  const handleDelete = async (id: string, topicLang: string) => {
    if (!confirm(`Delete topic "${id}" (${topicLang})?`)) return
    setDeleting(`${id}-${topicLang}`)
    const { error } = await adminDeleteTopic(id, topicLang)
    if (error) setError(error)
    else load()
    setDeleting(null)
  }

  const filtered = topics.filter(t =>
    !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MagnifyingGlass weight="light" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search topics…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select value={lang} onChange={e => { setLang(e.target.value); setPage(0) }}
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm">
          {LANGS.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
        </select>
        <Button size="sm" onClick={() => { setCreating(true); setEditing(null) }}>
          <Plus weight="bold" className="h-4 w-4 mr-1" /> New
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-[13px] p-3 bg-destructive/10 rounded-xl">
          <Warning weight="light" className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {creating && (
        <TopicForm
          initial={EMPTY_TOPIC}
          onSave={handleSave}
          onCancel={() => setCreating(false)}
        />
      )}

      {editing && (
        <TopicForm
          initial={editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <CircleNotch weight="light" className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-2xl bg-card overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.07),0_0_1px_rgba(0,0,0,0.04)] divide-y divide-border">
          {filtered.map(topic => (
            <div key={`${topic.id}-${topic.lang}`} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium truncate">{topic.title}</p>
                <p className="text-[12px] text-muted-foreground capitalize">
                  {topic.category.replace('-', ' ')} · {topic.difficulty} · {topic.id}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setEditing({
                      id: topic.id, lang: topic.lang, category: topic.category,
                      title: topic.title, question: '', answer: '', tags: '', difficulty: topic.difficulty
                    })
                    setCreating(false)
                  }}
                >
                  <PencilSimple weight="light" className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(topic.id, topic.lang)}
                  disabled={deleting === `${topic.id}-${topic.lang}`}
                >
                  {deleting === `${topic.id}-${topic.lang}`
                    ? <CircleNotch weight="light" className="h-3.5 w-3.5 animate-spin" />
                    : <Trash weight="light" className="h-3.5 w-3.5" />
                  }
                </Button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && !loading && (
            <div className="py-10 text-center text-[13px] text-muted-foreground">No topics found</div>
          )}
        </div>
      )}

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-[13px] text-muted-foreground">
          <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span>Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}</span>
          <Button variant="ghost" size="sm" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  )
}

// ── Paths Tab ──────────────────────────────────────────────────────────────────

function PathsTab() {
  return (
    <div className="rounded-2xl bg-card p-8 text-center shadow-sm">
      <BookOpen weight="light" className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
      <p className="text-[15px] font-medium mb-1">Path Management</p>
      <p className="text-[13px] text-muted-foreground mb-4">
        Paths are currently managed via JSON. Full CRUD coming soon.
      </p>
      <Button asChild variant="outline" size="sm">
        <Link href="/paths">View Paths</Link>
      </Button>
    </div>
  )
}

// ── Admin Page ─────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter()
  const { user, role, loading } = useAuthStore()
  const [tab, setTab] = useState<AdminTab>('users')

  useEffect(() => {
    if (!loading && !user) router.replace('/login?next=/admin')
    if (!loading && user && role && role !== 'admin') router.replace('/profile')
  }, [user, role, loading, router])

  if (loading || !user || !role) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CircleNotch weight="light" className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (role !== 'admin') return null

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'users',   label: 'Users',   icon: <Users weight="light" className="h-4 w-4" /> },
    { id: 'content', label: 'Content', icon: <BookOpen weight="light" className="h-4 w-4" /> },
    { id: 'paths',   label: 'Paths',   icon: <Crown weight="light" className="h-4 w-4" /> },
  ]

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Nav */}
      <header className="bg-background/80 backdrop-blur-xl sticky top-0 z-30 border-b border-border/60">
        <div className="container mx-auto px-4 max-w-3xl flex items-center h-12 gap-3">
          <Button variant="ghost" size="icon" asChild className="-ml-2">
            <Link href="/profile"><ArrowLeft weight="light" className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-[17px] font-semibold flex-1">Admin Panel</h1>
          <Badge className="text-[11px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Admin</Badge>
        </div>
        {/* Tab bar */}
        <div className="container mx-auto px-4 max-w-3xl flex border-t border-border/40">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 ${
                tab === t.id ? 'text-primary border-primary' : 'text-muted-foreground border-transparent'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="container mx-auto px-4 max-w-3xl py-5">
        {tab === 'users'   && <UsersTab currentUserId={user.id} />}
        {tab === 'content' && <ContentTab />}
        {tab === 'paths'   && <PathsTab />}
      </main>
    </div>
  )
}
