'use client'

import { useEffect, useState } from 'react'
import { FloppyDisk, ArrowClockwise, Lock } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { getUser } from '@/lib/supabase/auth'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import type { User } from '@/lib/supabase/auth'

// ── Allowed admin emails ──────────────────────────────────────────────────────
// Replace with your actual admin email(s). For a multi-admin setup, move this
// to the site_config table itself.
const ADMIN_EMAILS = ['earlrodson@gmail.com']

interface ConfigRow {
  key: string
  value: string
  description: string | null
  updated_at: string
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function AdminPage() {
  const [user, setUser]       = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [rows, setRows]       = useState<ConfigRow[]>([])
  const [edits, setEdits]     = useState<Record<string, string>>({})
  const [status, setStatus]   = useState<SaveStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    getUser().then((u) => {
      setUser(u)
      setLoading(false)
      if (u && ADMIN_EMAILS.includes(u.email ?? '')) loadConfig()
    })
  }, [])

  async function loadConfig() {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    const { data, error } = await supabase
      .from('site_config')
      .select('key, value, description, updated_at')
      .order('key')
    if (!error && data) {
      setRows(data)
      const initial: Record<string, string> = {}
      data.forEach((r) => { initial[r.key] = r.value })
      setEdits(initial)
    }
  }

  async function saveAll() {
    if (!isSupabaseConfigured()) return
    setStatus('saving')
    setErrorMsg('')
    const supabase = createClient()

    const updates = Object.entries(edits).map(([key, value]) => ({ key, value }))
    const { error } = await supabase
      .from('site_config')
      .upsert(updates, { onConflict: 'key' })

    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
    } else {
      setStatus('saved')
      await loadConfig()
      setTimeout(() => setStatus('idle'), 2000)
    }
  }

  const isDirty = rows.some((r) => edits[r.key] !== r.value)
  const isAdmin = user && ADMIN_EMAILS.includes(user.email ?? '')

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  // ── Not signed in ──────────────────────────────────────────────────────────
  if (!user) {
    return <AccessDenied message="Sign in to access the admin panel." />
  }

  // ── Signed in but not admin ────────────────────────────────────────────────
  if (!isAdmin) {
    return <AccessDenied message="Your account does not have admin access." />
  }

  // ── Admin view ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-2xl px-4 pt-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">App Config</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Changes take effect immediately — no redeploy needed.
            </p>
          </div>
          <button
            onClick={loadConfig}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Reload config"
          >
            <ArrowClockwise weight="light" size={18} />
          </button>
        </div>

        {/* Config rows */}
        <div className="space-y-4">
          {rows.map((row) => (
            <div key={row.key} className="rounded-2xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-mono font-semibold text-primary">{row.key}</span>
                  {row.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{row.description}</p>
                  )}
                </div>
                {edits[row.key] !== row.value && (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    unsaved
                  </span>
                )}
              </div>
              <input
                type="text"
                value={edits[row.key] ?? row.value}
                onChange={(e) => setEdits((prev) => ({ ...prev, [row.key]: e.target.value }))}
                className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-right text-[10px] text-muted-foreground">
                Last updated: {new Date(row.updated_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        {/* Error */}
        {status === 'error' && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {errorMsg}
          </div>
        )}

        {/* Save button */}
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={saveAll}
            disabled={!isDirty || status === 'saving'}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <FloppyDisk weight="fill" size={16} />
            {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved!' : 'Save Changes'}
          </button>
          {isDirty && status === 'idle' && (
            <button
              onClick={() => {
                const reset: Record<string, string> = {}
                rows.forEach((r) => { reset[r.key] = r.value })
                setEdits(reset)
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Discard
            </button>
          )}
        </div>
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
