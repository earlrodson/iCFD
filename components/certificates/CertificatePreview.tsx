'use client'

import { useEffect, useRef, useState } from 'react'
import { REFERENCE_IMAGE_WIDTH, type CertificatePlaceholder } from '@/lib/content/certificateTemplate'

interface CertificatePreviewProps {
  imageUrl: string
  namePlaceholder: CertificatePlaceholder
  name: string
  alt: string
  className?: string
}

export function CertificatePreview({ imageUrl, namePlaceholder, name, alt, className }: CertificatePreviewProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [scale, setScale] = useState(1)

  function updateScale() {
    if (imgRef.current) setScale(imgRef.current.clientWidth / REFERENCE_IMAGE_WIDTH)
  }

  useEffect(() => {
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl border border-border bg-muted ${className ?? ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={imageUrl}
        alt={alt}
        className="block w-full h-auto select-none"
        onLoad={updateScale}
      />
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap px-2"
        style={{
          left: `${namePlaceholder.x}%`,
          top: `${namePlaceholder.y}%`,
          fontSize: `${(namePlaceholder.font_size ?? 34) * scale}px`,
          fontFamily: namePlaceholder.font_family ?? 'Georgia, serif',
          color: namePlaceholder.color ?? '#1a1a1a',
          textAlign: namePlaceholder.align ?? 'center',
        }}
      >
        {name}
      </div>
    </div>
  )
}
