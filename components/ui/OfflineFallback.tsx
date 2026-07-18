'use client'

import { WifiSlash } from '@phosphor-icons/react'

interface OfflineFallbackProps {
  /** What kind of content is unavailable, e.g. "paragraphs", "articles", "canons" */
  contentLabel?: string
}

export function OfflineFallback({ contentLabel = 'content' }: OfflineFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <WifiSlash weight="light" size={26} className="text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium text-foreground">You&apos;re offline</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Connect to the internet to load this {contentLabel}.
          Pages you&apos;ve already visited are available offline.
        </p>
      </div>
    </div>
  )
}
