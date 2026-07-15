'use client'

import Link from 'next/link'
import { List } from '@phosphor-icons/react'
import { useState } from 'react'
import { AppDrawer } from './AppDrawer'
import { useSiteConfig } from '@/lib/useSiteConfig'

export function Header() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { appName, appShortName } = useSiteConfig()

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md no-print">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
              {appShortName}
            </div>
            <span className="font-semibold text-foreground">
              {appName}
            </span>
          </Link>

          {/* Hamburger */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Open menu"
          >
            <List weight="light" size={22} />
          </button>
        </div>
      </header>

      <AppDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  )
}
