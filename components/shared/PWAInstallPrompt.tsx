'use client'

import { useState, useEffect } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { X, Download, Smartphone, Monitor } from 'lucide-react'
import { usePWAInstall } from '@/app/pwa'
import { cn } from '@/lib/utils'

interface PWAInstallPromptProps {
  className?: string
  showDelay?: number // Delay in milliseconds before showing the prompt
  dismissible?: boolean
  showIcon?: boolean
}

export function PWAInstallPrompt({
  className,
  showDelay = 3000,
  dismissible = true,
  showIcon = true
}: PWAInstallPromptProps) {
  const { isInstallable, isInstalled, install } = usePWAInstall()
  const [dismissed, setDismissed] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [installing, setInstalling] = useState(false)

  // Check if we should show the prompt
  useEffect(() => {
    if (isInstalled || !isInstallable || dismissed) {
      setShowPrompt(false)
      return
    }

    // Wait before showing the prompt
    const timer = setTimeout(() => {
      setShowPrompt(true)
    }, showDelay)

    return () => clearTimeout(timer)
  }, [isInstallable, isInstalled, dismissed, showDelay])

  const handleInstall = async () => {
    setInstalling(true)
    try {
      const success = await install()
      if (success) {
        setShowPrompt(false)
        setDismissed(true)
      }
    } catch (error) {
      console.error('PWA installation failed:', error)
    } finally {
      setInstalling(false)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    setShowPrompt(false)
  }

  // Don't show if not installable, already installed, or dismissed
  if (!showPrompt || isInstalled || dismissed) {
    return null
  }

  return (
    <div className={cn("fixed top-4 right-4 left-4 z-50 md:left-auto md:right-4 md:w-auto md:max-w-md", className)}>
      <Alert className="border-catholic-blue/50 bg-catholic-blue/10 dark:bg-catholic-blue/5 dark:border-catholic-blue">
        {showIcon && (
          <Download className="h-4 w-4 text-catholic-blue" />
        )}
        <AlertTitle className="text-catholic-blue flex items-center space-x-2">
          <span>Install Catholic Faith Defender</span>
          <div className="flex space-x-1">
            <Smartphone className="h-3 w-3" />
            <Monitor className="h-3 w-3" />
          </div>
        </AlertTitle>
        <AlertDescription className="text-catholic-blue/90 dark:text-catholic-blue/80">
          <div className="space-y-3">
            <p className="text-sm">
              Install our app to your device for quick access, offline reading, and a better experience!
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleInstall}
                disabled={installing}
                className="flex-1 bg-catholic-blue hover:bg-catholic-blue/90 text-white"
                size="sm"
              >
                {installing ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Installing...
                  </>
                ) : (
                  <>
                    <Download className="h-3 w-3 mr-2" />
                    Install App
                  </>
                )}
              </Button>

              {dismissible && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="text-catholic-blue hover:bg-catholic-blue/10"
                >
                  <X className="h-3 w-3 mr-1" />
                  Not now
                </Button>
              )}
            </div>

            <div className="text-xs text-catholic-blue/70 dark:text-catholic-blue/60">
              <p>• Works offline • No permissions required • Free forever</p>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}

// Floating install button for desktop
export function FloatingInstallButton({ className }: { className?: string }) {
  const { isInstallable, isInstalled, install } = usePWAInstall()
  const [installing, setInstalling] = useState(false)

  if (!isInstallable || isInstalled) {
    return null
  }

  const handleInstall = async () => {
    setInstalling(true)
    try {
      await install()
    } catch (error) {
      console.error('PWA installation failed:', error)
    } finally {
      setInstalling(false)
    }
  }

  return (
    <Button
      onClick={handleInstall}
      disabled={installing}
      className={cn(
        "fixed bottom-20 right-4 z-40 bg-catholic-blue hover:bg-catholic-blue/90 text-white rounded-full shadow-lg",
        className
      )}
      size="sm"
    >
      {installing ? (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <>
          <Download className="h-4 w-4" />
          <span className="ml-2 hidden sm:inline">Install</span>
        </>
      )}
    </Button>
  )
}

// Install instructions modal
export function InstallInstructions({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">How to Install</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">On Chrome (Desktop)</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Click the install icon in the address bar</li>
              <li>Click "Install" in the dialog</li>
              <li>Launch from your applications</li>
            </ol>
          </div>

          <div>
            <h4 className="font-medium mb-2">On Safari (iOS)</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Tap the Share button</li>
              <li>Scroll down and tap "Add to Home Screen"</li>
              <li>Tap "Add" to confirm</li>
            </ol>
          </div>

          <div>
            <h4 className="font-medium mb-2">On Chrome (Android)</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Tap the menu (three dots)</li>
              <li>Tap "Add to Home screen"</li>
              <li>Tap "Add" to confirm</li>
            </ol>
          </div>
        </div>

        <Button onClick={onClose} className="w-full mt-6">
          Got it
        </Button>
      </div>
    </div>
  )
}

// App install banner for the top of the page
export function AppInstallBanner({ className }: { className?: string }) {
  const { isInstallable, isInstalled, install } = usePWAInstall()
  const [dismissed, setDismissed] = useState(false)
  const [installing, setInstalling] = useState(false)

  if (!isInstallable || isInstalled || dismissed) {
    return null
  }

  const handleInstall = async () => {
    setInstalling(true)
    try {
      await install()
    } catch (error) {
      console.error('PWA installation failed:', error)
    } finally {
      setInstalling(false)
    }
  }

  return (
    <div className={cn("bg-catholic-blue text-white px-4 py-2 text-center", className)}>
      <div className="flex items-center justify-center space-x-4 text-sm">
        <span>Install Catholic Faith Defender for offline access and a better experience!</span>
        <Button
          onClick={handleInstall}
          disabled={installing}
          variant="secondary"
          size="sm"
          className="bg-white text-catholic-blue hover:bg-gray-100"
        >
          {installing ? (
            <>
              <div className="w-3 h-3 border-2 border-catholic-blue/30 border-t-catholic-blue rounded-full animate-spin mr-2" />
              Installing...
            </>
          ) : (
            <>
              <Download className="h-3 w-3 mr-1" />
              Install
            </>
          )}
        </Button>
        <Button
          onClick={() => setDismissed(true)}
          variant="ghost"
          size="sm"
          className="text-white/80 hover:text-white hover:bg-white/10"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}