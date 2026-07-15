'use client'

import { useEffect, useState } from 'react'
import {
  User,
  SignIn,
  SignOut,
  CloudArrowUp,
  CloudArrowDown,
  CheckCircle,
  Warning,
} from '@phosphor-icons/react'
import {
  signInWithEmail,
  signUpWithEmail,
  signOut,
  getSession,
} from '@/lib/supabase/auth'
import {
  syncFavoritesToCloud,
  syncNotesToCloud,
  syncReadProgressToCloud,
  fetchFavoritesFromCloud,
  fetchNotesFromCloud,
  fetchReadProgressFromCloud,
} from '@/lib/supabase/sync'
import { useFavoritesStore } from '@/store/useFavoritesStore'
import { useNotesStore } from '@/store/useNotesStore'
import { useReadingStore } from '@/store/useReadingStore'
import type { Session } from '@/lib/supabase/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

type AuthMode = 'signin' | 'signup'
type SyncStatus = 'idle' | 'syncing' | 'done' | 'error'

const isConfigured = !!getSupabaseBrowserClient()

export default function AccountPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<SyncStatus>('idle')
  const [downloadStatus, setDownloadStatus] = useState<SyncStatus>('idle')

  const { favoriteIds, addedAt, toggleFavorite } = useFavoritesStore()
  const { notes, setNote } = useNotesStore()
  const { readProgress, markAsRead } = useReadingStore()

  useEffect(() => {
    getSession().then(setSession)

    const sb = getSupabaseBrowserClient()
    if (!sb) return
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result =
        mode === 'signin'
          ? await signInWithEmail(email, password)
          : await signUpWithEmail(email, password, displayName)

      if (result.error) {
        setError(result.error.message)
      } else if (mode === 'signup' && !result.data?.session) {
        setError('Check your email for a confirmation link, then sign in.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload() {
    if (!session) return
    setUploadStatus('syncing')
    try {
      const favList = favoriteIds.map((id) => ({ id, addedAt: addedAt[id] ?? null }))
      await Promise.all([
        syncFavoritesToCloud(session.user.id, favList),
        syncNotesToCloud(session.user.id, notes),
        syncReadProgressToCloud(session.user.id, readProgress),
      ])
      setUploadStatus('done')
    } catch {
      setUploadStatus('error')
    }
  }

  async function handleDownload() {
    if (!session) return
    setDownloadStatus('syncing')
    try {
      const [remoteFavs, remoteNotes, remoteProgress] = await Promise.all([
        fetchFavoritesFromCloud(session.user.id),
        fetchNotesFromCloud(session.user.id),
        fetchReadProgressFromCloud(session.user.id),
      ])

      if (remoteFavs) {
        for (const { id } of remoteFavs) {
          if (!favoriteIds.includes(id)) toggleFavorite(id)
        }
      }
      if (remoteNotes) {
        for (const [topicId, text] of Object.entries(remoteNotes)) {
          setNote(topicId, text)
        }
      }
      if (remoteProgress) {
        for (const [topicId, { isRead }] of Object.entries(remoteProgress)) {
          if (isRead) markAsRead(topicId)
        }
      }
      setDownloadStatus('done')
    } catch {
      setDownloadStatus('error')
    }
  }

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-md px-4 pb-24 pt-10 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto">
            <Warning weight="light" size={32} className="text-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Cloud Sync Not Configured</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Add your Supabase URL and anon key to <code className="rounded bg-muted px-1">.env.local</code> to enable account features.
          </p>
          <div className="mt-4 rounded-xl bg-muted p-3 text-left text-xs font-mono text-muted-foreground">
            <p>NEXT_PUBLIC_SUPABASE_URL=https://…supabase.co</p>
            <p>NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ…</p>
          </div>
        </div>
      </div>
    )
  }

  if (session) {
    const user = session.user
    const name = (user.user_metadata?.display_name as string | undefined) ?? user.email ?? 'User'

    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-md px-4 pb-24 pt-10">
          {/* Profile card */}
          <div className="rounded-2xl bg-card border border-border p-5 shadow-sm text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <User weight="light" size={32} className="text-primary" />
            </div>
            <p className="font-semibold text-foreground">{name}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{user.email}</p>
          </div>

          {/* Sync actions */}
          <div className="mt-6 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cloud Sync
            </p>

            <button
              onClick={handleUpload}
              disabled={uploadStatus === 'syncing'}
              className="flex w-full items-center gap-3 rounded-2xl bg-card border border-border p-4 shadow-sm hover:shadow-md transition-shadow disabled:opacity-60"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                {uploadStatus === 'done' ? (
                  <CheckCircle weight="fill" size={20} className="text-green-500" />
                ) : (
                  <CloudArrowUp weight="light" size={20} className="text-primary" />
                )}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">Upload to Cloud</p>
                <p className="text-xs text-muted-foreground">
                  {uploadStatus === 'syncing' ? 'Uploading…' : uploadStatus === 'error' ? 'Error — try again' : `${favoriteIds.length} favorites · ${Object.keys(notes).length} notes · ${Object.values(readProgress).filter(p => p.isRead).length} read`}
                </p>
              </div>
            </button>

            <button
              onClick={handleDownload}
              disabled={downloadStatus === 'syncing'}
              className="flex w-full items-center gap-3 rounded-2xl bg-card border border-border p-4 shadow-sm hover:shadow-md transition-shadow disabled:opacity-60"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                {downloadStatus === 'done' ? (
                  <CheckCircle weight="fill" size={20} className="text-green-500" />
                ) : (
                  <CloudArrowDown weight="light" size={20} className="text-primary" />
                )}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">Download from Cloud</p>
                <p className="text-xs text-muted-foreground">
                  {downloadStatus === 'syncing' ? 'Downloading…' : downloadStatus === 'error' ? 'Error — try again' : 'Merge cloud data into this device'}
                </p>
              </div>
            </button>
          </div>

          {/* Sign out */}
          <div className="mt-6">
            <button
              onClick={() => signOut()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card p-3 text-sm text-muted-foreground hover:text-red-500 transition-colors shadow-sm"
            >
              <SignOut weight="light" size={18} />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 pb-24 pt-10">
        <div className="text-center mb-8">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <SignIn weight="light" size={32} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === 'signin'
              ? 'Sync your favorites, notes, and reading progress across devices.'
              : 'Create a free account to back up your progress to the cloud.'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-3">
          {mode === 'signup' && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Display Name (optional)
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl bg-card border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl bg-card border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              className="w-full rounded-xl bg-card border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError('') }}
            className="font-medium text-primary hover:underline"
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
