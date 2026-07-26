'use client'

import { useEffect, useState } from 'react'
import { X } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { CertificatePreview } from './CertificatePreview'
import {
  DEFAULT_BASE_IMAGE_URL,
  resolveNamePlaceholder,
  type CertificatePlaceholder,
} from '@/lib/content/certificateTemplate'
import { TIER_LABELS, type QuizTier } from '@/lib/content/quizTiers'

interface CertificateModalProps {
  pathSlug: string
  pathTitle: string
  tier: QuizTier
  serialCode: string
  issuedAt: string
  recipientName: string
  onClose: () => void
}

export function CertificateModal({ pathSlug, pathTitle, tier, serialCode, issuedAt, recipientName, onClose }: CertificateModalProps) {
  const [template, setTemplate] = useState<{ base_image_url: string; placeholders: CertificatePlaceholder[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    createClient()
      .from('certificate_templates')
      .select('base_image_url, placeholders')
      .eq('path_slug', pathSlug)
      .eq('tier', tier)
      .maybeSingle()
      .then(({ data }) => {
        setTemplate(
          data
            ? { base_image_url: data.base_image_url, placeholders: (data.placeholders as unknown as CertificatePlaceholder[]) ?? [] }
            : null,
        )
        setLoading(false)
      })
  }, [pathSlug, tier])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const imageUrl = template?.base_image_url || DEFAULT_BASE_IMAGE_URL
  const namePlaceholder = resolveNamePlaceholder(template?.placeholders)
  const label = `${pathTitle} — ${TIER_LABELS[tier]} Certificate`

  return (
    <>
      <div aria-hidden="true" onClick={onClose} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-lg -translate-y-1/2 rounded-2xl border border-border bg-card p-4 shadow-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X weight="light" size={16} />
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <CertificatePreview
            imageUrl={imageUrl}
            namePlaceholder={namePlaceholder}
            name={recipientName}
            alt={label}
          />
        )}
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>Serial: {serialCode}</span>
          <span>Issued {new Date(issuedAt).toLocaleDateString()}</span>
        </div>
      </div>
    </>
  )
}
