'use client'

import { useEffect, useState } from 'react'
import { DownloadSimple, ShareNetwork } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

export function InstallAppButton({ className }: { className?: string }) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(true)
  const [showIOSHelp, setShowIOSHelp] = useState(false)
  const [isiOSDevice, setIsIOSDevice] = useState(false)

  useEffect(() => {
    setInstalled(isStandalone())
    setIsIOSDevice(isIOS())

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
      setInstalled(false)
    }

    const handleAppInstalled = () => {
      setInstallPrompt(null)
      setInstalled(true)
      setShowIOSHelp(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  async function handleInstall() {
    if (installPrompt) {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      if (choice.outcome !== 'dismissed') setInstalled(true)
      setInstallPrompt(null)
      return
    }

    if (isiOSDevice) setShowIOSHelp((value) => !value)
  }

  if (installed || (!installPrompt && !isiOSDevice)) return null

  return (
    <div className={cn('space-y-2', className)}>
      <button
        type="button"
        onClick={handleInstall}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-foreground hover:bg-muted transition-colors"
      >
        <span className="text-muted-foreground">
          {isiOSDevice && !installPrompt ? (
            <ShareNetwork weight="light" size={20} />
          ) : (
            <DownloadSimple weight="light" size={20} />
          )}
        </span>
        Install App
      </button>

      {isiOSDevice && showIOSHelp && !installPrompt && (
        <div className="rounded-xl bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground">
          Tap Share, then Add to Home Screen.
        </div>
      )}
    </div>
  )
}
