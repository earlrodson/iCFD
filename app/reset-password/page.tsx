'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LockKey, CheckCircle, Warning } from '@phosphor-icons/react'
import { updatePassword } from '@/lib/supabase/auth'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  // The emailed link carries a recovery code; @supabase/ssr's browser client
  // exchanges it for a session automatically and fires PASSWORD_RECOVERY.
  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const { data: { subscription } } = createClient().auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    createClient().auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const { error } = await updatePassword(password)
      if (error) setError(error.message)
      else setDone(true)
    } finally {
      setLoading(false)
    }
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-md px-4 pt-10 text-center">
          <Warning weight="light" size={32} className="mx-auto mb-2 text-amber-500" />
          <p className="text-sm text-muted-foreground">Cloud sync is not configured.</p>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-md px-4 pt-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle weight="light" size={32} className="text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Password Updated</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your password has been changed.</p>
          <button
            onClick={() => router.push('/account')}
            className="mt-5 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Go to Account
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 pt-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <LockKey weight="light" size={32} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Set a New Password</h1>
        </div>

        {!ready ? (
          <p className="text-center text-sm text-muted-foreground">
            Verifying your reset link…
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <label htmlFor="new-password" className="sr-only">New password</label>
            <input
              id="new-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (min. 6 characters)"
              className="w-full rounded-xl bg-card border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <label htmlFor="confirm-password" className="sr-only">Confirm new password</label>
            <input
              id="confirm-password"
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full rounded-xl bg-card border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
            />
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
              {loading ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
