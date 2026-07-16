'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Lock } from '@phosphor-icons/react'
import { getUser } from '@/lib/supabase/auth'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const TABS = [
  { label: 'Config', href: '/admin' },
  { label: 'Topics', href: '/admin/topics' },
  { label: 'Translations', href: '/admin/translations' },
  { label: 'Submissions', href: '/admin/submissions' },
  { label: 'Paths', href: '/admin/paths' },
  { label: 'References', href: '/admin/references' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'denied' | 'ok'>('loading')
  const pathname = usePathname()

  useEffect(() => {
    async function check() {
      const u = await getUser()
      if (!u || !isSupabaseConfigured()) { setStatus('denied'); return }
      const { data } = await createClient()
        .from('admins').select('user_id').eq('user_id', u.id).maybeSingle()
      setStatus(data ? 'ok' : 'denied')
    }
    check()
  }, [])

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

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex gap-1">
            {TABS.map((tab) => {
              const active = tab.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(tab.href)
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    'px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
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
        </div>
      </div>
      {children}
    </div>
  )
}
