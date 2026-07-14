'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { MobileNav } from '@/components/shared/MobileNav'
import { FontSizeController } from '@/components/shared/FontSizeController'
import { useAuthStore } from '@/store/useAuthStore'

const OfflineBanner = dynamic(
  () => import('@/components/shared/OfflineBanner').then(m => m.OfflineBanner),
  { ssr: false }
)

const PWAInstallPrompt = dynamic(
  () => import('@/components/shared/PWAInstallPrompt').then(m => m.PWAInstallPrompt),
  { ssr: false }
)

export function ClientOverlays() {
  const initialize = useAuthStore(s => s.initialize)

  useEffect(() => {
    const unsubscribe = initialize()
    return unsubscribe
  }, [initialize])

  return (
    <>
      <OfflineBanner />
      <PWAInstallPrompt />
      <MobileNav />
      <FontSizeController />
    </>
  )
}
