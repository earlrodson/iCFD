import { useCallback, useEffect, useState } from 'react'

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

export function useInstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(true) // true until we know otherwise
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    setInstalled(isStandalone())
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent))

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
      setInstalled(false)
    }
    const onInstalled = () => { setPrompt(null); setInstalled(true) }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const trigger = useCallback(async () => {
    if (!prompt) return 'ios'
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome !== 'dismissed') setInstalled(true)
    setPrompt(null)
    return outcome
  }, [prompt])

  // Show install UI when: not yet installed AND (native prompt exists OR iOS Safari)
  const showInstall = !installed && (!!prompt || isIOS)

  return { showInstall, isIOS, trigger }
}
