'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  X, Sun, Moon, Globe, User, SignOut, PaperPlaneTilt,
  ShieldCheck, CloudArrowUp,
} from '@phosphor-icons/react'
import { useAppStore } from '@/store/useAppStore'
import { useSearchStore } from '@/store/useSearchStore'
import { getUser, onAuthStateChange, signOut } from '@/lib/supabase/auth'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Language } from '@/data/schema/topic.schema'
import type { FontSize } from '@/store/useAppStore'
import type { User as SupabaseUser } from '@/lib/supabase/auth'

interface AppDrawerProps {
  open: boolean
  onClose: () => void
}

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'en',  label: 'English' },
  { value: 'tl',  label: 'Tagalog' },
  { value: 'ceb', label: 'Cebuano' },
]

const FONT_SIZES: { value: FontSize; label: string }[] = [
  { value: 'small',  label: 'A−' },
  { value: 'medium', label: 'A'  },
  { value: 'large',  label: 'A+' },
]

export function AppDrawer({ open, onClose }: AppDrawerProps) {
  const { currentLanguage, setLanguage, fontSize, setFontSize } = useAppStore()
  const { query, setQuery } = useSearchStore()
  const [isDark, setIsDark]   = useState(false)
  const [user, setUser]       = useState<SupabaseUser | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)

  // Sync dark mode state
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [open])

  // Apply font size
  useEffect(() => {
    const html = document.documentElement
    html.classList.remove('text-small', 'text-medium', 'text-large')
    html.classList.add(`text-${fontSize}`)
  }, [fontSize])

  // Auth state
  useEffect(() => {
    if (!isSupabaseConfigured()) return
    getUser().then(async (u) => {
      setUser(u)
      if (u) checkAdmin(u.id)
    })
    return onAuthStateChange(async (u) => {
      setUser(u)
      if (u) checkAdmin(u.id)
      else setIsAdmin(false)
    })
  }, [])

  async function checkAdmin(userId: string) {
    if (!isSupabaseConfigured()) return
    const { data } = await createClient()
      .from('admins').select('user_id').eq('user_id', userId).maybeSingle()
    setIsAdmin(!!data)
  }

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  function toggleDark() {
    const html = document.documentElement
    if (html.classList.contains('dark')) {
      html.classList.remove('dark')
      localStorage.setItem('theme', 'light')
      setIsDark(false)
    } else {
      html.classList.add('dark')
      localStorage.setItem('theme', 'dark')
      setIsDark(true)
    }
  }

  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ?? user?.email ?? ''

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

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="App menu"
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-80 max-w-[85vw] flex-col bg-card shadow-2xl transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <span className="font-semibold text-foreground">Menu</span>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close menu"
          >
            <X weight="light" size={18} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

          {/* Profile */}
          <div className="rounded-2xl border border-border bg-muted/40 p-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <User weight="light" size={22} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
            ) : (
              <Link
                href="/account"
                onClick={onClose}
                className="flex items-center gap-3 text-sm font-medium text-primary hover:underline"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <User weight="light" size={22} className="text-primary" />
                </div>
                Sign in / Create account
              </Link>
            )}
          </div>

          {/* Search */}
          <div>
            <p className={sectionLabel}>Search</p>
            <div className="relative flex items-center">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Topics, scripture, tags…"
                className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Language */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Globe weight="light" size={14} className="text-muted-foreground" />
              <p className={sectionLabel}>Language</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.value}
                  onClick={() => setLanguage(lang.value)}
                  className={cn(
                    'rounded-xl border py-2 text-xs font-medium transition-colors',
                    currentLanguage === lang.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-muted text-muted-foreground hover:text-foreground',
                  )}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Text size */}
          <div>
            <p className={sectionLabel}>Text Size</p>
            <div className="grid grid-cols-3 gap-2">
              {FONT_SIZES.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFontSize(f.value)}
                  className={cn(
                    'rounded-xl border py-2 text-sm font-semibold transition-colors',
                    fontSize === f.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-muted text-muted-foreground hover:text-foreground',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div>
            <p className={sectionLabel}>Theme</p>
            <button
              onClick={toggleDark}
              className="flex w-full items-center justify-between rounded-xl border border-border bg-muted px-4 py-2.5 transition-colors hover:bg-muted/70"
            >
              <span className="text-sm text-foreground">{isDark ? 'Dark mode' : 'Light mode'}</span>
              {isDark
                ? <Sun weight="light" size={18} className="text-muted-foreground" />
                : <Moon weight="light" size={18} className="text-muted-foreground" />
              }
            </button>
          </div>

          {/* Links */}
          <div>
            <p className={sectionLabel}>More</p>
            <div className="space-y-1">
              <DrawerLink href="/submit" icon={<PaperPlaneTilt weight="light" size={18} />} onClick={onClose}>
                Contribute a Topic
              </DrawerLink>
              {user && (
                <DrawerLink href="/account" icon={<CloudArrowUp weight="light" size={18} />} onClick={onClose}>
                  Cloud Sync
                </DrawerLink>
              )}
              {isAdmin && (
                <DrawerLink href="/admin" icon={<ShieldCheck weight="light" size={18} />} onClick={onClose}>
                  Admin Panel
                </DrawerLink>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer — sign out ── */}
        {user && (
          <div className="border-t border-border px-5 py-4">
            <button
              onClick={async () => { await signOut(); onClose() }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm text-muted-foreground hover:text-red-500 transition-colors"
            >
              <SignOut weight="light" size={16} />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────────

const sectionLabel = 'mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground'

function DrawerLink({
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
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
    >
      <span className="text-muted-foreground">{icon}</span>
      {children}
    </Link>
  )
}
