'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { X, Gear, PaperPlaneTilt, ShieldCheck, User, Ladder, Books, Heart, HandHeart, ClockCounterClockwise } from '@phosphor-icons/react'
import { getUser, onAuthStateChange, signOut } from '@/lib/supabase/auth'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { useFavoritesStore } from '@/store/useFavoritesStore'
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
  const { favoriteIds } = useFavoritesStore()
  const favCount = favoriteIds.length

  async function checkAdmin(userId: string) {
    const { data } = await createClient()
      .from('admins').select('user_id').eq('user_id', userId).maybeSingle()
    setIsAdmin(!!data)
  }

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    getUser().then(async (u) => { setUser(u); if (u) checkAdmin(u.id) })
    return onAuthStateChange(async (u) => {
      setUser(u)
      if (u) checkAdmin(u.id)
      else setIsAdmin(false)
    })
  }, [])

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
          'fixed right-0 top-0 z-50 flex h-full w-72 max-w-[85vw] flex-col bg-[var(--cfd-navy)] shadow-2xl transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Close */}
        <div className="flex justify-end px-4 pt-4">
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Close menu"
          >
            <X weight="light" size={18} />
          </button>
        </div>

        {/* Profile */}
        <div className="px-5 pt-2 pb-5 border-b border-white/15">
          {user ? (
            <>
              <Link
                href="/account"
                onClick={onClose}
                className="flex items-center gap-3 rounded-2xl hover:bg-white/10 px-2 py-2 -mx-2 transition-colors"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <User weight="light" size={24} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                  <p className="truncate text-xs text-white/65">{user.email}</p>
                </div>
              </Link>
              <button
                onClick={handleSignOut}
                className="mt-2 ml-14 text-xs text-rose-300 hover:text-rose-200 transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/account"
              onClick={onClose}
              className="flex items-center gap-3 rounded-2xl hover:bg-white/10 px-2 py-2 -mx-2 transition-colors"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15">
                <User weight="light" size={24} className="text-white/70" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Sign in</p>
                <p className="text-xs text-white/65">Sync across devices</p>
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
          {user && (
            <NavItem href="/paths" icon={<Ladder weight="light" size={20} />} onClick={onClose}>
              Learning Paths
            </NavItem>
          )}
          {user && (
            <NavItem
              href="/favorites"
              icon={<Heart weight="light" size={20} />}
              badge={favCount > 0 ? (favCount > 99 ? '99+' : String(favCount)) : undefined}
              onClick={onClose}
            >
              Favorites
            </NavItem>
          )}

          {user && <hr className="my-2 border-white/15" />}

          <NavItem href="/settings" icon={<Gear weight="light" size={20} />} onClick={onClose}>
            General Settings
          </NavItem>
          <NavItem href="/submit" icon={<PaperPlaneTilt weight="light" size={20} />} onClick={onClose}>
            Contribute a Topic
          </NavItem>
          <NavItem href="/history" icon={<ClockCounterClockwise weight="light" size={20} />} onClick={onClose}>
            Our History
          </NavItem>
          <NavItem href="/dedication" icon={<HandHeart weight="light" size={20} />} onClick={onClose}>
            Dedication &amp; Acknowledgments
          </NavItem>
          {isAdmin && (
            <>
              <hr className="my-2 border-white/15" />
              <NavItem href="/admin" icon={<ShieldCheck weight="light" size={20} />} onClick={onClose}>
                Admin Panel
              </NavItem>
            </>
          )}
        </nav>
      </div>
    </>
  )
}

function NavItem({
  href, icon, badge, onClick, children,
}: {
  href: string
  icon: React.ReactNode
  badge?: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors"
    >
      <span className="text-white/70">{icon}</span>
      <span className="flex-1">{children}</span>
      {badge && (
        <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground leading-none">
          {badge}
        </span>
      )}
    </Link>
  )
}
