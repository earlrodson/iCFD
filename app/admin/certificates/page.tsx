'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Certificate, ArrowClockwise, Image as ImageIcon, UploadSimple, FloppyDisk, ListChecks } from '@phosphor-icons/react'
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
import type { Database } from '@/lib/supabase/database.types'

interface Template {
  base_image_url: string
  placeholders: CertificatePlaceholder[]
}

interface PathOption {
  slug: string
  title: string
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

function TemplatesTab({ hidden }: { hidden: boolean }) {
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
  const loadRequestRef = useRef(0)
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
    const requestId = ++loadRequestRef.current
    setLoading(true)
    const { data } = await createClient()
      .from('certificate_templates')
      .select('base_image_url, placeholders')
      .eq('path_slug', p)
      .eq('tier', t)
      .maybeSingle()
    if (loadRequestRef.current !== requestId) return
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
    <div className={hidden ? 'hidden' : undefined}>
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
            disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
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

// ── Completions report ───────────────────────────────────────────────────────

type CompletionRow = Database['public']['Functions']['get_certificate_completions']['Returns'][number]

const ALL = '__all__'

function CompletionsTab({ hidden }: { hidden: boolean }) {
  const [rows, setRows] = useState<CompletionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pathFilter, setPathFilter] = useState(ALL)
  const [dioceseFilter, setDioceseFilter] = useState(ALL)
  const [chapterFilter, setChapterFilter] = useState(ALL)
  const [yearFilter, setYearFilter] = useState(ALL)
  const loadingRef = useRef(false)

  async function load() {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    setError('')
    const { data, error: rpcError } = await createClient().rpc('get_certificate_completions')
    if (rpcError) {
      setError(rpcError.message)
    } else {
      setRows(data ?? [])
    }
    setLoading(false)
    loadingRef.current = false
  }

  const hasLoadedRef = useRef(false)
  useEffect(() => {
    if (hidden || hasLoadedRef.current) return
    hasLoadedRef.current = true
    load()
  }, [hidden])

  const paths = useMemo(
    () => [...new Map(rows.map((r) => [r.path_slug, r.path_title ?? r.path_slug])).entries()],
    [rows],
  )
  const dioceses = useMemo(
    () => [...new Map(rows.filter((r) => r.diocese_id).map((r) => [r.diocese_id as string, r.diocese_name as string])).entries()],
    [rows],
  )
  // Chapter options narrow to the selected diocese, mirroring the admin/users
  // chapter picker's diocese -> chapter grouping.
  const chapters = useMemo(
    () => [...new Map(
      rows
        .filter((r) => r.chapter_id && (dioceseFilter === ALL || r.diocese_id === dioceseFilter))
        .map((r) => [r.chapter_id as string, r.chapter_name as string]),
    ).entries()],
    [rows, dioceseFilter],
  )
  const years = useMemo(
    () => [...new Set(rows.map((r) => new Date(r.issued_at).getUTCFullYear()))].sort((a, b) => b - a),
    [rows],
  )

  const filtered = useMemo(() => rows.filter((r) =>
    (pathFilter === ALL || r.path_slug === pathFilter) &&
    (dioceseFilter === ALL || r.diocese_id === dioceseFilter) &&
    (chapterFilter === ALL || r.chapter_id === chapterFilter) &&
    (yearFilter === ALL || String(new Date(r.issued_at).getUTCFullYear()) === yearFilter),
  ), [rows, pathFilter, dioceseFilter, chapterFilter, yearFilter])

  return (
    <div className={cn('mx-auto max-w-4xl px-4 pt-8 space-y-4', hidden && 'hidden')}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ListChecks weight="light" size={22} className="text-primary" />
            Path Completions
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Everyone who has earned a certificate, filterable by path, diocese, chapter, and year.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          aria-label="Refresh"
        >
          <ArrowClockwise weight="light" size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <select value={pathFilter} onChange={(e) => setPathFilter(e.target.value)} className="field">
          <option value={ALL}>All paths</option>
          {paths.map(([slug, title]) => (
            <option key={slug} value={slug}>{title}</option>
          ))}
        </select>
        <select
          value={dioceseFilter}
          onChange={(e) => { setDioceseFilter(e.target.value); setChapterFilter(ALL) }}
          className="field"
        >
          <option value={ALL}>All dioceses</option>
          {dioceses.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        <select value={chapterFilter} onChange={(e) => setChapterFilter(e.target.value)} className="field">
          <option value={ALL}>All chapters</option>
          {chapters.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="field">
          <option value={ALL}>All years</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Learner</th>
                <th className="px-3 py-2">Path</th>
                <th className="px-3 py-2">Tier</th>
                <th className="px-3 py-2">Diocese</th>
                <th className="px-3 py-2">Chapter</th>
                <th className="px-3 py-2">Issued</th>
                <th className="px-3 py-2">Serial</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r) => {
                const name = [r.first_name, r.last_name].filter(Boolean).join(' ') || r.email || 'Unknown'
                return (
                  <tr key={r.certificate_id}>
                    <td className="px-3 py-2">
                      <p className="font-medium text-foreground">{name}</p>
                      <p className="text-xs text-muted-foreground">{r.email ?? '—'}</p>
                    </td>
                    <td className="px-3 py-2">{r.path_title ?? r.path_slug}</td>
                    <td className="px-3 py-2">{TIER_LABELS[r.tier as QuizTier] ?? r.tier}</td>
                    <td className="px-3 py-2">{r.diocese_name ?? '—'}</td>
                    <td className="px-3 py-2">{r.chapter_name ?? '—'}</td>
                    <td className="px-3 py-2">{new Date(r.issued_at).toLocaleDateString('en-US', { timeZone: 'UTC' })}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.serial_code}</td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                    No certificates match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

type PageTab = 'templates' | 'completions'

export default function AdminCertificatesPage() {
  const [tab, setTab] = useState<PageTab>('templates')

  const tabs: { id: PageTab; label: string }[] = [
    { id: 'templates', label: 'Template' },
    { id: 'completions', label: 'Completions' },
  ]

  return (
    <div>
      <div className="mx-auto max-w-4xl px-4 pt-4">
        <div className="flex gap-1 border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <TemplatesTab hidden={tab !== 'templates'} />
      <CompletionsTab hidden={tab !== 'completions'} />
    </div>
  )
}
