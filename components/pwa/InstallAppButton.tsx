'use client'

import { useState } from 'react'
import { DownloadSimple, ShareNetwork } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useInstallPrompt } from '@/lib/useInstallPrompt'

interface InstallAppButtonProps {
  className?: string
  /** compact = icon-only button for the header */
  variant?: 'default' | 'compact'
}

export function InstallAppButton({ className, variant = 'default' }: InstallAppButtonProps) {
  const { showInstall, isIOS, trigger } = useInstallPrompt()
  const [showIOSHelp, setShowIOSHelp] = useState(false)

  if (!showInstall) return null

  const Icon = isIOS ? ShareNetwork : DownloadSimple

  async function handleInstall() {
    const result = await trigger()
    if (result === 'ios') setShowIOSHelp((v) => !v)
    else setShowIOSHelp(false)
  }

  if (variant === 'compact') {
    return (
      <div className={cn('relative', className)}>
        <button
          type="button"
          onClick={handleInstall}
          aria-label="Install app"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Icon weight="light" size={20} />
        </button>

        {/* iOS tip — drops below header button */}
        {showIOSHelp && (
          <div className="absolute right-0 top-full mt-2 w-52 rounded-xl bg-card border border-border px-3 py-2.5 text-xs leading-5 text-muted-foreground shadow-lg z-50">
            Tap <ShareNetwork weight="bold" size={11} className="inline mx-0.5" /> Share,
            then <strong className="text-foreground">Add to Home Screen</strong>.
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <button
        type="button"
        onClick={handleInstall}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-foreground hover:bg-muted transition-colors"
      >
        <span className="text-muted-foreground">
          <Icon weight="light" size={20} />
        </span>
        Install App
      </button>

      {isIOS && showIOSHelp && (
        <div className="rounded-xl bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground">
          Tap Share, then Add to Home Screen.
        </div>
      )}
    </div>
  )
}
