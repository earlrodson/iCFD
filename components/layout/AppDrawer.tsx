'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { X, Gear, PaperPlaneTilt, ShieldCheck, User, Ladder, Books } from '@phosphor-icons/react'
import { getUser, onAuthStateChange, signOut } from '@/lib/supabase/auth'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { User as SupabaseUser } from '@/lib/supabase/auth'

interface AppDrawerProps {
  open: boolean
  onClose: () => void
}

export function AppDrawer({ open, onClose }: AppDrawerProps) {
  const [user, setUser]       = useState<SupabaseUser | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    getUser().then(async (u) => { setUser(u); if (u) checkAdmin(u.id) })
    return onAuthStateChange(async (u) => {
      setUser(u)
      if (u) checkAdmin(u.id)
      else setIsAdmin(false)
    })
  }, [])

  async function checkAdmin(userId: string) {
    const { data } = await createClient()
      .from('admins').select('user_id').eq('user_id', userId).maybeSingle()
    setIsAdmin(!!data)
  }

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ?? user?.email?.split('@')[0] ?? ''

  async function handleSignOut() {
    await signOut()
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="App menu"
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-72 max-w-[85vw] flex-col bg-card shadow-2xl transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Close */}
        <div className="flex justify-end px-4 pt-4">
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close menu"
          >
            <X weight="light" size={18} />
          </button>
        </div>

        {/* Profile */}
        <div className="px-5 pt-2 pb-5 border-b border-border">
          {user ? (
            <>
              <Link
                href="/account"
                onClick={onClose}
                className="flex items-center gap-3 rounded-2xl hover:bg-muted px-2 py-2 -mx-2 transition-colors"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <User weight="light" size={24} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
              </Link>
              <button
                onClick={handleSignOut}
                className="mt-2 ml-14 text-xs text-rose-500 hover:text-rose-600 transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/account"
              onClick={onClose}
              className="flex items-center gap-3 rounded-2xl hover:bg-muted px-2 py-2 -mx-2 transition-colors"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">
                <User weight="light" size={24} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Sign in</p>
                <p className="text-xs text-muted-foreground">Sync across devices</p>
              </div>
            </Link>
          )}
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {user && (
            <NavItem href="/library" icon={<Books weight="light" size={20} />} onClick={onClose}>
              Library
            </NavItem>
          )}
          <NavItem href="/settings" icon={<Gear weight="light" size={20} />} onClick={onClose}>
            General Settings
          </NavItem>
          {user && (
            <NavItem href="/paths" icon={<Ladder weight="light" size={20} />} onClick={onClose}>
              Learning Paths
            </NavItem>
          )}
          <NavItem href="/submit" icon={<PaperPlaneTilt weight="light" size={20} />} onClick={onClose}>
            Contribute a Topic
          </NavItem>
          {isAdmin && (
            <NavItem href="/admin" icon={<ShieldCheck weight="light" size={20} />} onClick={onClose}>
              Admin Panel
            </NavItem>
          )}
        </nav>
      </div>
    </>
  )
}

function NavItem({
  href, icon, onClick, children,
}: {
  href: string
  icon: React.ReactNode
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
    >
      <span className="text-muted-foreground">{icon}</span>
      {children}
    </Link>
  )
}
