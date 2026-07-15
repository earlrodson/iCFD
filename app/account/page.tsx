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
  EnvelopeSimple,
  GoogleLogo,
  AppleLogo,
} from '@phosphor-icons/react'
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithMagicLink,
  signInWithGoogle,
  signInWithApple,
  signOut,
  getUser,
  onAuthStateChange,
} from '@/lib/supabase/auth'
import {
  syncFavoritesToCloud,
  syncNotesToCloud,
  syncReadProgressToCloud,
  fetchFavoritesFromCloud,
  fetchNotesFromCloud,
  fetchReadProgressFromCloud,
  fetchUserSettingsFromCloud,
} from '@/lib/supabase/sync'
import { useFavoritesStore } from '@/store/useFavoritesStore'
import { useNotesStore } from '@/store/useNotesStore'
import { useReadingStore } from '@/store/useReadingStore'
import { useAppStore } from '@/store/useAppStore'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import type { User as SupabaseUser } from '@/lib/supabase/auth'

type AuthMode = 'signin' | 'signup' | 'magic'
type SyncStatus = 'idle' | 'syncing' | 'done' | 'error'

export default function AccountPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [authError, setAuthError] = useState('')
  const [magicSent, setMagicSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<SyncStatus>('idle')
  const [downloadStatus, setDownloadStatus] = useState<SyncStatus>('idle')

  const { favoriteIds, addedAt, toggleFavorite } = useFavoritesStore()
  const { notes, setNote } = useNotesStore()
  const { readProgress, markAsRead } = useReadingStore()
  const { setLanguage, setFontSize } = useAppStore()

  // Initial auth state + subscribe to changes
  useEffect(() => {
    getUser().then(setUser)
    return onAuthStateChange(setUser)
  }, [])

  // Sync user settings from cloud on sign-in
  useEffect(() => {
    if (!user) return
    fetchUserSettingsFromCloud(user.id).then((s) => {
      if (!s) return
      if (s.language) setLanguage(s.language)
      if (s.font_size) setFontSize(s.font_size)
    })
  }, [user, setLanguage, setFontSize])

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault()
    setAuthError('')
    setLoading(true)
    try {
      const result =
        mode === 'signin'
          ? await signInWithEmail(email, password)
          : await signUpWithEmail(email, password, displayName)

      if (result.error) {
        setAuthError(result.error.message)
      } else if (mode === 'signup' && !result.data?.session) {
        setAuthError('Check your email for a confirmation link, then sign in.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setAuthError('')
    setLoading(true)
    try {
      const { error } = await signInWithMagicLink(email)
      if (error) setAuthError(error.message)
      else setMagicSent(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload() {
    if (!user) return
    setUploadStatus('syncing')
    try {
      const favList = favoriteIds.map((id) => ({ id, addedAt: addedAt[id] ?? null }))
      await Promise.all([
        syncFavoritesToCloud(user.id, favList),
        syncNotesToCloud(user.id, notes),
        syncReadProgressToCloud(user.id, readProgress),
      ])
      setUploadStatus('done')
    } catch {
      setUploadStatus('error')
    }
  }

  async function handleDownload() {
    if (!user) return
    setDownloadStatus('syncing')
    try {
      const [remoteFavs, remoteNotes, remoteProgress] = await Promise.all([
        fetchFavoritesFromCloud(user.id),
        fetchNotesFromCloud(user.id),
        fetchReadProgressFromCloud(user.id),
      ])
      if (remoteFavs) {
        for (const { id } of remoteFavs) {
          if (!favoriteIds.includes(id)) toggleFavorite(id)
        }
      }
      if (remoteNotes) {
        for (const [topicId, text] of Object.entries(remoteNotes)) setNote(topicId, text)
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

  // ── Not configured ─────────────────────────────────────────────────────────

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-md px-4 pb-24 pt-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Warning weight="light" size={32} className="text-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Cloud Sync Not Configured</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Add your Supabase credentials to <code className="rounded bg-muted px-1">.env.local</code> to enable account features.
          </p>
          <div className="mt-4 rounded-xl bg-muted p-3 text-left text-xs font-mono text-muted-foreground space-y-1">
            <p>NEXT_PUBLIC_SUPABASE_URL=https://…supabase.co</p>
            <p>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sbp_…</p>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Find these in your Supabase dashboard → Project Settings → API
          </p>
        </div>
      </div>
    )
  }

  // ── Signed in ──────────────────────────────────────────────────────────────

  if (user) {
    const name = (user.user_metadata?.display_name as string | undefined) ?? user.email ?? 'User'
    const readCount = Object.values(readProgress).filter((p) => p.isRead).length

    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-md px-4 pb-24 pt-10">
          {/* Profile */}
          <div className="rounded-2xl bg-card border border-border p-5 shadow-sm text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <User weight="light" size={32} className="text-primary" />
            </div>
            <p className="font-semibold text-foreground">{name}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{user.email}</p>
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: 'Favorites', value: favoriteIds.length },
              { label: 'Notes', value: Object.keys(notes).length },
              { label: 'Read', value: readCount },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-card border border-border p-3 text-center shadow-sm">
                <p className="text-xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          {/* Sync */}
          <div className="mt-6 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cloud Sync
            </p>
            <button
              onClick={handleUpload}
              disabled={uploadStatus === 'syncing'}
              className="flex w-full items-center gap-3 rounded-2xl bg-card border border-border p-4 shadow-sm hover:shadow-md transition-shadow disabled:opacity-60"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                {uploadStatus === 'done' ? (
                  <CheckCircle weight="fill" size={20} className="text-green-500" />
                ) : (
                  <CloudArrowUp weight="light" size={20} className="text-primary" />
                )}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">Upload to Cloud</p>
                <p className="text-xs text-muted-foreground">
                  {uploadStatus === 'syncing' ? 'Uploading…' : uploadStatus === 'error' ? 'Error — try again' : 'Push favorites, notes & progress'}
                </p>
              </div>
            </button>

            <button
              onClick={handleDownload}
              disabled={downloadStatus === 'syncing'}
              className="flex w-full items-center gap-3 rounded-2xl bg-card border border-border p-4 shadow-sm hover:shadow-md transition-shadow disabled:opacity-60"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
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

  // ── Sign in / up ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 pb-24 pt-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <SignIn weight="light" size={32} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {mode === 'magic' ? 'Magic Link' : mode === 'signup' ? 'Create Account' : 'Sign In'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sync favorites, notes, and progress across all your devices.
          </p>
        </div>

        {/* OAuth */}
        <div className="space-y-2 mb-5">
          <button
            onClick={signInWithGoogle}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors shadow-sm"
          >
            <GoogleLogo weight="bold" size={18} />
            Continue with Google
          </button>
          <button
            onClick={signInWithApple}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors shadow-sm"
          >
            <AppleLogo weight="fill" size={18} />
            Continue with Apple
          </button>
        </div>

        {/* Divider */}
        <div className="relative mb-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-3 text-xs text-muted-foreground">or</span>
          </div>
        </div>

        {/* Magic link */}
        {mode === 'magic' ? (
          magicSent ? (
            <div className="rounded-2xl bg-primary/5 border border-primary/20 p-5 text-center">
              <EnvelopeSimple weight="light" size={32} className="mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium text-foreground">Check your email</p>
              <p className="mt-1 text-xs text-muted-foreground">
                We sent a sign-in link to <strong>{email}</strong>.
              </p>
              <button
                onClick={() => { setMagicSent(false); setMode('signin') }}
                className="mt-3 text-xs text-primary hover:underline"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl bg-card border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {authError && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  {authError}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {loading ? 'Sending…' : 'Send Magic Link'}
              </button>
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Use password instead
              </button>
            </form>
          )
        ) : (
          /* Email + password */
          <form onSubmit={handleEmailAuth} className="space-y-3">
            {mode === 'signup' && (
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name (optional)"
                className="w-full rounded-xl bg-card border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            )}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-xl bg-card border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min. 6 characters)"
              className="w-full rounded-xl bg-card border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {authError && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {authError}
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
        )}

        {/* Mode switchers */}
        <div className="mt-5 space-y-2 text-center">
          {mode !== 'magic' && (
            <button
              onClick={() => { setMode('magic'); setAuthError('') }}
              className="block w-full text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Sign in with magic link (no password)
            </button>
          )}
          {mode !== 'signup' && mode !== 'magic' && (
            <button
              onClick={() => { setMode('signup'); setAuthError('') }}
              className="block w-full text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Don&apos;t have an account? Sign up
            </button>
          )}
          {mode === 'signup' && (
            <button
              onClick={() => { setMode('signin'); setAuthError('') }}
              className="block w-full text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Already have an account? Sign in
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
