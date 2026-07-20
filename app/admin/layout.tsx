'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Lock, List, X } from '@phosphor-icons/react'
import { getUser } from '@/lib/supabase/auth'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { RoleContext, type AdminRole } from './role-context'

// Tabs visible to each role
const ADMIN_TABS = [
  { label: 'Config',       href: '/admin',              roles: ['admin'] },
  { label: 'Topics',       href: '/admin/topics',        roles: ['admin', 'editor'] },
  { label: 'Translations', href: '/admin/translations',  roles: ['admin', 'editor'] },
  { label: 'Submissions',  href: '/admin/submissions',   roles: ['admin', 'editor'] },
  { label: 'Paths',        href: '/admin/paths',         roles: ['admin'] },
  { label: 'References',   href: '/admin/references',    roles: ['admin'] },
  { label: 'Analytics',    href: '/admin/analytics',     roles: ['admin'] },
  { label: 'Users',        href: '/admin/users',         roles: ['admin'] },
] as const

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'denied' | 'ok'>('loading')
  const [role, setRole]     = useState<AdminRole>('editor')
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    async function check() {
      const u = await getUser()
      if (!u || !isSupabaseConfigured()) { setStatus('denied'); return }
      const { data } = await createClient()
        .from('admins')
        .select('user_id, role')
        .eq('user_id', u.id)
        .maybeSingle()
      if (!data) { setStatus('denied'); return }
      setRole((data.role as AdminRole) ?? 'editor')
      setStatus('ok')
    }
    check()
  }, [])

  useEffect(() => { setMenuOpen(false) }, [pathname])

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (status === 'denied') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <Lock weight="light" size={40} className="text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Admin access required.</p>
        <Link href="/" className="text-xs text-primary hover:underline">Go home</Link>
      </div>
    )
  }

  const visibleTabs = ADMIN_TABS.filter((t) => (t.roles as readonly string[]).includes(role))

  return (
    <RoleContext.Provider value={role}>
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card sticky top-0 z-30">
          <div className="mx-auto max-w-5xl px-4">
            {/* Desktop: scrollable tab row */}
            <div className="hidden sm:flex gap-1 overflow-x-auto no-scrollbar">
              {visibleTabs.map((tab) => {
                const active = tab.href === '/admin'
                  ? pathname === '/admin'
                  : pathname.startsWith(tab.href)
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={cn(
                      'shrink-0 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                      active
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {tab.label}
                  </Link>
                )
              })}
            </div>

            {/* Mobile: active label + hamburger */}
            <div className="flex sm:hidden items-center justify-between py-3">
              <span className="text-sm font-semibold text-foreground">
                {visibleTabs.find((t) =>
                  t.href === '/admin' ? pathname === '/admin' : pathname.startsWith(t.href)
                )?.label ?? 'Admin'}
              </span>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Toggle menu"
              >
                {menuOpen ? <X weight="light" size={20} /> : <List weight="light" size={20} />}
              </button>
            </div>

            {/* Mobile dropdown */}
            {menuOpen && (
              <div className="sm:hidden border-t border-border pb-2">
                {visibleTabs.map((tab) => {
                  const active = tab.href === '/admin'
                    ? pathname === '/admin'
                    : pathname.startsWith(tab.href)
                  return (
                    <Link
                      key={tab.href}
                      href={tab.href}
                      className={cn(
                        'block px-2 py-2.5 text-sm font-medium rounded-xl transition-colors',
                        active
                          ? 'text-primary bg-primary/8'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                      )}
                    >
                      {tab.label}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        {children}
      </div>
    </RoleContext.Provider>
  )
}
