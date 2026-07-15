'use client'

import { useEffect, useState } from 'react'
import { FloppyDisk, ArrowClockwise, Lock, Trash, UserPlus } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { getUser } from '@/lib/supabase/auth'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import type { User } from '@/lib/supabase/auth'

interface ConfigRow {
  key: string
  value: string
  description: string | null
  updated_at: string
}

interface AdminRow {
  user_id: string
  email: string
  created_at: string
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function AdminPage() {
  const [user, setUser]         = useState<User | null>(null)
  const [isAdmin, setIsAdmin]   = useState(false)
  const [loading, setLoading]   = useState(true)

  const [rows, setRows]         = useState<ConfigRow[]>([])
  const [edits, setEdits]       = useState<Record<string, string>>({})
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError]   = useState('')

  const [admins, setAdmins]         = useState<AdminRow[]>([])
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [adminMsg, setAdminMsg]     = useState('')

  useEffect(() => {
    async function init() {
      const u = await getUser()
      setUser(u)
      if (!u || !isSupabaseConfigured()) { setLoading(false); return }

      // Check admin status from DB (not hardcoded list)
      const supabase = createClient()
      const { data } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', u.id)
        .maybeSingle()

      const admin = !!data
      setIsAdmin(admin)
      setLoading(false)
      if (admin) { loadConfig(); loadAdmins() }
    }
    init()
  }, [])

  // ── Config ─────────────────────────────────────────────────────────────────

  async function loadConfig() {
    const supabase = createClient()
    const { data } = await supabase
      .from('site_config')
      .select('key, value, description, updated_at')
      .order('key')
    if (data) {
      setRows(data)
      const initial: Record<string, string> = {}
      data.forEach((r) => { initial[r.key] = r.value })
      setEdits(initial)
    }
  }

  async function saveConfig() {
    setSaveStatus('saving'); setSaveError('')
    const supabase = createClient()
    const updates = Object.entries(edits).map(([key, value]) => ({ key, value }))
    const { error } = await supabase.from('site_config').upsert(updates, { onConflict: 'key' })
    if (error) { setSaveStatus('error'); setSaveError(error.message) }
    else { setSaveStatus('saved'); await loadConfig(); setTimeout(() => setSaveStatus('idle'), 2000) }
  }

  // ── Admins ─────────────────────────────────────────────────────────────────

  async function loadAdmins() {
    const supabase = createClient()
    const { data } = await supabase
      .from('admins')
      .select('user_id, email, created_at')
      .order('created_at')
    if (data) setAdmins(data)
  }

  async function grantAdmin(e: React.FormEvent) {
    e.preventDefault()
    if (!newAdminEmail.trim()) return
    setAdminMsg('')
    const supabase = createClient()

    // Look up user by email via RPC (requires service role in production;
    // for now inserts with email — user_id resolved server-side on first login)
    const { error } = await supabase.from('admins').insert({
      user_id: '00000000-0000-0000-0000-000000000000', // placeholder — see note below
      email: newAdminEmail.trim(),
      granted_by: user?.id,
    })

    if (error) {
      setAdminMsg('Could not grant access: ' + error.message)
    } else {
      setAdminMsg(`Invite sent to ${newAdminEmail.trim()}. They will have admin access after next sign-in.`)
      setNewAdminEmail('')
      loadAdmins()
    }
  }

  async function revokeAdmin(targetUserId: string, targetEmail: string) {
    if (targetUserId === user?.id) { setAdminMsg("You can't revoke your own access."); return }
    const supabase = createClient()
    await supabase.from('admins').delete().eq('user_id', targetUserId)
    setAdminMsg(`Removed admin access for ${targetEmail}.`)
    loadAdmins()
  }

  const isDirty = rows.some((r) => edits[r.key] !== r.value)

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user)    return <AccessDenied message="Sign in to access the admin panel." />
  if (!isAdmin) return <AccessDenied message="Your account does not have admin access." />

  // ── Admin UI ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-2xl px-4 pt-6 space-y-10">

        {/* ── App Config ── */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">App Config</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Changes take effect immediately — no redeploy needed.</p>
            </div>
            <button onClick={loadConfig} className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors" aria-label="Reload">
              <ArrowClockwise weight="light" size={18} />
            </button>
          </div>

          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.key} className="rounded-2xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-mono font-semibold text-primary">{row.key}</span>
                    {row.description && <p className="mt-0.5 text-xs text-muted-foreground">{row.description}</p>}
                  </div>
                  {edits[row.key] !== row.value && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">unsaved</span>
                  )}
                </div>
                <input
                  type="text"
                  value={edits[row.key] ?? row.value}
                  onChange={(e) => setEdits((p) => ({ ...p, [row.key]: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-right text-[10px] text-muted-foreground">
                  Last updated: {new Date(row.updated_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          {saveStatus === 'error' && (
            <p className="mt-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">{saveError}</p>
          )}

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={saveConfig}
              disabled={!isDirty || saveStatus === 'saving'}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <FloppyDisk weight="fill" size={16} />
              {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved!' : 'Save Changes'}
            </button>
            {isDirty && saveStatus === 'idle' && (
              <button
                onClick={() => { const r: Record<string,string> = {}; rows.forEach((x) => { r[x.key] = x.value }); setEdits(r) }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Discard
              </button>
            )}
          </div>
        </section>

        <div className="border-t border-border" />

        {/* ── Admin Management ── */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-foreground">Admins</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Admins can edit app config and manage this list.</p>
          </div>

          {/* Current admins */}
          <div className="space-y-2 mb-5">
            {admins.map((a) => (
              <div key={a.user_id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{a.email}</p>
                  <p className="text-xs text-muted-foreground">Since {new Date(a.created_at).toLocaleDateString()}</p>
                </div>
                {a.user_id !== user?.id ? (
                  <button
                    onClick={() => revokeAdmin(a.user_id, a.email)}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                  >
                    <Trash weight="light" size={14} />
                    Revoke
                  </button>
                ) : (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">You</span>
                )}
              </div>
            ))}
          </div>

          {/* Grant access form */}
          <form onSubmit={grantAdmin} className="flex gap-2">
            <input
              type="email"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              placeholder="user@email.com"
              required
              className="flex-1 rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              <UserPlus weight="fill" size={15} />
              Grant
            </button>
          </form>

          {adminMsg && (
            <p className="mt-3 text-xs text-muted-foreground">{adminMsg}</p>
          )}
        </section>
      </div>
    </div>
  )
}

function AccessDenied({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <Lock weight="light" size={40} className="text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
