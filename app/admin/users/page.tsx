'use client'

import { useEffect, useState } from 'react'
import { UserPlus, Trash, ShieldStar, PencilSimple, Check, X } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { getSession } from '@/lib/supabase/auth'
import { useAdminRole } from '@/app/admin/role-context'
import { cn } from '@/lib/utils'

interface UserRow {
  user_id: string
  email: string
  role: 'admin' | 'editor'
  created_at: string
}

const ROLE_LABELS: Record<string, string> = {
  admin:  'Admin',
  editor: 'Editor',
}

const ROLE_COLORS: Record<string, string> = {
  admin:  'bg-primary/10 text-primary',
  editor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin:  'Full access — config, topics, users, paths',
  editor: 'Topics, translations, and submissions only',
}

export default function AdminUsersPage() {
  const myRole = useAdminRole()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [users, setUsers]         = useState<UserRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [newEmail, setNewEmail]   = useState('')
  const [newRole, setNewRole]     = useState<'admin' | 'editor'>('editor')
  const [msg, setMsg]             = useState('')
  const [msgType, setMsgType]     = useState<'ok' | 'err'>('ok')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRole, setEditRole]   = useState<'admin' | 'editor'>('editor')

  useEffect(() => {
    getSession().then((s) => setCurrentUserId(s?.user.id ?? null))
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoading(true)
    const { data } = await createClient()
      .from('admins')
      .select('user_id, email, role, created_at')
      .order('created_at')
    setUsers((data ?? []) as UserRow[])
    setLoading(false)
  }

  function flash(text: string, type: 'ok' | 'err' = 'ok') {
    setMsg(text); setMsgType(type)
    setTimeout(() => setMsg(''), 4000)
  }

  async function addUser(e: React.FormEvent) {
    e.preventDefault()
    if (!newEmail.trim()) return
    const { error } = await createClient().from('admins').insert({
      user_id: '00000000-0000-0000-0000-000000000000',
      email: newEmail.trim(),
      role: newRole,
      granted_by: currentUserId,
    })
    if (error) {
      flash('Could not add user: ' + error.message, 'err')
    } else {
      flash(`Added ${newEmail.trim()} as ${ROLE_LABELS[newRole]}.`)
      setNewEmail('')
      loadUsers()
    }
  }

  async function saveRoleEdit(userId: string) {
    await createClient().from('admins').update({ role: editRole }).eq('user_id', userId)
    setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, role: editRole } : u))
    setEditingId(null)
    flash('Role updated.')
  }

  async function removeUser(u: UserRow) {
    if (u.user_id === currentUserId) { flash("You can't remove yourself.", 'err'); return }
    await createClient().from('admins').delete().eq('user_id', u.user_id)
    flash(`Removed ${u.email}.`)
    loadUsers()
  }

  if (myRole !== 'admin') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Only admins can manage users.</p>
      </div>
    )
  }

  return (
    <div className="pb-24">
      <div className="mx-auto max-w-2xl px-4 pt-8 space-y-8">

        <div>
          <h1 className="text-xl font-bold text-foreground">User Management</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage who has access to the admin panel and what they can do.
          </p>
        </div>

        {/* Role legend */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(['admin', 'editor'] as const).map((r) => (
            <div key={r} className="rounded-2xl border border-border bg-card p-4 flex items-start gap-3">
              <ShieldStar weight="light" size={20} className="text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold mb-1', ROLE_COLORS[r])}>
                  {ROLE_LABELS[r]}
                </span>
                <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[r]}</p>
              </div>
            </div>
          ))}
        </div>

        {/* User list */}
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-3">Current Users</h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.user_id} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground truncate">{u.email}</p>
                      {u.user_id === currentUserId && (
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">You</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Since {new Date(u.created_at).toLocaleDateString()}</p>
                  </div>

                  {/* Role — editable */}
                  {editingId === u.user_id ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as 'admin' | 'editor')}
                        className="rounded-lg border border-border bg-muted px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                      </select>
                      <button
                        onClick={() => saveRoleEdit(u.user_id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                      >
                        <Check weight="bold" size={14} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                      >
                        <X weight="light" size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', ROLE_COLORS[u.role])}>
                        {ROLE_LABELS[u.role]}
                      </span>
                      {u.user_id !== currentUserId && (
                        <button
                          onClick={() => { setEditingId(u.user_id); setEditRole(u.role) }}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title="Change role"
                        >
                          <PencilSimple weight="light" size={14} />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Remove */}
                  {u.user_id !== currentUserId && (
                    <button
                      onClick={() => removeUser(u)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20 transition-colors shrink-0"
                      title="Remove user"
                    >
                      <Trash weight="light" size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Add user */}
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-3">Add User</h2>
          <form onSubmit={addUser} className="flex gap-2 flex-wrap">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="user@email.com"
              required
              className="flex-1 min-w-48 rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as 'admin' | 'editor')}
              className="rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              <UserPlus weight="fill" size={15} />
              Add
            </button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            The user will have access after their next sign-in.
          </p>
        </section>

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
