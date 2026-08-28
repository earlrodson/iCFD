'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Certificate, ArrowClockwise, Image as ImageIcon, UploadSimple, FloppyDisk } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { QUIZ_TIERS, TIER_LABELS, type QuizTier } from '@/lib/content/quizTiers'
import {
  DEFAULT_BASE_IMAGE_URL,
  resolvePlaceholders,
  CERTIFICATE_FIELDS,
  type CertificatePlaceholder,
} from '@/lib/content/certificateTemplate'
import { useSiteConfig } from '@/lib/useSiteConfig'
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

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function AdminCertificatesPage() {
  const [paths, setPaths] = useState<PathOption[]>([])
  const [pathSlug, setPathSlug] = useState<string | null>(null)
  const [tier, setTier] = useState<QuizTier>('beginner')
  const [template, setTemplate] = useState<Template | null>(null)
  const [placeholders, setPlaceholders] = useState<CertificatePlaceholder[]>([])
  const [dirty, setDirty] = useState(false)
  const [loading, setLoading] = useState(true)
  const [accountName, setAccountName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { certificateNationalPresident, certificateNationalSpiritualAdviser } = useSiteConfig()

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
    const loaded = data ? { base_image_url: data.base_image_url, placeholders: (data.placeholders as unknown as CertificatePlaceholder[]) ?? [] } : null
    setTemplate(loaded)
    setPlaceholders(resolvePlaceholders(loaded?.placeholders))
    setDirty(false)
    setLoading(false)
  }

  useEffect(() => {
    if (!pathSlug) return
    loadTemplate(pathSlug, tier)
    setUploadError('')
    setSaveStatus('idle')
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
      setPlaceholders(resolvePlaceholders(data.placeholders))
      setDirty(false)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function handleDrag(field: string, x: number, y: number) {
    setPlaceholders((prev) => prev.map((p) => (p.field === field ? { ...p, x, y } : p)))
    setDirty(true)
  }

  async function savePositions() {
    if (!pathSlug) return
    setSaveStatus('saving')
    setSaveError('')
    try {
      const res = await fetch('/api/admin/certificates/placeholders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path_slug: pathSlug, tier, placeholders }),
      })
      const data = await parseJsonResponse<{ base_image_url: string; placeholders: CertificatePlaceholder[] }>(res, 'Save failed')
      setTemplate({ base_image_url: data.base_image_url, placeholders: data.placeholders ?? [] })
      setDirty(false)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      setSaveStatus('error')
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    }
  }

  const imageUrl = template?.base_image_url || DEFAULT_BASE_IMAGE_URL
  const isDefaultTemplate = !template?.base_image_url
  const pathTitle = paths.find((p) => p.slug === pathSlug)?.title ?? ''
  const sampleValues: Record<string, string> = {
    name: accountName.trim() || 'Full Name',
    issue_date: new Date().toISOString().slice(0, 10),
    serial_code: 'CFD-0000000-SAMPLE',
    national_president: certificateNationalPresident || 'National President',
    national_spiritual_adviser: certificateNationalSpiritualAdviser || 'National Spiritual Adviser',
  }

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
              Drag any field onto the certificate to reposition it, then save.
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
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Sample account name</label>
          <input
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="e.g. Maria Santos"
            className="field w-full"
          />
        </div>

        {certificateNationalPresident === '' || certificateNationalSpiritualAdviser === '' ? (
          <p className="rounded-xl bg-amber-50 px-4 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            National President / National Spiritual Adviser names aren&apos;t set yet — configure them in{' '}
            <Link href="/admin" className="underline">App Config</Link> so they print on issued certificates.
          </p>
        ) : null}

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
              placeholders={placeholders}
              values={sampleValues}
              alt={`${pathTitle} — ${TIER_LABELS[tier]} certificate template`}
              className="mx-auto"
              draggable
              onDrag={handleDrag}
            />
            <p className="text-[11px] text-muted-foreground">
              Fields shown: {CERTIFICATE_FIELDS.map((f) => f.label).join(', ')}
            </p>
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
            <div className="flex items-center gap-3">
              <button
                onClick={savePositions}
                disabled={!dirty || saveStatus === 'saving' || !pathSlug}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <FloppyDisk weight="fill" size={16} />
                {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved!' : 'Save positions'}
              </button>
              {dirty && saveStatus === 'idle' && (
                <span className="text-xs text-muted-foreground">Unsaved position changes</span>
              )}
            </div>
          </div>
        )}
        {(uploadError || saveError) && (
          <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {uploadError || saveError}
          </p>
        )}
      </div>
    </div>
  )
}
