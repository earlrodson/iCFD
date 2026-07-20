'use client'

import { useEffect, useState, useMemo } from 'react'
import { UserPlus, Trash, ShieldStar, PencilSimple, Check, X, MagnifyingGlass, ArrowClockwise, EnvelopeSimple } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { getSession } from '@/lib/supabase/auth'
import { useAdminRole } from '@/app/admin/role-context'
import { cn } from '@/lib/utils'

interface UserRow {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  role: 'admin' | 'editor' | null   // null = regular user, no admin access
}

const ROLE_LABELS: Record<string, string> = {
  admin:  'Admin',
  editor: 'Editor',
}

const ROLE_COLORS: Record<string, string> = {
  admin:  'bg-primary/10 text-primary',
  editor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
}

export default function AdminUsersPage() {
  const myRole = useAdminRole()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [users, setUsers]       = useState<UserRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filterRole, setFilterRole] = useState<'' | 'admin' | 'editor' | 'user'>('')
  const [msg, setMsg]           = useState('')
  const [msgType, setMsgType]   = useState<'ok' | 'err'>('ok')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState<'admin' | 'editor'>('editor')
  const [grantingId, setGrantingId]   = useState<string | null>(null)
  const [resettingId, setResettingId] = useState<string | null>(null)

  useEffect(() => {
    getSession().then((s) => setCurrentUserId(s?.user.id ?? null))
    loadUsers()
  }, [])

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

  function flash(text: string, type: 'ok' | 'err' = 'ok') {
    setMsg(text); setMsgType(type)
    setTimeout(() => setMsg(''), 4000)
  }

  // Grant role to an existing auth user (by their UUID)
  async function grantRole(user: UserRow, role: 'admin' | 'editor') {
    setGrantingId(user.id)
    const { error } = await createClient().from('admins').insert({
      user_id: user.id,
      email: user.email,
      role,
      granted_by: currentUserId,
    })
    if (error) {
      flash('Could not grant role: ' + error.message, 'err')
    } else {
      flash(`Granted ${ROLE_LABELS[role]} to ${user.email}.`)
      await loadUsers()
    }
    setGrantingId(null)
  }

  async function saveRoleEdit(userId: string) {
    await createClient().from('admins').update({ role: editRole }).eq('user_id', userId)
    setEditingId(null)
    flash('Role updated.')
    await loadUsers()
  }

  async function sendPasswordReset(user: UserRow) {
    setResettingId(user.id)
    const { error } = await createClient().auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) {
      flash('Could not send reset email: ' + error.message, 'err')
    } else {
      flash(`Password reset email sent to ${user.email}.`)
    }
    setResettingId(null)
  }

  async function revokeRole(user: UserRow) {
    if (user.id === currentUserId) { flash("You can't remove your own access.", 'err'); return }
    await createClient().from('admins').delete().eq('user_id', user.id)
    flash(`Revoked access for ${user.email}.`)
    await loadUsers()
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return users.filter((u) => {
      if (filterRole === 'admin'  && u.role !== 'admin')  return false
      if (filterRole === 'editor' && u.role !== 'editor') return false
      if (filterRole === 'user'   && u.role !== null)     return false
      if (q && !u.email.toLowerCase().includes(q))        return false
      return true
    })
  }, [users, search, filterRole])

  const adminCount  = users.filter((u) => u.role === 'admin').length
  const editorCount = users.filter((u) => u.role === 'editor').length
  const userCount   = users.filter((u) => u.role === null).length

  if (myRole !== 'admin') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Only admins can manage users.</p>
      </div>
    )
  }

  return (
    <div className="pb-24">
      <div className="mx-auto max-w-3xl px-4 pt-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Users</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {users.length} total · {adminCount} admin · {editorCount} editor · {userCount} regular
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {([
            { role: 'admin'  as const, label: 'Admin',  desc: 'Full access — config, topics, users, paths' },
            { role: 'editor' as const, label: 'Editor', desc: 'Topics, translations, and submissions only' },
            { role: null,              label: 'User',   desc: 'App user — no admin panel access' },
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
            <option value="user">Regular users</option>
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
                    {u.id === currentUserId && (
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">You</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Joined {new Date(u.created_at).toLocaleDateString()}
                    {u.last_sign_in_at && (
                      <> · Last seen {new Date(u.last_sign_in_at).toLocaleDateString()}</>
                    )}
                  </p>
                </div>

                {/* Reset password */}
                <button
                  onClick={() => sendPasswordReset(u)}
                  disabled={resettingId === u.id}
                  className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40"
                  title="Send password reset email"
                >
                  {resettingId === u.id
                    ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    : <EnvelopeSimple weight="light" size={14} />
                  }
                </button>

                {/* Role — view / edit inline */}
                {u.role && editingId === u.id ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as 'admin' | 'editor')}
                      className="rounded-lg border border-border bg-muted px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={() => saveRoleEdit(u.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                    >
                      <Check weight="bold" size={13} />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                    >
                      <X weight="light" size={13} />
                    </button>
                  </div>
                ) : u.role ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', ROLE_COLORS[u.role])}>
                      {ROLE_LABELS[u.role]}
                    </span>
                    {u.id !== currentUserId && (
                      <>
                        <button
                          onClick={() => { setEditingId(u.id); setEditRole(u.role as 'admin' | 'editor') }}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title="Change role"
                        >
                          <PencilSimple weight="light" size={13} />
                        </button>
                        <button
                          onClick={() => revokeRole(u)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20 transition-colors"
                          title="Revoke access"
                        >
                          <Trash weight="light" size={13} />
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  /* Regular user — grant role */
                  <div className="flex items-center gap-1.5 shrink-0">
                    {grantingId === u.id ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    ) : (
                      <>
                        <button
                          onClick={() => grantRole(u, 'editor')}
                          className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:border-emerald-400 hover:text-emerald-600 transition-colors"
                        >
                          + Editor
                        </button>
                        <button
                          onClick={() => grantRole(u, 'admin')}
                          className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                        >
                          + Admin
                        </button>
                      </>
                    )}
                  </div>
                )}
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
