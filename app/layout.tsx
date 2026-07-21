import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { MobileNav } from '@/components/layout/MobileNav'
import { OfflineBanner } from '@/components/ui/OfflineBanner'
import { SyncManager } from '@/components/SyncManager'

export const metadata: Metadata = {
  title: 'Codex Defensoris',
  description:
    'Offline-first Catholic apologetics app with Scripture, Tradition, and Catechism references in English, Tagalog, and Cebuano.',
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
        <SyncManager />
        <OfflineBanner />
        <Header />
        <main className="flex-1">{children}</main>
        <MobileNav />
      </body>
    </html>
  )
}
