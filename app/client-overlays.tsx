'use client'

import dynamic from 'next/dynamic'

const OfflineBanner = dynamic(
  () => import('@/components/shared/OfflineBanner').then(m => m.OfflineBanner),
  { ssr: false }
)

const PWAInstallPrompt = dynamic(
  () => import('@/components/shared/PWAInstallPrompt').then(m => m.PWAInstallPrompt),
  { ssr: false }
)

export function ClientOverlays() {
  return (
    <>
      <OfflineBanner />
      <PWAInstallPrompt />
    </>
  )
}
