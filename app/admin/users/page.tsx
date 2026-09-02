'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { Trash, ShieldStar, ShieldCheck, PencilSimple, CaretLeft, MagnifyingGlass, ArrowClockwise, EnvelopeSimple, IdentificationCard, DotsThreeVertical, Buildings, LinkSimple } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { getSession } from '@/lib/supabase/auth'
import { useAdminRole } from '@/app/admin/role-context'
import { cn } from '@/lib/utils'

interface UserRow {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  role: 'admin' | 'editor' | 'presenter' | 'superadmin' | null   // null = regular user, no admin access
  is_cfd_member: boolean
  chapter_id: string | null
  chapter_name: string | null
}

interface DioceseRow { id: string; name: string }
interface ChapterRow { id: string; name: string; type: 'parish' | 'school'; diocese_id: string }

const ROLE_LABELS: Record<string, string> = {
  admin:      'Admin',
  editor:     'Editor',
  presenter:  'Presenter',
  superadmin: 'Superadmin',
}

const ROLE_COLORS: Record<string, string> = {
  admin:      'bg-primary/10 text-primary',
  editor:     'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  presenter:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  superadmin: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
}

function MenuItem({
  icon: Icon, label, onClick, loading, danger, active,
}: {
  icon?: React.ComponentType<{ weight?: 'light' | 'bold' | 'fill'; size?: number; className?: string }>
  label: string
  onClick: () => void
  loading?: boolean
  danger?: boolean
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        'flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors disabled:opacity-50',
        danger
          ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20'
          : 'text-foreground hover:bg-muted',
        active && 'font-semibold',
      )}
    >
      {loading
        ? <div className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
        : Icon && <Icon weight="light" size={14} className="shrink-0" />
      }
      {label}
    </button>
  )
}

export default function AdminUsersPage() {
  const myRole = useAdminRole()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [users, setUsers]       = useState<UserRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filterRole, setFilterRole] = useState<'' | 'admin' | 'editor' | 'presenter' | 'user'>('')
  const [filterCfd, setFilterCfd] = useState<'' | 'cfd' | 'non-cfd'>('')
  const [msg, setMsg]           = useState('')
  const [msgType, setMsgType]   = useState<'ok' | 'err'>('ok')
  const [grantingId, setGrantingId]   = useState<string | null>(null)
  const [resettingId, setResettingId] = useState<string | null>(null)
  const [copyingLinkId, setCopyingLinkId] = useState<string | null>(null)
  const [togglingId, setTogglingId]   = useState<string | null>(null)
  const [assigningChapterId, setAssigningChapterId] = useState<string | null>(null)
  const [dioceses, setDioceses] = useState<DioceseRow[]>([])
  const [chapters, setChapters] = useState<ChapterRow[]>([])
  const [openMenu, setOpenMenu] = useState<{ id: string; view: 'main' | 'role' | 'chapter' } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!openMenu) return
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [openMenu])

  async function loadUsers() {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (createClient() as any).rpc('get_all_users')
    if (error) {
      flash('Failed to load users: ' + error.message, 'err')
    } else {
      setUsers((data ?? []) as UserRow[])
    }
    setLoading(false)
  }

  useEffect(() => {
    getSession().then((s) => setCurrentUserId(s?.user.id ?? null))
    loadUsers()
    fetch('/api/admin/dioceses').then((r) => r.ok ? r.json() : []).then(setDioceses).catch(() => {})
    fetch('/api/admin/chapters').then((r) => r.ok ? r.json() : []).then(setChapters).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function flash(text: string, type: 'ok' | 'err' = 'ok') {
    setMsg(text); setMsgType(type)
    setTimeout(() => setMsg(''), 4000)
  }

  // Grant role to an existing auth user (by their UUID)
  async function grantRole(user: UserRow, role: 'admin' | 'editor' | 'presenter') {
    setGrantingId(user.id)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, email: user.email, role }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      flash('Could not grant role: ' + (data.error ?? res.statusText), 'err')
    } else {
      flash(`Granted ${ROLE_LABELS[role]} to ${user.email}.`)
      await loadUsers()
    }
    setGrantingId(null)
  }

  async function changeRole(user: UserRow, role: 'admin' | 'editor' | 'presenter') {
    const res = await fetch('/api/admin/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, role }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      flash('Could not update role: ' + (data.error ?? res.statusText), 'err')
      return
    }
    flash(`Changed ${user.email} to ${ROLE_LABELS[role]}.`)
    await loadUsers()
  }

  async function sendPasswordReset(user: UserRow) {
    setResettingId(user.id)
    const { error } = await createClient().auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      flash('Could not send reset email: ' + error.message, 'err')
    } else {
      flash(`Password reset email sent to ${user.email}.`)
    }
    setResettingId(null)
  }

  async function copyResetLink(user: UserRow) {
    setCopyingLinkId(user.id)
    const res = await fetch('/api/admin/users/reset-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      flash('Could not generate reset link: ' + (data.error ?? res.statusText), 'err')
    } else {
      await navigator.clipboard.writeText(data.link)
      flash(`Reset link for ${user.email} copied to clipboard.`)
    }
    setCopyingLinkId(null)
  }

  async function toggleCfdMember(user: UserRow) {
    setTogglingId(user.id)
    const next = !user.is_cfd_member
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, is_cfd_member: next }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      flash('Could not update CFD membership: ' + (data.error ?? res.statusText), 'err')
    } else {
      flash(`${next ? 'Granted' : 'Revoked'} CFD membership for ${user.email}.`)
      await loadUsers()
    }
    setTogglingId(null)
  }

  async function assignChapter(user: UserRow, chapterId: string | null) {
    setAssigningChapterId(user.id)
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, chapter_id: chapterId }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      flash('Could not update chapter: ' + (data.error ?? res.statusText), 'err')
    } else {
      const chapterName = chapterId ? chapters.find((c) => c.id === chapterId)?.name : null
      flash(chapterName ? `Assigned ${user.email} to ${chapterName}.` : `Cleared ${user.email}'s chapter.`)
      await loadUsers()
    }
    setAssigningChapterId(null)
  }

  async function revokeRole(user: UserRow) {
    if (user.id === currentUserId) { flash("You can't remove your own access.", 'err'); return }
    const res = await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      flash('Could not revoke access: ' + (data.error ?? res.statusText), 'err')
      return
    }
    flash(`Revoked access for ${user.email}.`)
    await loadUsers()
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return users.filter((u) => {
      if (filterRole === 'admin'     && u.role !== 'admin')     return false
      if (filterRole === 'editor'    && u.role !== 'editor')    return false
      if (filterRole === 'presenter' && u.role !== 'presenter') return false
      if (filterRole === 'user'      && u.role !== null)        return false
      if (filterCfd === 'cfd'        && !u.is_cfd_member)       return false
      if (filterCfd === 'non-cfd'    && u.is_cfd_member)        return false
      if (q && !u.email.toLowerCase().includes(q))              return false
      return true
    })
  }, [users, search, filterRole, filterCfd])

  const adminCount     = users.filter((u) => u.role === 'admin').length
  const editorCount    = users.filter((u) => u.role === 'editor').length
  const presenterCount = users.filter((u) => u.role === 'presenter').length
  const userCount      = users.filter((u) => u.role === null).length
  const cfdCount       = users.filter((u) => u.is_cfd_member).length

  if (myRole !== 'admin') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Only admins can manage users.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mx-auto max-w-3xl px-4 pt-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Users</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {users.length} total · {adminCount} admin · {editorCount} editor · {presenterCount} presenter · {userCount} regular · {cfdCount} CFD member{cfdCount === 1 ? '' : 's'}
            </p>
          </div>
          <button
            onClick={loadUsers}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Refresh"
          >
            <ArrowClockwise weight="light" size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Role legend */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {([
            { role: 'admin'     as const, label: 'Admin',     desc: 'Full access — config, topics, users, paths' },
            { role: 'editor'    as const, label: 'Editor',    desc: 'Topics, translations, and submissions only' },
            { role: 'presenter' as const, label: 'Presenter', desc: 'Generate, edit, and publish presentations only' },
            { role: null,                 label: 'User',      desc: 'App user — no admin panel access' },
          ]).map(({ role, label, desc }) => (
            <div key={String(role)} className="rounded-2xl border border-border bg-card p-3 flex items-start gap-2.5">
              <ShieldStar weight="light" size={16} className="text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <span className={cn(
                  'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold mb-1',
                  role ? ROLE_COLORS[role] : 'bg-muted text-muted-foreground',
                )}>
                  {label ?? ROLE_LABELS[role!]}
                </span>
                <p className="text-[11px] text-muted-foreground leading-snug">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <MagnifyingGlass weight="light" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email…"
              className="w-full rounded-xl border border-border bg-card pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as typeof filterRole)}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All roles</option>
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
            <option value="presenter">Presenter</option>
            <option value="user">Regular users</option>
          </select>
          <select
            value={filterCfd}
            onChange={(e) => setFilterCfd(e.target.value as typeof filterCfd)}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All CFD status</option>
            <option value="cfd">CFD members</option>
            <option value="non-cfd">Not CFD members</option>
          </select>
        </div>

        {/* User list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card py-12 text-center">
            <p className="text-sm text-muted-foreground">No users match your filters.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((u) => (
              <div
                key={u.id}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition-colors',
                  !u.role && 'bg-muted/30',
                )}
              >
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground truncate">{u.email}</p>
                    {u.is_cfd_member && (
                      <ShieldCheck weight="fill" size={14} className="shrink-0 text-emerald-600" aria-label="CFD member" />
                    )}
                    {u.id === currentUserId && (
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">You</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Joined {new Date(u.created_at).toLocaleDateString()}
                    {u.last_sign_in_at && (
                      <> · Last seen {new Date(u.last_sign_in_at).toLocaleDateString()}</>
                    )}
                    {u.chapter_name && <> · {u.chapter_name}</>}
                  </p>
                </div>

                {/* Role badge */}
                {u.role && (
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', ROLE_COLORS[u.role])}>
                    {ROLE_LABELS[u.role]}
                  </span>
                )}

                {/* Row actions menu */}
                <div className="relative shrink-0" ref={openMenu?.id === u.id ? menuRef : undefined}>
                  <button
                    onClick={() => setOpenMenu(openMenu?.id === u.id ? null : { id: u.id, view: 'main' })}
                    disabled={grantingId === u.id}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40"
                    aria-label="Row actions"
                  >
                    {grantingId === u.id
                      ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      : <DotsThreeVertical weight="bold" size={16} />
                    }
                  </button>

                  {openMenu?.id === u.id && (
                    <div className="absolute right-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg">
                      {openMenu.view === 'main' ? (
                        <>
                          <MenuItem
                            icon={IdentificationCard}
                            label={u.is_cfd_member ? 'Revoke CFD membership' : 'Grant CFD membership'}
                            loading={togglingId === u.id}
                            onClick={() => { setOpenMenu(null); toggleCfdMember(u) }}
                          />
                          <MenuItem
                            icon={EnvelopeSimple}
                            label="Send password reset"
                            loading={resettingId === u.id}
                            onClick={() => { setOpenMenu(null); sendPasswordReset(u) }}
                          />
                          <MenuItem
                            icon={LinkSimple}
                            label="Copy reset link"
                            loading={copyingLinkId === u.id}
                            onClick={() => { setOpenMenu(null); copyResetLink(u) }}
                          />
                          <MenuItem
                            icon={Buildings}
                            label={u.chapter_name ? 'Change chapter' : 'Assign chapter'}
                            onClick={() => setOpenMenu({ id: u.id, view: 'chapter' })}
                          />
                          {u.id !== currentUserId && (
                            <MenuItem
                              icon={PencilSimple}
                              label={u.role ? 'Change role' : 'Grant role'}
                              onClick={() => setOpenMenu({ id: u.id, view: 'role' })}
                            />
                          )}
                          {u.role && u.id !== currentUserId && (
                            <MenuItem
                              icon={Trash}
                              label="Revoke access"
                              danger
                              onClick={() => { setOpenMenu(null); revokeRole(u) }}
                            />
                          )}
                        </>
                      ) : openMenu.view === 'role' ? (
                        <>
                          <button
                            onClick={() => setOpenMenu({ id: u.id, view: 'main' })}
                            className="flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left text-[11px] font-medium text-muted-foreground hover:bg-muted transition-colors"
                          >
                            <CaretLeft weight="bold" size={11} /> Back
                          </button>
                          {(['editor', 'presenter', 'admin'] as const).map((role) => (
                            <MenuItem
                              key={role}
                              label={ROLE_LABELS[role]}
                              active={u.role === role}
                              onClick={() => {
                                setOpenMenu(null)
                                if (u.role) { changeRole(u, role) } else { grantRole(u, role) }
                              }}
                            />
                          ))}
                        </>
                      ) : (
                        <div className="p-2">
                          <button
                            onClick={() => setOpenMenu({ id: u.id, view: 'main' })}
                            className="mb-2 flex w-full items-center gap-2 text-left text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <CaretLeft weight="bold" size={11} /> Back
                          </button>
                          <select
                            defaultValue={u.chapter_id ?? ''}
                            disabled={assigningChapterId === u.id}
                            onChange={(e) => {
                              const value = e.target.value || null
                              setOpenMenu(null)
                              assignChapter(u, value)
                            }}
                            className="w-full rounded-lg border border-border bg-card px-2 py-1.5 text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="">No chapter</option>
                            {dioceses.map((d) => {
                              const chaptersInDiocese = chapters.filter((c) => c.diocese_id === d.id)
                              if (chaptersInDiocese.length === 0) return null
                              return (
                                <optgroup key={d.id} label={d.name}>
                                  {chaptersInDiocese.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                  ))}
                                </optgroup>
                              )
                            })}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {msg && (
          <p className={cn(
            'rounded-xl px-4 py-2.5 text-sm',
            msgType === 'ok'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
              : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
          )}>
            {msg}
          </p>
        )}
      </div>
    </div>
  )
}
