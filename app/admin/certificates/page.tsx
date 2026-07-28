'use client'

import { useEffect, useRef, useState } from 'react'
import { Certificate, ArrowClockwise, Image as ImageIcon, UploadSimple } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { QUIZ_TIERS, TIER_LABELS, type QuizTier } from '@/lib/content/quizTiers'
import {
  DEFAULT_BASE_IMAGE_URL,
  resolveNamePlaceholder,
  type CertificatePlaceholder,
} from '@/lib/content/certificateTemplate'
import { CertificatePreview } from '@/components/certificates/CertificatePreview'
import { cn, parseJsonResponse } from '@/lib/utils'

interface Template {
  base_image_url: string
  placeholders: CertificatePlaceholder[]
}

interface PathOption {
  slug: string
  title: string
}

export default function AdminCertificatesPage() {
  const [paths, setPaths] = useState<PathOption[]>([])
  const [pathSlug, setPathSlug] = useState<string | null>(null)
  const [tier, setTier] = useState<QuizTier>('beginner')
  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)
  const [accountName, setAccountName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    createClient()
      .from('paths')
      .select('slug, title')
      .is('deleted_at', null)
      .order('created_at')
      .then(({ data }) => {
        setPaths(data ?? [])
        setPathSlug((current) => current ?? data?.[0]?.slug ?? null)
      })
  }, [])

  async function loadTemplate(p: string, t: QuizTier) {
    setLoading(true)
    const { data } = await createClient()
      .from('certificate_templates')
      .select('base_image_url, placeholders')
      .eq('path_slug', p)
      .eq('tier', t)
      .maybeSingle()
    setTemplate(data ? { base_image_url: data.base_image_url, placeholders: (data.placeholders as unknown as CertificatePlaceholder[]) ?? [] } : null)
    setLoading(false)
  }

  useEffect(() => {
    if (!pathSlug) return
    loadTemplate(pathSlug, tier)
    setUploadError('')
  }, [pathSlug, tier])

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !pathSlug) return

    setUploadError('')
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('path_slug', pathSlug)
      formData.append('tier', tier)
      const res = await fetch('/api/admin/certificates/upload', { method: 'POST', body: formData })
      const data = await parseJsonResponse<{ base_image_url: string; placeholders: CertificatePlaceholder[] }>(res, 'Upload failed')
      setTemplate({ base_image_url: data.base_image_url, placeholders: data.placeholders ?? [] })
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const imageUrl = template?.base_image_url || DEFAULT_BASE_IMAGE_URL
  const isDefaultTemplate = !template?.base_image_url
  const namePlaceholder = resolveNamePlaceholder(template?.placeholders)
  const pathTitle = paths.find((p) => p.slug === pathSlug)?.title ?? ''

  return (
    <div>
      <div className="mx-auto max-w-3xl px-4 pt-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Certificate weight="light" size={22} className="text-primary" />
              Certificate Preview
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sample view of how an account&apos;s name appears on a path&apos;s tier certificate template.
            </p>
          </div>
          <button
            onClick={() => pathSlug && loadTemplate(pathSlug, tier)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Refresh"
          >
            <ArrowClockwise weight="light" size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Path selector */}
        {paths.length > 1 && (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Path</label>
            <select
              value={pathSlug ?? ''}
              onChange={(e) => setPathSlug(e.target.value)}
              className="field w-full"
            >
              {paths.map((p) => (
                <option key={p.slug} value={p.slug}>{p.title}</option>
              ))}
            </select>
          </div>
        )}

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

        {/* Hidden file input shared by both upload triggers below */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileSelected}
        />

        {/* Preview */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-2">
            <CertificatePreview
              imageUrl={imageUrl}
              namePlaceholder={namePlaceholder}
              name={accountName.trim() || 'Full Name'}
              alt={`${pathTitle} — ${TIER_LABELS[tier]} certificate template`}
              className="mx-auto"
            />
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || !pathSlug}
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline disabled:opacity-50"
              >
                <UploadSimple weight="light" size={14} />
                {uploading ? 'Uploading…' : isDefaultTemplate ? 'Upload image' : 'Replace image'}
              </button>
              {isDefaultTemplate && (
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <ImageIcon weight="light" size={13} />
                  Using default template — not yet saved for this path/tier
                </p>
              )}
            </div>
          </div>
        )}
        {uploadError && (
          <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {uploadError}
          </p>
        )}
      </div>
    </div>
  )
}
