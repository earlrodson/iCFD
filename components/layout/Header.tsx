'use client'

import Link from 'next/link'
import Image from 'next/image'
import { List, ShareNetwork, DownloadSimple } from '@phosphor-icons/react'
import { useState } from 'react'
import { AppDrawer } from './AppDrawer'
import { useSiteConfig } from '@/lib/useSiteConfig'
import { useDrawerStore } from '@/store/useDrawerStore'
import { useInstallPrompt } from '@/lib/useInstallPrompt'

export function Header() {
  const { open, openDrawer, closeDrawer } = useDrawerStore()
  const { appShortName } = useSiteConfig()
  const { showInstall, isIOS, trigger } = useInstallPrompt()
  const [showIOSHelp, setShowIOSHelp] = useState(false)

  async function handleInstall() {
    const result = await trigger()
    if (result === 'ios') setShowIOSHelp((v) => !v)
    else setShowIOSHelp(false)
  }

  const InstallIcon = isIOS ? ShareNetwork : DownloadSimple

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md no-print">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt={appShortName}
              width={32}
              height={32}
              className="h-8 w-8 shrink-0"
              priority
            />
            <span className="flex flex-col leading-none">
              <span className="font-semibold text-foreground">{appShortName}</span>
              <span className="mt-0.5 text-[9px] font-medium tracking-wide text-muted-foreground">
                CATHOLIC FAITH DEFENDERS
              </span>
            </span>
          </Link>

          {/* Right slot */}
          <div className="flex items-center gap-2">
            {/* Install button — shown whenever app is installable */}
            {showInstall && (
              <div className="relative">
                <button
                  onClick={handleInstall}
                  aria-label="Install app"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <InstallIcon weight="light" size={20} />
                </button>
                {isIOS && showIOSHelp && (
                  <div className="absolute right-0 top-full mt-2 w-52 rounded-xl bg-card border border-border px-3 py-2.5 text-xs leading-5 text-muted-foreground shadow-lg z-50">
                    Tap <ShareNetwork weight="bold" size={11} className="inline mx-0.5" /> Share,
                    then <strong className="text-foreground">Add to Home Screen</strong>.
                  </div>
                )}
              </div>
            )}

            {/* Hamburger — desktop only (mobile uses bottom nav Menu tab) */}
            <button
              onClick={openDrawer}
              className="hidden md:flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Open menu"
            >
              <List weight="light" size={22} />
            </button>
          </div>
        </div>
      </header>

      <AppDrawer open={open} onClose={closeDrawer} />
    </>
  )
}
