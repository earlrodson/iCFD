'use client'

import { useEffect, useMemo, useState } from 'react'
import { Users, Trash, Spinner, PencilSimple, FloppyDisk, X } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface Diocese { id: string; name: string }
interface Chapter { id: string; name: string; type: 'parish' | 'school'; diocese_id: string }
interface SeatLimit { level: 'national' | 'diocese' | 'chapter'; max_seats: number }
interface BoardMember {
  id: string
  level: 'national' | 'diocese' | 'chapter'
  diocese_id: string | null
  chapter_id: string | null
  user_id: string
  office: string | null
}
interface UserLite { id: string; email: string }

const LEVELS = [
  { value: 'national' as const, label: 'National', boardName: 'Board of Governors' },
  { value: 'diocese'  as const, label: 'Diocese',   boardName: 'Board of Stewards' },
  { value: 'chapter'  as const, label: 'Chapter',   boardName: 'Board of Trustees' },
]

const OFFICES = [
  'spiritual_adviser', 'theological_adviser', 'adviser', 'president',
  'internal_vice_president', 'external_vice_president', 'secretary',
  'treasurer', 'auditor', 'pio',
] as const

const OFFICE_LABELS: Record<string, string> = {
  spiritual_adviser: 'Spiritual Adviser',
  theological_adviser: 'Theological Adviser',
  adviser: 'Adviser',
  president: 'President',
  internal_vice_president: 'Internal Vice President',
  external_vice_president: 'External Vice President',
  secretary: 'Secretary',
  treasurer: 'Treasurer',
  auditor: 'Auditor',
  pio: 'PIO',
}

export default function BoardsPage() {
  const [dioceses, setDioceses] = useState<Diocese[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [seatLimits, setSeatLimits] = useState<SeatLimit[]>([])
  const [users, setUsers] = useState<UserLite[]>([])
  const [members, setMembers] = useState<BoardMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  const [level, setLevel] = useState<'national' | 'diocese' | 'chapter'>('national')
  const [dioceseId, setDioceseId] = useState('')
  const [chapterId, setChapterId] = useState('')

  const [editingLimit, setEditingLimit] = useState<string | null>(null)
  const [limitDraft, setLimitDraft] = useState('')
  const [savingLimit, setSavingLimit] = useState(false)

  const [addUserId, setAddUserId] = useState('')
  const [adding, setAdding] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [assigningId, setAssigningId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/dioceses').then((r) => r.ok ? r.json() : []).then(setDioceses).catch(() => {})
    fetch('/api/admin/chapters').then((r) => r.ok ? r.json() : []).then(setChapters).catch(() => {})
    fetch('/api/admin/board-seat-limits').then((r) => r.ok ? r.json() : []).then(setSeatLimits).catch(() => {})
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(createClient() as any).rpc('get_all_users').then(({ data }: { data: UserLite[] | null }) => setUsers(data ?? []))
  }, [])

  const orgUnitKey = level === 'national' ? '' : level === 'diocese' ? dioceseId : chapterId

  useEffect(() => {
    if (level === 'diocese' && !dioceseId) { setMembers([]); return }
    if (level === 'chapter' && !chapterId) { setMembers([]); return }
    loadMembers()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, dioceseId, chapterId])

  async function loadMembers() {
    setLoading(true); setError('')
    const params = new URLSearchParams({ level })
    if (level === 'diocese' && dioceseId) params.set('diocese_id', dioceseId)
    if (level === 'chapter' && chapterId) params.set('chapter_id', chapterId)
    const res = await fetch(`/api/admin/board-members?${params}`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setError(data.error ?? 'Failed to load roster'); setLoading(false); return }
    setMembers(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  function flash(text: string, isError = false) {
    if (isError) setError(text); else { setMsg(text); setTimeout(() => setMsg(''), 4000) }
  }

  async function saveLimit(lvl: string) {
    const seats = parseInt(limitDraft, 10)
    if (!seats || seats <= 0) { flash('Enter a positive number of seats', true); return }
    setSavingLimit(true); setError('')
    const res = await fetch('/api/admin/board-seat-limits', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: lvl, max_seats: seats }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { flash(data.error ?? 'Failed to update seat limit', true); setSavingLimit(false); return }
    setSeatLimits((prev) => prev.map((s) => s.level === lvl ? { ...s, max_seats: seats } : s))
    setEditingLimit(null); setSavingLimit(false)
    flash('Seat limit updated.')
  }

  async function addMember() {
    if (!addUserId) return
    setAdding(true); setError('')
    const res = await fetch('/api/admin/board-members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        diocese_id: level === 'diocese' ? dioceseId : undefined,
        chapter_id: level === 'chapter' ? chapterId : undefined,
        user_id: addUserId,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { flash(data.error ?? 'Failed to add member', true); setAdding(false); return }
    setAddUserId(''); setAdding(false)
    flash('Board member added.')
    await loadMembers()
  }

  async function removeMember(id: string) {
    setRemovingId(id); setError('')
    const res = await fetch(`/api/admin/board-members?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { flash(data.error ?? 'Failed to remove member', true); setRemovingId(null); return }
    setRemovingId(null)
    flash('Board member removed.')
    await loadMembers()
  }

  async function assignOffice(id: string, office: string | null) {
    setAssigningId(id); setError('')
    const res = await fetch('/api/admin/board-members', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, office }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { flash(data.error ?? 'Failed to update office', true); setAssigningId(null); return }
    setAssigningId(null)
    await loadMembers()
  }

  const currentLimit = seatLimits.find((s) => s.level === level)?.max_seats ?? null
  const availableUsers = useMemo(
    () => users.filter((u) => !members.some((m) => m.user_id === u.id)),
    [users, members],
  )
  const officesTaken = new Set(members.filter((m) => m.office).map((m) => m.office))

  function userEmail(id: string) {
    return users.find((u) => u.id === id)?.email ?? id
  }

  return (
    <div>
      <div className="sticky top-[57px] z-30 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
          <Users weight="light" size={20} className="text-muted-foreground" />
          <h1 className="text-base font-bold text-foreground">Boards &amp; Officers</h1>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-6 space-y-4">
        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">{error}</p>
        )}
        {msg && (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">{msg}</p>
        )}

        {/* Seat limits */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seat limits (per level)</p>
          {LEVELS.map(({ value, label, boardName }) => {
            const limit = seatLimits.find((s) => s.level === value)
            const isEditing = editingLimit === value
            return (
              <div key={value} className="flex items-center gap-3">
                <div className="flex-1">
                  <span className="text-sm text-foreground">{label}</span>
                  <span className="ml-1.5 text-xs text-muted-foreground">({boardName})</span>
                </div>
                {isEditing ? (
                  <>
                    <input
                      type="number"
                      min={1}
                      value={limitDraft}
                      onChange={(e) => setLimitDraft(e.target.value)}
                      className="field w-20 py-1 text-sm"
                    />
                    <button onClick={() => saveLimit(value)} disabled={savingLimit} className="icon-btn hover:bg-muted hover:text-foreground">
                      {savingLimit ? <Spinner weight="light" size={14} className="animate-spin" /> : <FloppyDisk weight="fill" size={14} />}
                    </button>
                    <button onClick={() => setEditingLimit(null)} className="icon-btn hover:bg-muted hover:text-foreground">
                      <X weight="light" size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-semibold text-foreground">{limit?.max_seats ?? '—'}</span>
                    <button
                      onClick={() => { setEditingLimit(value); setLimitDraft(String(limit?.max_seats ?? '')) }}
                      className="icon-btn hover:bg-muted hover:text-foreground"
                    >
                      <PencilSimple weight="light" size={14} />
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>

        {/* Level / org-unit selector */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex rounded-xl border border-border bg-card p-1">
            {LEVELS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => { setLevel(value); setDioceseId(''); setChapterId('') }}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  level === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {level === 'diocese' && (
            <select value={dioceseId} onChange={(e) => setDioceseId(e.target.value)} className="field w-auto">
              <option value="">Select a diocese…</option>
              {dioceses.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}

          {level === 'chapter' && (
            <select value={chapterId} onChange={(e) => setChapterId(e.target.value)} className="field w-auto">
              <option value="">Select a chapter…</option>
              {dioceses.map((d) => {
                const dioceseChapters = chapters.filter((c) => c.diocese_id === d.id)
                if (dioceseChapters.length === 0) return null
                return (
                  <optgroup key={d.id} label={d.name}>
                    {dioceseChapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </optgroup>
                )
              })}
            </select>
          )}
        </div>

        {/* Roster */}
        {(level === 'national' || orgUnitKey) && (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <p className="text-sm font-semibold text-foreground">
                Roster {currentLimit !== null && <span className="text-muted-foreground font-normal">({members.length}/{currentLimit})</span>}
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <Spinner weight="light" size={22} className="animate-spin text-muted-foreground" />
              </div>
            ) : members.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No board members yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 px-4 py-2.5">
                    <span className="flex-1 truncate text-sm text-foreground">{userEmail(m.user_id)}</span>
                    <select
                      value={m.office ?? ''}
                      disabled={assigningId === m.id}
                      onChange={(e) => assignOffice(m.id, e.target.value || null)}
                      className="field w-auto py-1 text-xs"
                    >
                      <option value="">No office</option>
                      {OFFICES.map((o) => (
                        <option key={o} value={o} disabled={o !== m.office && officesTaken.has(o)}>
                          {OFFICE_LABELS[o]}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeMember(m.id)}
                      disabled={removingId === m.id}
                      className="icon-btn hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                      title="Remove"
                    >
                      {removingId === m.id ? <Spinner weight="light" size={14} className="animate-spin" /> : <Trash weight="light" size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add member */}
            <div className="flex gap-2 border-t border-border px-4 py-3">
              <select value={addUserId} onChange={(e) => setAddUserId(e.target.value)} className="field flex-1 py-1.5 text-sm">
                <option value="">Select a user to add…</option>
                {availableUsers.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
              </select>
              <button
                onClick={addMember}
                disabled={!addUserId || adding}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                {adding ? <Spinner weight="light" size={14} className="animate-spin" /> : 'Add'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
