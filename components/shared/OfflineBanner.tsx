'use client'

import { useState, useEffect } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { WifiOff, RefreshCw, CheckCircle } from 'lucide-react'
import { useAppStore, useOfflineStatus, useSyncStatus } from '@/store/useAppStore'
import { cn } from '@/lib/utils'

interface OfflineBannerProps {
  className?: string
  showSyncStatus?: boolean
  dismissible?: boolean
}

export function OfflineBanner({
  className,
  showSyncStatus = true,
  dismissible = true
}: OfflineBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [lastRetry, setLastRetry] = useState<Date | null>(null)

  const offline = useOfflineStatus()
  const syncStatus = useSyncStatus()
  const { setOfflineStatus } = useAppStore()

  // Monitor connection status
  useEffect(() => {
    const handleOnline = () => {
      setOfflineStatus(false)
      setRetryCount(0)
      setLastRetry(null)
    }

    const handleOffline = () => {
      setOfflineStatus(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Set initial status
    setOfflineStatus(!navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOfflineStatus])

  // Auto-dismiss when coming back online
  useEffect(() => {
    if (!offline && dismissed) {
      setDismissed(false)
    }
  }, [offline, dismissed])

  if (dismissed || !offline) {
    return null
  }

  const handleRetry = async () => {
    setRetryCount(prev => prev + 1)
    setLastRetry(new Date())

    try {
      // Simulate a connection check
      const response = await fetch('/data/content/en/metadata.json', {
        method: 'HEAD',
        cache: 'no-cache'
      })

      if (response.ok) {
        setOfflineStatus(false)
        setRetryCount(0)
        setLastRetry(null)
      }
    } catch (error) {
      console.error('Connection check failed:', error)
      // Still offline after retry
    }
  }

  const getRetryText = () => {
    if (!lastRetry) return 'Try again'

    const seconds = Math.floor((Date.now() - lastRetry.getTime()) / 1000)
    if (seconds < 10) return 'Retrying...'

    return `Retry (${retryCount})`
  }

  return (
    <div className={cn("fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-auto md:max-w-md", className)}>
      <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
        <WifiOff className="h-4 w-4 text-orange-600" />
        <AlertTitle className="text-orange-800 dark:text-orange-200">
          Offline Mode
        </AlertTitle>
        <AlertDescription className="text-orange-700 dark:text-orange-300">
          <div className="space-y-2">
            <p>
              You're currently offline. Some features may be limited, but you can still browse cached content.
            </p>

            {showSyncStatus && (
              <div className="flex items-center space-x-2 text-xs">
                <Badge variant="outline" className="text-orange-600 border-orange-300">
                  {syncStatus === 'idle' && 'Sync idle'}
                  {syncStatus === 'syncing' && 'Syncing...'}
                  {syncStatus === 'synced' && (
                    <>
                      <CheckCircle className="h-3 w-3" />
                      Synced
                    </>
                  )}
                  {syncStatus === 'error' && 'Sync error'}
                </Badge>
              </div>
            )}

            <div className="flex items-center space-x-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={handleRetry}
                disabled={lastRetry && Date.now() - lastRetry.getTime() < 10000}
                className="text-orange-700 border-orange-300 hover:bg-orange-100 dark:text-orange-300 dark:border-orange-700 dark:hover:bg-orange-900/20"
              >
                <RefreshCw className={cn(
                  "h-3 w-3 mr-1",
                  lastRetry && Date.now() - lastRetry.getTime() < 10000 && "animate-spin"
                )} />
                {getRetryText()}
              </Button>

              {dismissible && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDismissed(true)}
                  className="text-orange-700 hover:bg-orange-100 dark:text-orange-300 dark:hover:bg-orange-900/20"
                >
                  Dismiss
                </Button>
              )}
            </div>

            {retryCount > 0 && (
              <p className="text-xs text-orange-600 dark:text-orange-400">
                Attempted {retryCount} {retryCount === 1 ? 'time' : 'times'}
                {lastRetry && ` ${Math.floor((Date.now() - lastRetry.getTime()) / 1000)}s ago`}
              </p>
            )}
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}

// Compact version for mobile
export function CompactOfflineBanner({ className }: { className?: string }) {
  const offline = useOfflineStatus()
  const { setOfflineStatus } = useAppStore()

  useEffect(() => {
    const handleOnline = () => setOfflineStatus(false)
    const handleOffline = () => setOfflineStatus(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    setOfflineStatus(!navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOfflineStatus])

  if (!offline) return null

  return (
    <div className={cn("fixed top-14 left-0 right-0 z-40 bg-orange-500 text-white px-4 py-2 text-sm text-center", className)}>
      <div className="flex items-center justify-center space-x-2">
        <WifiOff className="h-4 w-4" />
        <span>You're offline. Some features may be limited.</span>
      </div>
    </div>
  )
}

// Connection status indicator component
export function ConnectionStatus({ className }: { className?: string }) {
  const offline = useOfflineStatus()

  return (
    <div className={cn("flex items-center space-x-2 text-sm", className)}>
      <div className={cn(
        "w-2 h-2 rounded-full",
        offline ? "bg-red-500" : "bg-green-500"
      )} />
      <span className={offline ? "text-red-500" : "text-green-500"}>
        {offline ? "Offline" : "Online"}
      </span>
    </div>
  )
}