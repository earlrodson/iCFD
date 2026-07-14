'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/useAuthStore'
import { Shield, EnvelopeSimple, LockSimple, MagicWand, GoogleLogo, Eye, EyeSlash, CheckCircle } from '@phosphor-icons/react'

type Tab = 'magic' | 'password' | 'google'
type PasswordMode = 'signin' | 'signup'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/profile'

  const { user, loading, error, signInWithMagicLink, signInWithPassword, signUp, signInWithGoogle, clearError } = useAuthStore()

  const [tab, setTab] = useState<Tab>('magic')
  const [passwordMode, setPasswordMode] = useState<PasswordMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [magicSent, setMagicSent] = useState(false)
  const [signupDone, setSignupDone] = useState(false)

  // Redirect if already signed in
  useEffect(() => {
    if (user) router.replace(next)
  }, [user, router, next])

  const handleTabChange = (t: Tab) => {
    setTab(t)
    clearError()
    setMagicSent(false)
    setSignupDone(false)
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    await signInWithMagicLink(email.trim())
    if (!useAuthStore.getState().error) setMagicSent(true)
  }

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    if (passwordMode === 'signin') {
      await signInWithPassword(email.trim(), password)
    } else {
      await signUp(email.trim(), password, displayName.trim() || undefined)
      if (!useAuthStore.getState().error) setSignupDone(true)
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'magic', label: 'Magic Link' },
    { id: 'password', label: 'Email & Password' },
    { id: 'google', label: 'Google' },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="flex flex-col items-center mb-8">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Shield weight="light" className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-[22px] font-bold text-foreground">Catholic Faith Defender</h1>
        <p className="text-[14px] text-muted-foreground mt-1">Sign in to sync your progress across devices</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm rounded-2xl bg-card shadow-[0_2px_16px_rgba(0,0,0,0.08),0_0_1px_rgba(0,0,0,0.04)]">
        {/* Tabs */}
        <div className="flex border-b border-border">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className={`flex-1 py-3.5 text-[13px] font-medium transition-colors ${
                tab === t.id
                  ? 'text-primary border-b-2 border-primary -mb-px'
                  : 'text-muted-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* ── Magic Link ────────────────────────────────────────────────── */}
          {tab === 'magic' && (
            magicSent ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <CheckCircle weight="light" className="h-12 w-12 text-green-500" />
                <p className="font-semibold">Check your email</p>
                <p className="text-[13px] text-muted-foreground">
                  We sent a sign-in link to <strong className="text-foreground">{email}</strong>.
                  Click it to sign in — no password needed.
                </p>
                <Button variant="ghost" size="sm" onClick={() => { setMagicSent(false); clearError() }}>
                  Use a different email
                </Button>
              </div>
            ) : (
              <form onSubmit={handleMagicLink} className="space-y-4">
                <p className="text-[13px] text-muted-foreground">
                  Enter your email and we&apos;ll send you a one-click sign-in link. No password required.
                </p>
                <div className="relative">
                  <EnvelopeSimple weight="light" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="pl-9"
                    required
                    autoFocus
                    disabled={loading}
                  />
                </div>
                {error && <p className="text-[13px] text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading || !email.trim()}>
                  <MagicWand weight="light" className="h-4 w-4 mr-2" />
                  {loading ? 'Sending…' : 'Send magic link'}
                </Button>
              </form>
            )
          )}

          {/* ── Email + Password ──────────────────────────────────────────── */}
          {tab === 'password' && (
            signupDone ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <CheckCircle weight="light" className="h-12 w-12 text-green-500" />
                <p className="font-semibold">Account created!</p>
                <p className="text-[13px] text-muted-foreground">
                  Check your inbox to confirm your email, then sign in.
                </p>
                <Button variant="ghost" size="sm" onClick={() => { setSignupDone(false); setPasswordMode('signin') }}>
                  Go to sign in
                </Button>
              </div>
            ) : (
              <form onSubmit={handlePassword} className="space-y-4">
                {/* Signin / Signup toggle */}
                <div className="flex gap-1 p-1 bg-muted rounded-xl">
                  <button
                    type="button"
                    onClick={() => setPasswordMode('signin')}
                    className={`flex-1 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                      passwordMode === 'signin' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                    }`}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    onClick={() => setPasswordMode('signup')}
                    className={`flex-1 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                      passwordMode === 'signup' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                    }`}
                  >
                    Create account
                  </button>
                </div>

                {passwordMode === 'signup' && (
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Your name (optional)"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                )}

                <div className="relative">
                  <EnvelopeSimple weight="light" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="pl-9"
                    required
                    autoFocus
                    disabled={loading}
                  />
                </div>

                <div className="relative">
                  <LockSimple weight="light" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="pl-9 pr-10"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword
                      ? <EyeSlash weight="light" className="h-4 w-4" />
                      : <Eye weight="light" className="h-4 w-4" />
                    }
                  </button>
                </div>

                {error && <p className="text-[13px] text-destructive">{error}</p>}

                <Button type="submit" className="w-full" disabled={loading || !email.trim() || !password}>
                  {loading
                    ? 'Please wait…'
                    : passwordMode === 'signin' ? 'Sign in' : 'Create account'
                  }
                </Button>
              </form>
            )
          )}

          {/* ── Google OAuth ──────────────────────────────────────────────── */}
          {tab === 'google' && (
            <div className="space-y-4">
              <p className="text-[13px] text-muted-foreground">
                Sign in quickly using your Google account. No password needed.
              </p>
              {error && <p className="text-[13px] text-destructive">{error}</p>}
              <Button
                variant="outline"
                className="w-full"
                onClick={signInWithGoogle}
                disabled={loading}
              >
                <GoogleLogo weight="bold" className="h-4 w-4 mr-2" />
                {loading ? 'Redirecting…' : 'Continue with Google'}
              </Button>
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 text-[12px] text-muted-foreground text-center">
        By signing in you agree to our{' '}
        <Link href="/" className="text-primary">terms of use</Link>.
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
