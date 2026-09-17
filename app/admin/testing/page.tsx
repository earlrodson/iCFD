'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { MagnifyingGlass, Spinner, Check, X, Certificate, Trash, Flask } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { QUIZ_TIERS, TIER_LABELS, type QuizTier } from '@/lib/content/quizTiers'
import { cn } from '@/lib/utils'

interface UserOption {
  id: string
  email: string
}

interface PathOption {
  slug: string
  title: string
}

interface TopicOption {
  id: string
  title: string
}

interface ProgressRow {
  topic_id: string
  tier: QuizTier
  passed_at: string
}

interface CertificateRow {
  id: string
  path_slug: string
  tier: QuizTier
  serial_code: string
  issued_at: string
}

// QA tool: fabricates course_progress rows (and, transitively, certificate
// issuance) for a chosen user without them taking real quizzes — lets
// testers exercise "what happens once every topic in a path is done" on
// demand. Never touches quiz_attempts.
export default function TestingToolPage() {
  const [users, setUsers] = useState<UserOption[]>([])
  const [userQuery, setUserQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null)

  const [paths, setPaths] = useState<PathOption[]>([])
  const [pathTopics, setPathTopics] = useState<Record<string, TopicOption[]>>({})
  const [selectedPath, setSelectedPath] = useState<PathOption | null>(null)
  const [selectedTier, setSelectedTier] = useState<QuizTier>('beginner')

  const [progress, setProgress] = useState<ProgressRow[]>([])
  const [certificates, setCertificates] = useState<CertificateRow[]>([])
  const [loadingProgress, setLoadingProgress] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [togglingTopic, setTogglingTopic] = useState<string | null>(null)
  const [bulkBusy, setBulkBusy] = useState<'mark' | 'clear' | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    ;(supabase as unknown as { rpc: (fn: string) => Promise<{ data: UserOption[] | null }> })
      .rpc('get_all_users').then(({ data }) => setUsers(data ?? []))
    supabase.from('paths').select('slug, title').is('deleted_at', null).order('title')
      .then(({ data }) => setPaths((data ?? []) as PathOption[]))
    Promise.all([
      supabase.from('path_topics').select('path_slug, topic_id').order('position'),
      supabase.from('topics').select('id, title').eq('lang', 'en'),
    ]).then(([{ data: ptRows }, { data: topicRows }]) => {
      const titleById = new Map((topicRows ?? []).map((t: { id: string; title: string }) => [t.id, t.title]))
      const map: Record<string, TopicOption[]> = {}
      for (const row of (ptRows ?? []) as { path_slug: string; topic_id: string }[]) {
        const title = titleById.get(row.topic_id) ?? row.topic_id
        map[row.path_slug] = [...(map[row.path_slug] ?? []), { id: row.topic_id, title }]
      }
      setPathTopics(map)
    })
  }, [])

  const loadProgress = useCallback(async (userId: string) => {
    setLoadingProgress(true); setError('')
    try {
      const res = await fetch(`/api/admin/progress?user_id=${encodeURIComponent(userId)}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to load'); return }
      setProgress(data.progress); setCertificates(data.certificates)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setLoadingProgress(false)
    }
  }, [])

  function selectUser(u: UserOption) {
    setSelectedUser(u)
    setUserQuery('')
    setNotice('')
    loadProgress(u.id)
  }

  const filteredUsers = useMemo(() => {
    if (!userQuery.trim()) return []
    const q = userQuery.toLowerCase()
    return users.filter((u) => u.email?.toLowerCase().includes(q)).slice(0, 20)
  }, [users, userQuery])

  const topics = selectedPath ? pathTopics[selectedPath.slug] ?? [] : []
  const passedSet = useMemo(
    () => new Set(progress.filter((p) => p.tier === selectedTier).map((p) => p.topic_id)),
    [progress, selectedTier],
  )

  async function toggleTopic(topicId: string, passed: boolean) {
    if (!selectedUser) return
    setTogglingTopic(topicId); setError(''); setNotice('')
    const res = await fetch('/api/admin/progress', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: selectedUser.id, topic_id: topicId, tier: selectedTier, passed }),
    })
    const data = await res.json()
    setTogglingTopic(null)
    if (!res.ok) { setError(data.error ?? 'Failed to update'); return }
    if (data.certificateIssued) setNotice(`Certificate issued for: ${data.issuedPaths.join(', ')}`)
    await loadProgress(selectedUser.id)
  }

  async function bulkAction(passed: boolean) {
    if (!selectedUser || !selectedPath) return
    setBulkBusy(passed ? 'mark' : 'clear'); setError(''); setNotice('')
    const res = await fetch('/api/admin/progress/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: selectedUser.id, path_slug: selectedPath.slug, tier: selectedTier, passed }),
    })
    const data = await res.json()
    setBulkBusy(null)
    if (!res.ok) { setError(data.error ?? 'Failed to update'); return }
    if (data.certificateIssued) setNotice(`Certificate issued for "${selectedPath.title}"`)
    else if (!passed) setNotice('Progress and any certificate for this path/tier cleared.')
    await loadProgress(selectedUser.id)
  }

  async function revokeCertificate(id: string) {
    if (!selectedUser) return
    setRevokingId(id); setError('')
    const res = await fetch(`/api/admin/progress?id=${id}`, { method: 'DELETE' })
    const data = await res.json()
    setRevokingId(null)
    if (!res.ok) { setError(data.error ?? 'Failed to revoke'); return }
    await loadProgress(selectedUser.id)
  }

  return (
    <div>
      <div className="sticky top-[57px] z-30 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
          <Flask weight="light" size={20} className="text-muted-foreground shrink-0" />
          <h1 className="text-base font-bold text-foreground shrink-0">Testing Tools</h1>
          {selectedUser && <span className="truncate text-sm text-muted-foreground">— {selectedUser.email}</span>}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-6 space-y-4">
        <p className="text-xs text-muted-foreground">
          Fabricate a user&apos;s quiz-completion state for QA — mark topics passed at a tier and see certificate
          issuance fire, without grinding through real quiz attempts. Never affects quiz_attempts history.
        </p>

        {/* User picker */}
        <div className="relative">
          <MagnifyingGlass weight="light" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder="Search a user by email…"
            className="field pl-9"
          />
          {filteredUsers.length > 0 && (
            <div className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
              {filteredUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => selectUser(u)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                >
                  <span className="truncate text-foreground">{u.email}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {!selectedUser && (
          <p className="py-12 text-center text-sm text-muted-foreground">Search for a user above to inspect or set their quiz progress.</p>
        )}

        {selectedUser && (
          <>
            {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">{error}</p>}
            {notice && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">{notice}</p>}

            {/* Path picker */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Path</label>
              <select
                value={selectedPath?.slug ?? ''}
                onChange={(e) => setSelectedPath(paths.find((p) => p.slug === e.target.value) ?? null)}
                className="field"
              >
                <option value="">Select a path…</option>
                {paths.map((p) => (
                  <option key={p.slug} value={p.slug}>{p.title}</option>
                ))}
              </select>
            </div>

            {selectedPath && (
              <>
                {/* Tier tabs */}
                <div className="flex gap-2">
                  {QUIZ_TIERS.map((tier) => (
                    <button
                      key={tier}
                      onClick={() => setSelectedTier(tier)}
                      className={cn(
                        'flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                        selectedTier === tier
                          ? 'border-primary bg-primary/8 text-primary'
                          : 'border-border text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {TIER_LABELS[tier]}
                    </button>
                  ))}
                </div>

                {/* Bulk actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => bulkAction(true)}
                    disabled={bulkBusy !== null}
                    className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {bulkBusy === 'mark' ? <Spinner weight="light" size={14} className="animate-spin" /> : <Check weight="bold" size={14} />}
                    Mark all topics passed
                  </button>
                  <button
                    onClick={() => bulkAction(false)}
                    disabled={bulkBusy !== null}
                    className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                  >
                    {bulkBusy === 'clear' ? <Spinner weight="light" size={14} className="animate-spin" /> : <X weight="light" size={14} />}
                    Clear path progress
                  </button>
                </div>

                {/* Per-topic toggles */}
                {loadingProgress ? (
                  <div className="flex justify-center py-8"><Spinner weight="light" size={24} className="animate-spin text-muted-foreground" /></div>
                ) : (
                  <div className="space-y-1.5">
                    {topics.map((t) => {
                      const isPassed = passedSet.has(t.id)
                      return (
                        <div key={t.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2">
                          <span className="truncate text-sm text-foreground">{t.title}</span>
                          <button
                            onClick={() => toggleTopic(t.id, !isPassed)}
                            disabled={togglingTopic === t.id}
                            className={cn(
                              'flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50',
                              isPassed
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                : 'bg-muted text-muted-foreground hover:text-foreground',
                            )}
                          >
                            {togglingTopic === t.id ? <Spinner weight="light" size={12} className="animate-spin" /> : isPassed ? <Check weight="bold" size={12} /> : null}
                            {isPassed ? 'Passed' : 'Not passed'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {/* Certificates earned */}
            <div className="pt-2">
              <p className="mb-2 text-sm font-semibold text-foreground">Certificates</p>
              {certificates.length === 0 ? (
                <p className="text-sm text-muted-foreground">None issued yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {certificates.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Certificate weight="fill" size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
                        <span className="truncate text-sm text-foreground">
                          {paths.find((p) => p.slug === c.path_slug)?.title ?? c.path_slug} — {TIER_LABELS[c.tier]}
                        </span>
                      </div>
                      <button
                        onClick={() => revokeCertificate(c.id)}
                        disabled={revokingId === c.id}
                        className="icon-btn hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 shrink-0"
                        title="Revoke (for re-testing issuance)"
                      >
                        {revokingId === c.id ? <Spinner weight="light" size={14} className="animate-spin" /> : <Trash weight="light" size={14} />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
