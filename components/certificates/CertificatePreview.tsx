'use client'

import { useEffect, useRef, useState } from 'react'
import { REFERENCE_IMAGE_WIDTH, type CertificatePlaceholder } from '@/lib/content/certificateTemplate'

interface CertificatePreviewProps {
  imageUrl: string
  placeholders: CertificatePlaceholder[]
  values: Record<string, string>
  alt: string
  className?: string
  /** Admin editing mode: fields become draggable and call onDrag with the new %-position. */
  draggable?: boolean
  onDrag?: (field: string, x: number, y: number) => void
}

export function CertificatePreview({
  imageUrl,
  placeholders,
  values,
  alt,
  className,
  draggable = false,
  onDrag,
}: CertificatePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [scale, setScale] = useState(1)
  const draggingField = useRef<string | null>(null)

  function updateScale() {
    if (imgRef.current) setScale(imgRef.current.clientWidth / REFERENCE_IMAGE_WIDTH)
  }

  useEffect(() => {
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  function handlePointerDown(field: string, e: React.PointerEvent<HTMLDivElement>) {
    if (!draggable) return
    e.preventDefault()
    draggingField.current = field
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const field = draggingField.current
    if (!field || !onDrag || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100))
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100))
    onDrag(field, Math.round(x * 10) / 10, Math.round(y * 10) / 10)
  }

  function handlePointerUp() {
    draggingField.current = null
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden rounded-2xl border border-border bg-muted ${className ?? ''}`}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={imageUrl}
        alt={alt}
        className="block w-full h-auto select-none"
        onLoad={updateScale}
        draggable={false}
      />
      {placeholders.map((p) => {
        const value = values[p.field]
        if (!value) return null
        return (
          <div
            key={p.field}
            onPointerDown={(e) => handlePointerDown(p.field, e)}
            className={`absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap px-2 ${
              draggable ? 'cursor-move rounded outline-dashed outline-1 outline-primary/60 hover:outline-primary' : ''
            }`}
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              fontSize: `${(p.font_size ?? 16) * scale}px`,
              fontFamily: p.font_family ?? 'Georgia, serif',
              color: p.color ?? '#1a1a1a',
              textAlign: p.align ?? 'center',
              touchAction: draggable ? 'none' : undefined,
            }}
          >
            {value}
          </div>
        )
      })}
    </div>
  )
}
