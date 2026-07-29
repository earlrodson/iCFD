import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { Suspense } from 'react'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { MobileNav } from '@/components/layout/MobileNav'
import { OfflineBanner } from '@/components/ui/OfflineBanner'
import { NavigationProgress } from '@/components/ui/NavigationProgress'
import { SyncManager } from '@/components/SyncManager'
import { PageTracker } from '@/components/analytics/PageTracker'
import { APP_CONFIG } from '@/lib/config'

const SITE_TITLE = 'Codex Defensoris'
const SITE_DESCRIPTION =
  'Offline-first Catholic apologetics app with Scripture, Tradition, and Catechism references in English, Tagalog, and Cebuano.'

export const metadata: Metadata = {
  metadataBase: new URL(APP_CONFIG.siteUrl),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  // Next.js does not auto-derive og:*/twitter:* tags from title/description —
  // without this block, links shared to iMessage/WhatsApp/Slack/etc. render
  // as a bare URL with no preview card at all.
  openGraph: {
    siteName: SITE_TITLE,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-180.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'iCFD',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F2F2F7' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
}

// Dark mode script injected before first paint to avoid flash
const darkModeScript = `
(function() {
  try {
    var stored = localStorage.getItem('theme');
    if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  } catch(e) {}
})();
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="dark-mode" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: darkModeScript }} />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <PageTracker />
        <SyncManager />
        <OfflineBanner />
        <Header />
        {/* pb-24 reserves space for MobileNav's fixed bar (md:hidden) so
            page content never renders underneath it; centralized here so
            individual pages don't each need to remember it. Matches the
            unconditional pb-24 convention every page already used. */}
        <main className="flex-1 pb-24">{children}</main>
        <MobileNav />
      </body>
    </html>
  )
}
