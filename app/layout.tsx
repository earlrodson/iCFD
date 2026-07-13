import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { PWASetup } from './pwa'
import { ClientOverlays } from './client-overlays'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Catholic Faith Defender',
    template: '%s | Catholic Faith Defender'
  },
  description: 'Catholic apologetics handbook for defending the faith with scripture, tradition, and reason',
  keywords: ['catholic', 'apologetics', 'faith', 'defender', 'christianity', 'bible', 'catechism'],
  authors: [{ name: 'Catholic Faith Defender' }],
  creator: 'Catholic Faith Defender',
  publisher: 'Catholic Faith Defender',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://catholicdefender.app'),
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://catholicdefender.app',
    title: 'Catholic Faith Defender',
    description: 'Catholic apologetics handbook for defending the faith with scripture, tradition, and reason',
    siteName: 'Catholic Faith Defender',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Catholic Faith Defender',
    description: 'Catholic apologetics handbook for defending the faith',
    creator: '@catholicdefender',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <div id="root">
          <PWASetup />
          <ClientOverlays />
          {children}
        </div>
      </body>
    </html>
  )
}