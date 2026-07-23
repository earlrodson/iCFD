'use client'

import { useState, useEffect, useMemo } from 'react'
import React from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  BookOpen,
  Quotes,
  ChatTeardropText,
  Heart,
  ArrowLeft,
  Export,
  Printer,
  CheckCircle,
  Circle,
  ArrowRight,
  Warning,
  ArrowCircleDown,
  Spinner,
  X,
  BookBookmark,
  TextAa,
} from '@phosphor-icons/react'
import { useTopicOfflineCache } from '@/lib/useTopicOfflineCache'
import type { Topic, Term, Language } from '@/data/schema/topic.schema'
import { Badge } from '@/components/ui/badge'
import { useFavoritesStore } from '@/store/useFavoritesStore'
import { useReadingStore } from '@/store/useReadingStore'
import { useNotesStore, NOTE_MAX_LENGTH } from '@/store/useNotesStore'
import { useAppStore } from '@/store/useAppStore'
import { formatDate, cn } from '@/lib/utils'
import pathsData from '@/public/data/content/paths.json'

const LANGUAGE_NAMES: Record<string, string> = { en: 'English', tl: 'Tagalog', ceb: 'Cebuano' }

// ── Term highlighting helpers ─────────────────────────────────────────────────

type TermPart = { type: 'text'; content: string } | { type: 'term'; term: Term; matched: string }

/**
 * Compile ONE regex from all terms (and their "/" variants) so the JS engine
 * builds a single DFA — one O(n) pass over the text regardless of term count.
 * Call this once per unique terms array (via useMemo), not per text node.
 */
function buildTermRegex(terms: Term[]): { re: RegExp; slugMap: Map<string, Term> } | null {
  if (!terms.length) return null
  const slugMap = new Map<string, Term>()
  const patterns: string[] = []

  for (const t of terms) {
    // Use keywords if defined, otherwise fall back to term name parts
    const matchWords = t.keywords
      ? t.keywords.split(',').map((k) => k.trim()).filter(Boolean)
      : t.term.split(' / ').map((p) => p.trim()).filter(Boolean)

    for (const word of matchWords) {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      patterns.push(escaped)
      slugMap.set(word.toLowerCase(), t)
    }
  }

  if (!patterns.length) return null
  // Longest-first so "ex cathedra" matches before "ex", "mother of god" before "mother"
  patterns.sort((a, b) => b.length - a.length)
  const re = new RegExp(
    `(?<![\\w\\u0080-\\uFFFF])(${patterns.join('|')})(?![\\w\\u0080-\\uFFFF])`,
    'gi',
  )
  return { re, slugMap }
}

function splitText(text: string, compiled: ReturnType<typeof buildTermRegex>): TermPart[] {
  if (!compiled) return [{ type: 'text', content: text }]
  compiled.re.lastIndex = 0
  const parts: TermPart[] = []
  let last = 0
  let m: RegExpExecArray | null
  while ((m = compiled.re.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: 'text', content: text.slice(last, m.index) })
    const term = compiled.slugMap.get(m[1].toLowerCase())
    if (term) parts.push({ type: 'term', term, matched: m[1] })
    else parts.push({ type: 'text', content: m[1] })
    last = compiled.re.lastIndex
  }
  if (last < text.length) parts.push({ type: 'text', content: text.slice(last) })
  return parts
}

function injectTerms(
  node: React.ReactNode,
  compiled: ReturnType<typeof buildTermRegex>,
  onClick: (t: Term) => void,
): React.ReactNode {
  if (!compiled) return node
  if (typeof node === 'string') {
    const parts = splitText(node, compiled)
    if (parts.length === 1 && parts[0].type === 'text') return node
    return (
      <>
        {parts.map((p, i) =>
          p.type === 'text' ? p.content : (
            <button
              key={i}
              type="button"
              onClick={() => onClick(p.term)}
              className="underline underline-offset-2 decoration-dotted decoration-primary/70 hover:decoration-solid hover:text-primary transition-colors cursor-pointer font-[inherit]"
            >
              {p.matched}
            </button>
          ),
        )}
      </>
    )
  }
  if (Array.isArray(node)) {
    return node.map((child, i) => (
      <React.Fragment key={i}>{injectTerms(child, compiled, onClick)}</React.Fragment>
    ))
  }
  if (React.isValidElement(node)) {
    const el = node as React.ReactElement<{ children?: React.ReactNode }>
    if (el.props.children) {
      return React.cloneElement(el, {}, injectTerms(el.props.children, compiled, onClick))
    }
  }
  return node
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeTermComponents(compiled: ReturnType<typeof buildTermRegex>, onClick: (t: Term) => void): any {
  const wrap = (Tag: string) =>
    ({ children, ...rest }: { children?: React.ReactNode; [k: string]: unknown }) =>
      React.createElement(Tag, rest, injectTerms(children, compiled, onClick))
  return {
    p: wrap('p'),
    li: wrap('li'),
    blockquote: wrap('blockquote'),
    td: wrap('td'),
    h2: wrap('h2'),
    h3: wrap('h3'),
  }
}

interface TopicContentProps {
  topic: Topic
  /** Set by the server when the cookie-preferred language had no real
   *  translation for this topic (missing or stub) and English was served
   *  instead — lets the banner render on first paint, before hydration. */
  requestedLang?: Language
}

export function TopicContent({ topic: initialTopic, requestedLang }: TopicContentProps) {
  const { availableTopics, currentLanguage, initialize } = useAppStore()
  const { toggleFavorite, isFavorite } = useFavoritesStore()
  const { markAsRead, markAsUnread, isRead, recordVisit } = useReadingStore()
  const notes = useNotesStore((s) => s.notes)
  const { setNote } = useNotesStore()

  const [displayTopic, setDisplayTopic] = useState(initialTopic)
  const [notAvailable, setNotAvailable] = useState(!!requestedLang)
  const [unavailableLang, setUnavailableLang] = useState(requestedLang ?? null)
  const [copied, setCopied] = useState(false)
  const [noteLocal, setNoteLocal] = useState('')
  const [pathSlug, setPathSlug] = useState<string | null>(null)
  const [contentTab, setContentTab] = useState<'concise' | 'comprehensive' | 'brief'>(
    initialTopic.answerFull ? 'comprehensive' : 'concise'
  )
  const [refPopover, setRefPopover] = useState<{ title: string; meta?: string; body: string; loading?: boolean; debateNote?: string } | null>(null)
  const [cccData, setCccData] = useState<Map<number, { paragraph: number; summary: string | null; text: string | null; section: string | null }>>(new Map())

  async function openCccPopover(cccRef: string) {
    setRefPopover({ title: cccRef, loading: true, body: '' })
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      const num = cccRef.replace('CCC ', '')
      const res = await fetch(
        `${url}/rest/v1/ccc_paragraphs?paragraph=eq.${num}&select=paragraph,summary,text,section`,
        { headers: { apikey: key!, Authorization: `Bearer ${key}` } },
      )
      const rows = await res.json() as { paragraph: number; summary: string | null; text: string | null; section: string | null }[]
      const row = rows[0]
      setRefPopover({
        title: cccRef,
        meta: row?.section ?? undefined,
        body: row?.text ?? row?.summary ?? 'Full paragraph text not yet available.',
      })
    } catch {
      setRefPopover({ title: cccRef, body: 'Could not load paragraph text.' })
    }
  }

  function openTermPopover(t: Term) {
    setRefPopover({
      title: `${t.term}${t.rootText ? ` · ${t.rootText}` : ''}`,
      meta: `${t.language}${t.pronunciation ? ` · /${t.pronunciation}/` : ''} · "${t.rootMeaning}"`,
      body: t.definition,
      debateNote: t.debateNote ?? undefined,
    })
  }

  // Compile once when keyTerms change — single DFA regex for all terms
  const compiledTerms = useMemo(
    () => buildTermRegex(displayTopic.keyTerms ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [displayTopic.keyTerms?.map((t) => t.slug).join(',')],
  )
  // Stable component objects — only recreated when compiled regex changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const termComponents = useMemo(() => makeTermComponents(compiledTerms, openTermPopover), [compiledTerms])

  const favorited = isFavorite(displayTopic.id)
  const read = isRead(displayTopic.id)
  const { status: offlineStatus, supported: offlineSupported, download: downloadOffline, remove: removeOffline } = useTopicOfflineCache(initialTopic.id)

  // Read ?path= from URL (no Suspense needed — not required for SSR)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setPathSlug(params.get('path'))
  }, [])

  // Language switching: look up topic in current-language store
  useEffect(() => {
    if (availableTopics.length === 0) {
      initialize()
    } else {
      const found = availableTopics.find((t) => t.id === initialTopic.id)
      if (found) {
        // keyTerms and documentRefs are fetched server-side and not in the static store — preserve them
        setDisplayTopic({ ...found, keyTerms: initialTopic.keyTerms, documentRefs: initialTopic.documentRefs })
        setNotAvailable(false)
        setUnavailableLang(null)
      } else {
        // availableTopics for a non-English language already excludes stub
        // rows (lib/content/database.ts loadTopicsFromDatabase), so "not
        // found here" means genuinely missing or stub — same fallback case.
        setDisplayTopic(initialTopic)
        setNotAvailable(currentLanguage !== 'en')
        setUnavailableLang(currentLanguage !== 'en' ? currentLanguage : null)
      }
    }
  }, [availableTopics, initialTopic, currentLanguage, initialize])

  // Record visit once per mount
  useEffect(() => {
    recordVisit(initialTopic.id)
  }, [initialTopic.id, recordVisit])

  // Sync note text when topic changes; reset tab to default
  useEffect(() => {
    setNoteLocal(notes[initialTopic.id] ?? '')
    setContentTab(initialTopic.answerFull ? 'comprehensive' : 'concise')
  }, [initialTopic.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch CCC paragraph text for all catechism refs on this topic
  useEffect(() => {
    const nums = (initialTopic.catechism ?? []).map((c) => Number(c.replace('CCC ', ''))).filter(Boolean)
    if (!nums.length) return
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    if (!url || !key) return
    fetch(
      `${url}/rest/v1/ccc_paragraphs?paragraph=in.(${nums.join(',')})&select=paragraph,summary,text,section`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    )
      .then((r) => r.json())
      .then((rows: { paragraph: number; summary: string | null; text: string | null; section: string | null }[]) => {
        setCccData(new Map(rows.map((r) => [r.paragraph, r])))
      })
      .catch(() => {/* silent — chips still show without text */})
  }, [initialTopic.catechism])

  // Resolve {{ccc:N}}, {{verse:ref}}, {{father:id}} shortcodes in answerFull
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null)
  const [resolvedFull, setResolvedFull] = useState(displayTopic.answerFull ?? '')
  useEffect(() => {
    const raw = displayTopic.answerFull
    if (!raw) { setResolvedFull(''); return }

    const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key  = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    if (!url || !key) { setResolvedFull(raw); return }

    const cccNums   = [...new Set([...raw.matchAll(/\{\{ccc:(\d+)\}\}/gi)].map(m => m[1]))]
    const verseRefs = [...new Set([...raw.matchAll(/\{\{verse:([^}]+)\}\}/gi)].map(m => m[1].trim()))]
    const fatherIds = [...new Set([...raw.matchAll(/\{\{father:(\d+)\}\}/gi)].map(m => m[1]))]

    if (!cccNums.length && !verseRefs.length && !fatherIds.length) { setResolvedFull(raw); return }

    const h = { apikey: key, Authorization: `Bearer ${key}` }
    Promise.all([
      cccNums.length
        ? fetch(`${url}/rest/v1/ccc_paragraphs?paragraph=in.(${cccNums.join(',')})&select=paragraph,text`, { headers: h }).then(r => r.json())
        : Promise.resolve([]),
      verseRefs.length
        ? fetch(`${url}/rest/v1/scripture_verses?reference=in.(${verseRefs.map(r => `"${r}"`).join(',')})&version=eq.NABRE&select=reference,text`, { headers: h }).then(r => r.json())
        : Promise.resolve([]),
      fatherIds.length
        ? fetch(`${url}/rest/v1/church_father_quotes?id=in.(${fatherIds.join(',')})&select=id,author,quote,source`, { headers: h }).then(r => r.json())
        : Promise.resolve([]),
    ]).then(([cccRows, verseRows, fatherRows]) => {
      const cccMap    = new Map((cccRows  as {paragraph:number;text:string}[]).map(r => [String(r.paragraph), r.text]))
      const verseMap  = new Map((verseRows as {reference:string;text:string}[]).map(r => [r.reference, r.text]))
      const fatherMap = new Map((fatherRows as {id:number;author:string;quote:string;source:string}[]).map(r => [String(r.id), r]))

      let out = raw
      out = out.replace(/\{\{ccc:(\d+)\}\}/gi,    (_, n) => cccMap.has(n)    ? `> **CCC ${n}:** ${cccMap.get(n)}` : `*(CCC ${n})*`)
      out = out.replace(/\{\{verse:([^}]+)\}\}/gi, (_, r) => verseMap.has(r.trim()) ? `> *"${verseMap.get(r.trim())}"* — **${r.trim()}**` : `*(${r.trim()})*`)
      out = out.replace(/\{\{father:(\d+)\}\}/gi,  (_, id) => {
        const f = fatherMap.get(id)
        return f ? `> *"${f.quote}"*\n>\n> — **${f.author}**, *${f.source}*` : `*(quote #${id})*`
      })
      setResolvedFull(out)
    }).catch(() => setResolvedFull(raw))
  }, [displayTopic.answerFull]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleShare() {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({ title: displayTopic.title, text: displayTopic.question, url })
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handleNoteChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setNoteLocal(val)
    setNote(initialTopic.id, val)
  }

  const topic = displayTopic

  return (
    <article className="mx-auto max-w-3xl px-4 pb-24 pt-4">
      {/* Back nav */}
      <div className="mb-4 flex items-center gap-3">
        <Link
          href={pathSlug ? `/paths/${pathSlug}` : '/handbook'}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft weight="light" size={16} />
          {pathSlug ? 'Back to Path' : 'Back to Handbook'}
        </Link>
      </div>

      {/* Language unavailable banner */}
      {notAvailable && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-400">
          <Warning weight="fill" size={16} className="shrink-0" />
          No {LANGUAGE_NAMES[unavailableLang ?? currentLanguage] ?? unavailableLang} translation available — showing English
        </div>
      )}

      {/* Header */}
      <header className="mb-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant="category" value={topic.category} />
          <Badge variant="difficulty" value={topic.difficulty} />
        </div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground leading-tight">
            {topic.title}
          </h1>
          <div className="flex shrink-0 items-center gap-1 mt-1 no-print">
            <button
              onClick={() => window.print()}
              className="p-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Print topic"
            >
              <Printer weight="light" size={22} />
            </button>
            <button
              onClick={handleShare}
              className="p-2 rounded-xl bg-muted text-muted-foreground hover:text-primary transition-colors"
              aria-label="Share topic"
            >
              {copied ? (
                <CheckCircle weight="fill" size={22} className="text-green-500" />
              ) : (
                <Export weight="light" size={22} />
              )}
            </button>
            {offlineSupported && (
              <button
                onClick={offlineStatus === 'done' ? removeOffline : downloadOffline}
                disabled={offlineStatus === 'downloading'}
                className="p-2 rounded-xl bg-muted text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                aria-label={offlineStatus === 'done' ? 'Remove offline copy' : 'Save for offline'}
                title={offlineStatus === 'done' ? 'Saved offline — tap to remove' : 'Save for offline'}
              >
                {offlineStatus === 'downloading' ? (
                  <Spinner weight="light" size={22} className="animate-spin" />
                ) : offlineStatus === 'done' ? (
                  <ArrowCircleDown weight="fill" size={22} className="text-primary" />
                ) : (
                  <ArrowCircleDown weight="light" size={22} />
                )}
              </button>
            )}
            <button
              onClick={() => toggleFavorite(topic.id)}
              className="p-2 rounded-xl bg-muted text-muted-foreground hover:text-red-500 transition-colors"
              aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart
                weight={favorited ? 'fill' : 'light'}
                size={22}
                className={favorited ? 'text-red-500' : ''}
              />
            </button>
          </div>
        </div>
        <p className="mt-3 text-base text-muted-foreground italic leading-relaxed">
          &ldquo;{topic.question}&rdquo;
        </p>
      </header>

      {/* Content tabs */}
      <section className="mb-8">
        {/* Tab bar */}
        <div className="flex gap-1 border-b border-border mb-0">
          {topic.answerFull && (
            <button
              onClick={() => setContentTab('comprehensive')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                contentTab === 'comprehensive'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Comprehensive
            </button>
          )}
          <button
            onClick={() => setContentTab('concise')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              contentTab === 'concise'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Concise
          </button>
          <button
            onClick={() => setContentTab('brief')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              contentTab === 'brief'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Brief
          </button>
        </div>

        {/* Key Terms bar — pinned between tab bar and content */}
        {topic.keyTerms && topic.keyTerms.length > 0 && (
          <div className="border-x border-border bg-muted/30">
            <div className="flex flex-wrap items-center gap-1.5 px-4 py-2.5">
              <TextAa weight="light" size={14} className="shrink-0 text-muted-foreground" />
              {topic.keyTerms.map((t) => (
                <button
                  key={t.slug}
                  onClick={() => setSelectedTerm(selectedTerm === t.slug ? null : t.slug)}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                    selectedTerm === t.slug
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-primary/10 text-primary hover:bg-primary/20'
                  }`}
                >
                  {t.term}
                </button>
              ))}
            </div>
            {selectedTerm && (() => {
              const t = topic.keyTerms!.find((x) => x.slug === selectedTerm)
              if (!t) return null
              return (
                <div className="border-t border-border px-4 py-3 space-y-2">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="font-semibold text-sm text-foreground">{t.term}</span>
                    {t.rootText && <span className="text-sm font-medium text-primary">{t.rootText}</span>}
                    {t.pronunciation && <span className="text-xs text-muted-foreground">/{t.pronunciation}/</span>}
                    <span className="text-xs text-muted-foreground">({t.language})</span>
                    <span className="text-xs text-muted-foreground">&middot; &ldquo;{t.rootMeaning}&rdquo;</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{t.definition}</p>
                  {t.debateNote && (
                    <div className="rounded-xl border-l-4 border-primary bg-primary/8 px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1.5">Apologetics Note</p>
                      <p className="text-sm text-foreground leading-relaxed">{t.debateNote}</p>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )}

        {/* Concise */}
        <div
          data-tab="concise"
          className={contentTab === 'concise' ? 'rounded-b-2xl rounded-tr-2xl bg-card px-5 py-6 shadow-sm border border-t-0 border-border prose prose-base dark:prose-invert max-w-none' : 'hidden'}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={termComponents}>{topic.answer}</ReactMarkdown>
        </div>

        {/* Comprehensive */}
        {topic.answerFull && (
          <div
            data-tab="comprehensive"
            className={contentTab === 'comprehensive' ? 'rounded-b-2xl rounded-tr-2xl bg-card px-5 py-6 shadow-sm border border-t-0 border-border prose prose-base dark:prose-invert max-w-none overflow-x-auto' : 'hidden'}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={termComponents}>
              {resolvedFull}
            </ReactMarkdown>
          </div>
        )}

        {/* Apologetics Brief — compact reference card */}
        <div
          data-tab="brief"
          className={contentTab === 'brief' ? 'rounded-b-2xl rounded-tr-2xl bg-card border border-t-0 border-border overflow-hidden' : 'hidden'}
        >
            {topic.scripture.length > 0 && (
              <div className="border-b border-border p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <BookOpen weight="light" size={13} /> Scripture
                </p>
                <div className="space-y-1.5">
                  {topic.scripture.map((v, i) => (
                    <button
                      key={i}
                      onClick={() => setRefPopover({
                        title: v.reference,
                        meta: v.version,
                        body: v.text ?? '',
                      })}
                      className="w-full text-left text-xs rounded-lg hover:bg-muted/60 active:bg-muted px-1.5 py-1 -mx-1.5 transition-colors"
                    >
                      <span className="font-semibold text-primary">{v.reference}</span>
                      {v.version && <span className="text-muted-foreground ml-1">({v.version})</span>}
                      {v.text && <span className="text-foreground ml-2 italic">&ldquo;{v.text.slice(0, 100)}{v.text.length > 100 ? '…' : ''}&rdquo;</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {topic.catechism && topic.catechism.length > 0 && (
              <div className="border-b border-border p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Catechism</p>
                <div className="flex flex-wrap gap-1.5">
                  {topic.catechism.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => openCccPopover(c)}
                      className="rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/20 active:bg-primary/30 transition-colors"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {topic.churchFathers && topic.churchFathers.length > 0 && (
              <div className="border-b border-border p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Quotes weight="light" size={13} /> Church Fathers
                </p>
                <div className="space-y-2">
                  {topic.churchFathers.map((f, i) => (
                    <button
                      key={i}
                      onClick={() => setRefPopover({
                        title: f.author,
                        meta: f.source,
                        body: f.quote,
                      })}
                      className="w-full text-left text-xs rounded-lg hover:bg-muted/60 active:bg-muted px-1.5 py-1 -mx-1.5 transition-colors"
                    >
                      <span className="font-semibold text-foreground">{f.author}:</span>
                      <span className="text-muted-foreground ml-1 italic">&ldquo;{f.quote.slice(0, 140)}{f.quote.length > 140 ? '…' : ''}&rdquo;</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {topic.objections && topic.objections.length > 0 && (
              <div className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <ChatTeardropText weight="light" size={13} /> Objections
                </p>
                <div className="space-y-2">
                  {topic.objections.map((o, i) => (
                    <button
                      key={i}
                      onClick={() => setRefPopover({
                        title: o.objection,
                        body: o.response,
                      })}
                      className="w-full text-left text-xs rounded-lg hover:bg-muted/60 active:bg-muted px-1.5 py-1 -mx-1.5 transition-colors"
                    >
                      <span className="font-semibold text-foreground">&ldquo;{o.objection}&rdquo;</span>
                      <span className="text-muted-foreground ml-1">→ {o.response.slice(0, 120)}{o.response.length > 120 ? '…' : ''}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {topic.documentRefs && topic.documentRefs.length > 0 && (
              <div className="border-t border-border p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <BookBookmark weight="light" size={13} /> Church Documents
                </p>
                <div className="space-y-1.5">
                  {topic.documentRefs.map((r, i) => (
                    <Link
                      key={i}
                      href={`/documents/${r.docSlug}?s=${r.sectionNum}`}
                      className="flex items-start gap-2 w-full text-left text-xs rounded-lg hover:bg-muted/60 active:bg-muted px-1.5 py-1 -mx-1.5 transition-colors"
                    >
                      <span className="shrink-0 font-mono font-bold text-primary/70 bg-primary/8 rounded px-1.5 py-0.5 mt-0.5">
                        §{r.sectionNum}
                      </span>
                      <span>
                        <span className="font-semibold text-foreground">{r.docTitle}</span>
                        {r.sectionLabel && (
                          <span className="text-muted-foreground ml-1">· {r.sectionLabel.split(' · ').pop()}</span>
                        )}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {!topic.scripture.length && !topic.catechism?.length && !topic.churchFathers?.length && !topic.objections?.length && !topic.documentRefs?.length && (
              <div className="p-6 text-center text-xs text-muted-foreground">No structured references yet.</div>
            )}
          </div>

        {/* Reference popover */}
        {refPopover && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm"
            onClick={() => setRefPopover(null)}
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
                <div>
                  <p className="font-bold text-base text-foreground leading-snug">{refPopover.title}</p>
                  {refPopover.meta && (
                    <p className="text-xs text-muted-foreground mt-1">{refPopover.meta}</p>
                  )}
                </div>
                <button
                  onClick={() => setRefPopover(null)}
                  className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X weight="light" size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="px-5 pb-5 space-y-3 max-h-[60vh] overflow-y-auto">
                {refPopover.loading ? (
                  <div className="flex justify-center py-4">
                    <Spinner weight="light" size={22} className="animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-foreground leading-relaxed">{refPopover.body}</p>
                    {refPopover.debateNote && (
                      <div className="rounded-xl border-l-4 border-primary bg-primary/8 px-4 py-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1.5">Apologetics Note</p>
                        <p className="text-sm text-foreground leading-relaxed">{refPopover.debateNote}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Mark as Read + Notes */}
      <section className="mb-8 rounded-2xl bg-card p-5 shadow-sm border border-border space-y-4">
        <button
          onClick={() => (read ? markAsUnread(topic.id) : markAsRead(topic.id))}
          className={cn(
            'flex items-center gap-2 text-sm font-medium transition-colors',
            read ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {read ? (
            <CheckCircle weight="fill" size={20} />
          ) : (
            <Circle weight="light" size={20} />
          )}
          {read ? 'Marked as read' : 'Mark as read'}
        </button>

        <div>
          <label
            htmlFor={`note-${topic.id}`}
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            My Notes
          </label>
          <textarea
            id={`note-${topic.id}`}
            value={noteLocal}
            onChange={handleNoteChange}
            maxLength={NOTE_MAX_LENGTH}
            rows={3}
            placeholder="Add personal notes, reflections, or questions…"
            className="w-full resize-none rounded-xl bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="mt-1 text-right text-xs text-muted-foreground">
            {noteLocal.length}/{NOTE_MAX_LENGTH}
          </p>
        </div>
      </section>

      {/* Scripture */}
      {topic.scripture.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <BookOpen weight="light" size={16} />
            Scripture References
          </h2>
          <div className="space-y-3">
            {topic.scripture.map((verse, i) => (
              <div
                key={i}
                className="rounded-2xl bg-card p-4 shadow-sm border border-border"
              >
                <p className="mb-2 text-sm font-semibold text-primary">
                  {verse.reference}
                  {verse.version && (
                    <span className="ml-2 font-normal text-muted-foreground">
                      ({verse.version})
                    </span>
                  )}
                </p>
                <p className="text-sm text-foreground leading-relaxed italic">
                  &ldquo;{verse.text}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Catechism */}
      {topic.catechism && topic.catechism.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Catechism Citations
          </h2>
          <div className="space-y-3">
            {topic.catechism.map((ref) => {
              const num = Number(ref.replace('CCC ', ''))
              const data = cccData.get(num)
              return (
                <div key={ref} className="rounded-2xl bg-card p-4 shadow-sm border border-border">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-primary">{ref}</span>
                    <div className="flex items-center gap-2">
                      {data?.section && (
                        <span className="text-xs text-muted-foreground text-right leading-snug max-w-[50%]">
                          {data.section}
                        </span>
                      )}
                      <Link
                        href={`/catechism?p=${num}`}
                        className="shrink-0 text-xs text-primary/70 hover:text-primary transition-colors"
                        title="View in Catechism browser"
                      >
                        Browse →
                      </Link>
                    </div>
                  </div>
                  {data?.text ? (
                    <p className="text-sm text-foreground leading-relaxed italic">
                      &ldquo;{data.text}&rdquo;
                    </p>
                  ) : data?.summary ? (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {data.summary}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Loading…</p>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Church Fathers */}
      {topic.churchFathers && topic.churchFathers.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Quotes weight="light" size={16} />
            Church Fathers
          </h2>
          <div className="space-y-3">
            {topic.churchFathers.map((father, i) => (
              <div
                key={i}
                className="rounded-2xl bg-card p-4 shadow-sm border border-border"
              >
                <p className="mb-2 text-sm text-foreground leading-relaxed italic">
                  &ldquo;{father.quote}&rdquo;
                </p>
                <div className="mt-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{father.author}</span>
                  {' — '}
                  {father.source}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Objections */}
      {topic.objections && topic.objections.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <ChatTeardropText weight="light" size={16} />
            Common Objections
          </h2>
          <div className="space-y-4">
            {topic.objections.map((item, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="border-b border-border bg-muted/50 px-4 py-3">
                  <p className="text-sm font-medium text-foreground leading-snug">
                    &ldquo;{item.objection}&rdquo;
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-foreground leading-relaxed">{item.response}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tags */}
      {topic.tags.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Tags
          </h2>
          <div className="flex flex-wrap gap-2">
            {topic.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Related Topics */}
      {topic.relatedTopics && topic.relatedTopics.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Related Topics
          </h2>
          <div className="flex flex-wrap gap-2">
            {topic.relatedTopics.map((id) => (
              <Link
                key={id}
                href={`/${id}`}
                className="rounded-xl bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                {id.replace(/-/g, ' ')}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Next Topic CTA — only when navigating from a learning path */}
      {pathSlug && (() => {
        const path = (pathsData.paths as { slug: string; title: string; topicIds: string[] }[])
          .find((p) => p.slug === pathSlug)
        if (!path) return null
        const idx = path.topicIds.indexOf(initialTopic.id)
        const nextId = idx !== -1 && idx < path.topicIds.length - 1 ? path.topicIds[idx + 1] : null
        if (!nextId) {
          return (
            <div className="mb-8 rounded-2xl bg-primary/5 border border-primary/20 p-5 text-center">
              <p className="text-sm font-semibold text-primary">
                You&rsquo;ve reached the end of <span className="font-bold">{path.title}</span>!
              </p>
              <Link
                href={`/paths/${pathSlug}`}
                className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                Back to path overview
                <ArrowRight weight="light" size={15} />
              </Link>
            </div>
          )
        }
        return (
          <div className="mb-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Next in {path.title}
            </p>
            <Link
              href={`/${nextId}?path=${pathSlug}`}
              className="flex items-center justify-between gap-4 rounded-2xl bg-card border border-border p-4 shadow-sm hover:shadow-md transition-shadow group"
            >
              <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                {nextId.replace(/-/g, ' ')}
              </span>
              <ArrowRight weight="light" size={18} className="shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          </div>
        )
      })()}

      {/* Footer */}
      <footer className="text-xs text-muted-foreground">
        Last updated: {formatDate(topic.lastUpdated)}
      </footer>
    </article>
  )
}
