'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { syncAll } from '@/lib/supabase/sync'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { LogOut, Mail, CheckCircle2, User, RefreshCw } from 'lucide-react'

interface AuthModalProps {
  open: boolean
  onClose: () => void
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const { user, loading, error, signInWithMagicLink, signOut, clearError } = useAuthStore()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncDone, setSyncDone] = useState(false)
  const didAutoSync = useRef(false)

  // Auto-sync once when modal opens while logged in
  useEffect(() => {
    if (user && open && !didAutoSync.current) {
      didAutoSync.current = true
      setSyncing(true)
      syncAll(user.id).finally(() => {
        setSyncing(false)
        setSyncDone(true)
      })
    }
    if (!open) {
      didAutoSync.current = false
      setSyncDone(false)
    }
  }, [user, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    clearError()
    await signInWithMagicLink(email.trim())
    if (!useAuthStore.getState().error) setSent(true)
  }

  const handleSignOut = async () => {
    await signOut()
    onClose()
  }

  const handleManualSync = async () => {
    if (!user) return
    setSyncing(true)
    setSyncDone(false)
    await syncAll(user.id)
    setSyncing(false)
    setSyncDone(true)
  }

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{user ? 'Your Account' : 'Sign In'}</DialogTitle>
          <DialogDescription>
            {user
              ? 'Your favorites, notes, and reading progress sync across devices.'
              : 'Enter your email to receive a sign-in link. No password needed.'}
          </DialogDescription>
        </DialogHeader>

        {user ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.email}</p>
                <p className="text-xs text-muted-foreground">
                  {syncDone ? 'Synced just now' : syncing ? 'Syncing…' : 'Signed in'}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleManualSync}
              disabled={syncing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing…' : 'Sync now'}
            </Button>

            <Button
              variant="ghost"
              className="w-full text-destructive hover:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>
        ) : sent ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="font-medium">Check your email</p>
            <p className="text-sm text-muted-foreground">
              We sent a sign-in link to{' '}
              <strong className="text-foreground">{email}</strong>.
              Click it to sign in — no password needed.
            </p>
            <Button variant="ghost" size="sm" onClick={() => { setSent(false); clearError() }}>
              Use a different email
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
              autoFocus
              required
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading || !email.trim()}>
              <Mail className="h-4 w-4 mr-2" />
              {loading ? 'Sending…' : 'Send magic link'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
