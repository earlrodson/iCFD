'use client'

import { useEffect, useRef, useState } from 'react'
import { Certificate, ArrowClockwise, Image as ImageIcon } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { QUIZ_TIERS, type QuizTier } from '@/lib/content/quizTiers'
import { cn } from '@/lib/utils'

interface Placeholder {
  field: string
  x: number
  y: number
  font_size?: number
  font_family?: string
  color?: string
  align?: 'left' | 'center' | 'right'
}

interface Template {
  base_image_url: string
  placeholders: Placeholder[]
}

const DEFAULT_NAME_PLACEHOLDER: Placeholder = {
  field: 'name',
  x: 50,
  y: 58,
  font_size: 34,
  font_family: 'Georgia, serif',
  color: '#1a1a1a',
  align: 'center',
}

// Placeholders are authored assuming an image roughly this wide; font size
// scales with the actual rendered width so text stays proportional.
const REFERENCE_IMAGE_WIDTH = 1000

const TIER_LABELS: Record<QuizTier, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

export default function AdminCertificatesPage() {
  const [tier, setTier] = useState<QuizTier>('beginner')
  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)
  const [previewUrl, setPreviewUrl] = useState('')
  const [accountName, setAccountName] = useState('')
  const [scale, setScale] = useState(1)
  const imgRef = useRef<HTMLImageElement>(null)

  async function loadTemplate(t: QuizTier) {
    setLoading(true)
    const { data } = await createClient()
      .from('certificate_templates')
      .select('base_image_url, placeholders')
      .eq('tier', t)
      .maybeSingle()
    setTemplate(data ? { base_image_url: data.base_image_url, placeholders: (data.placeholders as unknown as Placeholder[]) ?? [] } : null)
    setLoading(false)
  }

  useEffect(() => {
    loadTemplate(tier)
    setPreviewUrl('')
  }, [tier])

  const imageUrl = template?.base_image_url || previewUrl
  const namePlaceholder =
    template?.placeholders.find((p) => p.field === 'name' || p.field === 'full_name' || p.field === 'account_name') ??
    DEFAULT_NAME_PLACEHOLDER

  function handleImageLoad() {
    if (imgRef.current) {
      setScale(imgRef.current.clientWidth / REFERENCE_IMAGE_WIDTH)
    }
  }

  useEffect(() => {
    function onResize() {
      if (imgRef.current) setScale(imgRef.current.clientWidth / REFERENCE_IMAGE_WIDTH)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div className="pb-24">
      <div className="mx-auto max-w-3xl px-4 pt-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Certificate weight="light" size={22} className="text-primary" />
              Certificate Preview
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sample view of how an account&apos;s name appears on the tier&apos;s certificate template.
            </p>
          </div>
          <button
            onClick={() => loadTemplate(tier)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Refresh"
          >
            <ArrowClockwise weight="light" size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Tier selector */}
        <div className="flex gap-2">
          {QUIZ_TIERS.map((t) => (
            <button
              key={t}
              onClick={() => setTier(t)}
              className={cn(
                'rounded-xl px-3 py-1.5 text-sm font-medium transition-colors',
                tier === t
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {TIER_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Name input */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Account name</label>
          <input
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="e.g. Maria Santos"
            className="field w-full"
          />
        </div>

        {/* Preview */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : imageUrl ? (
          <div className="relative mx-auto w-full overflow-hidden rounded-2xl border border-border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageUrl}
              alt={`${TIER_LABELS[tier]} certificate template`}
              className="block w-full h-auto select-none"
              onLoad={handleImageLoad}
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
              {accountName.trim() || 'Full Name'}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center space-y-3">
            <ImageIcon weight="light" size={28} className="mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No certificate template uploaded for the {TIER_LABELS[tier].toLowerCase()} tier yet.
            </p>
            <div className="mx-auto max-w-sm">
              <input
                type="text"
                value={previewUrl}
                onChange={(e) => setPreviewUrl(e.target.value)}
                placeholder="Paste an image URL to preview…"
                className="field w-full text-center"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Preview only — not saved.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
