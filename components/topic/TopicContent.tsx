'use client'

import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
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
  Books,
  TextAa,
  ListChecks,
  Lock,
  Play,
  DotsSixVertical,
} from '@phosphor-icons/react'
import { useTopicOfflineCache } from '@/lib/useTopicOfflineCache'
import type { Topic, Term, Language } from '@/data/schema/topic.schema'
import { Badge } from '@/components/ui/badge'
import { useFavoritesStore } from '@/store/useFavoritesStore'
import { useReadingStore } from '@/store/useReadingStore'
import { useNotesStore, NOTE_MAX_LENGTH } from '@/store/useNotesStore'
import { useAppStore } from '@/store/useAppStore'
import { createClient } from '@/lib/supabase/client'
import { getUser } from '@/lib/supabase/auth'
import { formatDate, cn } from '@/lib/utils'
import { CATEGORY_GRADIENTS, categoryImageUrl } from '@/lib/content/categoryVisuals'
import { getVideoThumbnail, getVideoEmbedUrl } from '@/lib/content/videoEmbed'

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
  const wrap = (Tag: string) => {
    const Wrapped = ({ children, ...rest }: { children?: React.ReactNode; [k: string]: unknown }) =>
      React.createElement(Tag, rest, injectTerms(children, compiled, onClick))
    Wrapped.displayName = `Wrapped(${Tag})`
    return Wrapped
  }
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
  const [heroImgFailed, setHeroImgFailed] = useState(false)
  const [videoPlaying, setVideoPlaying] = useState(false)
  const [heroInView, setHeroInView] = useState(false)
  const [videoFloating, setVideoFloating] = useState(false)
  const [floatPos, setFloatPos] = useState<{ x: number; y: number } | null>(null)
  const dragOffset = useRef<{ dx: number; dy: number } | null>(null)
  const heroRef = useRef<HTMLDivElement | null>(null)
  const FLOAT_WIDTH = 320
  const FLOAT_HEIGHT = 205 // aspect-video body + drag-handle bar
  const [noteLocal, setNoteLocal] = useState('')
  const [pathSlug, setPathSlug] = useState<string | null>(null)
  // Whether this topic has any active quiz questions visible to the current
  // path (generic + this-path-only) — drives the post-read quiz prompt.
  const [hasPathQuiz, setHasPathQuiz] = useState(false)
  const [showQuizPrompt, setShowQuizPrompt] = useState(false)
  // Sequential paths block advancing to the next topic until this topic's
  // quiz is passed — 'agnostic' paths and topics without a quiz never gate.
  const [pathQuizMode, setPathQuizMode] = useState<'sequential' | 'agnostic' | null>(null)
  const [quizPassed, setQuizPassed] = useState(false)
  // Live path title + topic order for the Next Topic CTA — fetched from the
  // DB instead of public/data/content/paths.json, a static build-time
  // snapshot that goes stale the moment an admin edits a path's topic list.
  const [pathLive, setPathLive] = useState<{ title: string; topicIds: string[] } | null>(null)
  const [contentTab, setContentTab] = useState<'concise' | 'comprehensive' | 'brief'>(
    initialTopic.answerFull ? 'comprehensive' : 'concise'
  )
  const [refPopover, setRefPopover] = useState<{ title: string; meta?: string; body: string; loading?: boolean; debateNote?: string } | null>(null)
  const [cccData, setCccData] = useState<Map<number, { paragraph: number; summary: string | null; text: string | null; section: string | null }>>(new Map())

  // Reset the broken-image fallback and video state when navigating to a different topic
  useEffect(() => {
    setHeroImgFailed(false)
    setVideoPlaying(false)
    setVideoFloating(false)
  }, [displayTopic.id])

  // While the video is playing, pop it into a floating bottom-right mini
  // player once the hero scrolls out of view, so playback continues while
  // reading — and drop back to inline once the hero scrolls back into view.
  useEffect(() => {
    const el = heroRef.current
    if (!el || !videoPlaying) { setVideoFloating(false); return }
    const observer = new IntersectionObserver(
      ([entry]) => setVideoFloating(!entry.isIntersecting),
      { threshold: 0 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [videoPlaying])

  // Default the floating player to the bottom-right corner each time it
  // appears; clear the remembered position when it's hidden so it doesn't
  // reopen off-screen after a window resize.
  useLayoutEffect(() => {
    if (videoFloating) {
      setFloatPos({
        x: window.innerWidth - FLOAT_WIDTH - 16,
        y: window.innerHeight - FLOAT_HEIGHT - 16,
      })
    } else {
      setFloatPos(null)
    }
  }, [videoFloating])

  function handleDragPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!floatPos) return
    dragOffset.current = { dx: e.clientX - floatPos.x, dy: e.clientY - floatPos.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handleDragPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragOffset.current) return
    const x = Math.min(Math.max(0, e.clientX - dragOffset.current.dx), window.innerWidth - FLOAT_WIDTH)
    const y = Math.min(Math.max(0, e.clientY - dragOffset.current.dy), window.innerHeight - FLOAT_HEIGHT)
    setFloatPos({ x, y })
  }

  function handleDragPointerUp() {
    dragOffset.current = null
  }

  // One-time "draw attention" affordance on the video play button when the
  // hero scrolls into view — separate from the CSS :hover state below, which
  // handles actual mouse hover.
  useEffect(() => {
    const el = heroRef.current
    if (!el || !displayTopic.videoUrl) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHeroInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.4 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [displayTopic.id, displayTopic.videoUrl])

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
  const keyTermsKey = useMemo(
    () => displayTopic.keyTerms?.map((t) => t.slug).join(',') ?? '',
    [displayTopic.keyTerms],
  )
  const compiledTerms = useMemo(
    () => buildTermRegex(displayTopic.keyTerms ?? []),
    // keyTermsKey is a stable proxy for displayTopic.keyTerms (slug list joined) — avoids
    // recompiling the regex when the array reference changes but its contents don't
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [keyTermsKey],
  )
  // Stable component objects — only recreated when compiled regex changes
  const termComponents = useMemo(() => makeTermComponents(compiledTerms, openTermPopover), [compiledTerms])

  const favorited = isFavorite(displayTopic.id)
  const read = isRead(displayTopic.id)
  const { status: offlineStatus, supported: offlineSupported, download: downloadOffline, remove: removeOffline } = useTopicOfflineCache(initialTopic.id)

  // Read ?path= from URL (no Suspense needed — not required for SSR)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setPathSlug(params.get('path'))
  }, [])

  // Does this topic have a quiz available in the current path's context?
  // Two queries instead of one .or() filter — a question counts if it's
  // generic (path_slug NULL, reusable by any path) or scoped to this path.
  useEffect(() => {
    if (!pathSlug) { setHasPathQuiz(false); return }
    const supabase = createClient()
    const base = () =>
      supabase.from('quiz_questions').select('id').eq('topic_id', displayTopic.id).eq('active', true).limit(1)
    Promise.all([base().is('path_slug', null), base().eq('path_slug', pathSlug)]).then(
      ([generic, pathSpecific]) => setHasPathQuiz((generic.data?.length ?? 0) > 0 || (pathSpecific.data?.length ?? 0) > 0),
    )
  }, [pathSlug, displayTopic.id])

  // Live path title, topic order, and quiz_mode for the current path — the
  // Next Topic CTA below used to read public/data/content/paths.json, a
  // static build-time snapshot that goes stale the moment an admin edits a
  // path's topic list or order in the live Path Editor.
  useEffect(() => {
    if (!pathSlug) { setPathQuizMode(null); setPathLive(null); return }
    const supabase = createClient()
    Promise.all([
      supabase.from('paths').select('title, quiz_mode').eq('slug', pathSlug).maybeSingle(),
      supabase.from('path_topics').select('topic_id').eq('path_slug', pathSlug).order('position'),
    ]).then(([pathRes, topicsRes]) => {
      setPathQuizMode((pathRes.data?.quiz_mode as 'sequential' | 'agnostic' | undefined) ?? null)
      setPathLive(
        pathRes.data ? { title: pathRes.data.title, topicIds: (topicsRes.data ?? []).map((r) => r.topic_id) } : null,
      )
    })
  }, [pathSlug])

  // Has the signed-in user passed any tier of this topic's quiz?
  useEffect(() => {
    if (!pathSlug) { setQuizPassed(false); return }
    getUser().then(async (user) => {
      if (!user) { setQuizPassed(false); return }
      const { data } = await createClient()
        .from('course_progress')
        .select('tier')
        .eq('user_id', user.id)
        .eq('topic_id', displayTopic.id)
        .limit(1)
      setQuizPassed((data?.length ?? 0) > 0)
    })
  }, [pathSlug, displayTopic.id])

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
    const topicLang = initialTopic.lang
    // ccc_paragraphs is English-only today, so this always falls back to 'en'.
    // Filtering + preferring topicLang here keeps that fallback explicit and
    // avoids a same-paragraph-number collision once other languages are added.
    fetch(
      `${url}/rest/v1/ccc_paragraphs?paragraph=in.(${nums.join(',')})` +
        `&lang=in.(${topicLang},en)&select=paragraph,lang,summary,text,section`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    )
      .then((r) => r.json())
      .then((rows: { paragraph: number; lang: string; summary: string | null; text: string | null; section: string | null }[]) => {
        const map = new Map<number, { paragraph: number; summary: string | null; text: string | null; section: string | null }>()
        for (const r of rows) {
          const existing = map.get(r.paragraph)
          if (!existing || r.lang === topicLang) map.set(r.paragraph, r)
        }
        setCccData(map)
      })
      .catch(() => {/* silent — chips still show without text */})
  }, [initialTopic.catechism, initialTopic.lang])

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
  }, [displayTopic.answerFull])

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
  const heroSrc = topic.coverImage ?? categoryImageUrl(topic.category, 1200)
  const videoEmbedUrl = topic.videoUrl ? getVideoEmbedUrl(topic.videoUrl) : null
  const videoThumb = topic.videoUrl ? getVideoThumbnail(topic.videoUrl) ?? heroSrc : null
  const HEADER_HEIGHT = 24
  const showVideo = !!(videoEmbedUrl && videoPlaying)

  return (
    <div>
      {/* Hero image — full-bleed, sits behind the content card below */}
      <div ref={heroRef} className="group relative h-56 sm:h-72 w-full overflow-hidden no-print">
        <div className="absolute inset-0" style={{ background: CATEGORY_GRADIENTS[topic.category] }} />
        {/* Thumbnail fills the hero box behind the video at all times — once
            playing, the iframe below sits on top of it (inline) or has
            floated away to the corner, leaving this visible underneath. */}
        {videoEmbedUrl ? (
          !heroImgFailed && videoThumb && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={videoThumb}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              decoding="async"
              onError={() => setHeroImgFailed(true)}
            />
          )
        ) : (
          !heroImgFailed && heroSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroSrc}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              decoding="async"
              onError={() => setHeroImgFailed(true)}
            />
          )
        )}
        {videoEmbedUrl && !videoPlaying && (
          <button
            type="button"
            onClick={() => setVideoPlaying(true)}
            aria-label="Play video"
            className="absolute inset-0 h-full w-full cursor-pointer"
          >
            <div className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/35" />
            <div
              className={cn(
                'absolute inset-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-110',
                heroInView && 'animate-pulse',
              )}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg">
                <Play weight="fill" size={28} className="ml-1 text-foreground" />
              </div>
            </div>
          </button>
        )}
        {/* Single persistent iframe — kept mounted across the inline/floating
            transition (only its position/size styling changes) so playback
            isn't interrupted/restarted when it pops into the corner. */}
        {showVideo && (
          <iframe
            src={videoEmbedUrl}
            title={topic.title}
            className={cn(
              'border-0',
              videoFloating
                ? 'fixed z-50 rounded-b-xl shadow-2xl no-print'
                : 'absolute inset-0 h-full w-full',
            )}
            style={
              videoFloating && floatPos
                ? { left: floatPos.x, top: floatPos.y + HEADER_HEIGHT, width: FLOAT_WIDTH, height: FLOAT_HEIGHT - HEADER_HEIGHT }
                : undefined
            }
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
        {/* Scrim fading into the content card's background so the overlap
            reads cleanly regardless of the image's own contrast/theme */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Floating player's drag handle + close bar — the iframe itself
          stays put in the hero above, just repositioned via fixed styling. */}
      {showVideo && videoFloating && floatPos && (
        <div
          onPointerDown={handleDragPointerDown}
          onPointerMove={handleDragPointerMove}
          onPointerUp={handleDragPointerUp}
          onPointerCancel={handleDragPointerUp}
          className="fixed z-50 flex h-6 w-80 cursor-grab items-center justify-between rounded-t-xl bg-foreground/80 px-1.5 touch-none select-none active:cursor-grabbing no-print"
          style={{ left: floatPos.x, top: floatPos.y }}
        >
          <DotsSixVertical weight="bold" size={14} className="text-background" />
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setVideoPlaying(false)}
            aria-label="Close video"
            className="flex h-4 w-4 items-center justify-center rounded-full text-background hover:opacity-70"
          >
            <X weight="bold" size={12} />
          </button>
        </div>
      )}

      <article
        className={cn(
          'relative z-10 mx-auto -mt-8 max-w-3xl rounded-t-3xl bg-background px-4 pt-4',
          'shadow-[0_-12px_24px_-8px_rgba(0,0,0,0.18)] dark:shadow-[0_-12px_24px_-8px_rgba(0,0,0,0.6)]',
        )}
      >
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
                      {v.stance === 'objection' && (
                        <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Objection</span>
                      )}
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

        {/* References — sourcing for claims in the essay, shown under every
            tab (Concise/Comprehensive/Brief alike) rather than gated behind
            the Brief tab like the study-aid reference types above. */}
        {topic.citations && topic.citations.length > 0 && (
          <div className="mt-4 rounded-2xl bg-card border border-border overflow-hidden">
            <div className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Books weight="light" size={13} /> References
              </p>
              <div className="space-y-1.5">
                {topic.citations.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setRefPopover({
                      title: `${c.author}${c.work ? `, ${c.work}` : ''}`,
                      meta: c.date,
                      body: c.claim + (c.note ? ` ${c.note}` : ''),
                    })}
                    className="w-full text-left text-xs rounded-lg hover:bg-muted/60 active:bg-muted px-1.5 py-1 -mx-1.5 transition-colors"
                  >
                    <span className="font-semibold text-foreground">{c.author}</span>
                    {c.work && <span className="text-muted-foreground italic ml-1">{c.work}</span>}
                    {c.date && <span className="text-muted-foreground ml-1">({c.date})</span>}
                    {c.strength && (
                      <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary uppercase tracking-wide">
                        {c.strength.replace('-', ' ')}
                      </span>
                    )}
                    <div className="text-muted-foreground mt-0.5">{c.claim}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

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
          onClick={() => {
            if (read) {
              markAsUnread(topic.id)
            } else {
              markAsRead(topic.id)
              if (pathSlug && hasPathQuiz) setShowQuizPrompt(true)
            }
          }}
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

        {/* Persistent quiz CTA — stays visible even after the popup below is
            dismissed, so the quiz is never lost once read. */}
        {pathSlug && hasPathQuiz && (
          <Link
            href={`/quiz/${topic.id}/beginner?path=${pathSlug}`}
            className="flex items-center gap-2 rounded-xl bg-primary/8 px-3.5 py-2.5 text-sm font-medium text-primary hover:bg-primary/15 transition-colors w-fit"
          >
            <ListChecks weight="bold" size={17} />
            Take the quiz for this topic
          </Link>
        )}

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

      {/* Post-read quiz prompt — only fires once, right after marking read
          from within a learning path that has a quiz for this topic. */}
      {showQuizPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowQuizPrompt(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ListChecks weight="bold" size={18} />
                </span>
                <p className="font-bold text-base text-foreground leading-snug">Ready for the quiz?</p>
              </div>
              <button
                onClick={() => setShowQuizPrompt(false)}
                className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X weight="light" size={18} />
              </button>
            </div>
            <div className="px-5 pb-5 space-y-4">
              <p className="text-sm text-foreground leading-relaxed">
                Test what you just read with a short quiz for this topic.
              </p>
              <div className="flex gap-2">
                <Link
                  href={`/quiz/${topic.id}/beginner?path=${pathSlug}`}
                  className="flex-1 text-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Take the Quiz
                </Link>
                <button
                  onClick={() => setShowQuizPrompt(false)}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  {verse.stance === 'objection' && (
                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground align-middle">
                      Objection
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
      {pathSlug && pathLive && (() => {
        const path = pathLive
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
        // Sequential paths require passing this topic's quiz before advancing —
        // browsing/re-reading the current topic (this page) is never blocked,
        // only the shortcut to the next one.
        const quizLocked = pathQuizMode === 'sequential' && hasPathQuiz && !quizPassed
        if (quizLocked) {
          return (
            <div className="mb-8">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Next in {path.title}
              </p>
              <div className="flex items-center justify-between gap-4 rounded-2xl bg-muted/50 border border-border p-4">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock weight="light" size={16} />
                  Pass this topic&rsquo;s quiz to unlock the next topic
                </span>
                <Link
                  href={`/quiz/${initialTopic.id}/beginner?path=${pathSlug}`}
                  className="shrink-0 text-sm font-semibold text-primary hover:underline"
                >
                  Take quiz
                </Link>
              </div>
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
    </div>
  )
}
