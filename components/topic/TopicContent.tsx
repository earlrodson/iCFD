'use client'

import { useState, useEffect } from 'react'
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
} from '@phosphor-icons/react'
import { useTopicOfflineCache } from '@/lib/useTopicOfflineCache'
import type { Topic } from '@/data/schema/topic.schema'
import { Badge } from '@/components/ui/badge'
import { useFavoritesStore } from '@/store/useFavoritesStore'
import { useReadingStore } from '@/store/useReadingStore'
import { useNotesStore, NOTE_MAX_LENGTH } from '@/store/useNotesStore'
import { useAppStore } from '@/store/useAppStore'
import { formatDate, cn } from '@/lib/utils'
import pathsData from '@/public/data/content/paths.json'

const LANGUAGE_NAMES: Record<string, string> = { en: 'English', tl: 'Tagalog', ceb: 'Cebuano' }

interface TopicContentProps {
  topic: Topic
}

export function TopicContent({ topic: initialTopic }: TopicContentProps) {
  const { availableTopics, currentLanguage, initialize } = useAppStore()
  const { toggleFavorite, isFavorite } = useFavoritesStore()
  const { markAsRead, markAsUnread, isRead, recordVisit } = useReadingStore()
  const notes = useNotesStore((s) => s.notes)
  const { setNote } = useNotesStore()

  const [displayTopic, setDisplayTopic] = useState(initialTopic)
  const [notAvailable, setNotAvailable] = useState(false)
  const [copied, setCopied] = useState(false)
  const [noteLocal, setNoteLocal] = useState('')
  const [pathSlug, setPathSlug] = useState<string | null>(null)
  const [contentTab, setContentTab] = useState<'concise' | 'comprehensive' | 'brief'>('concise')

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
        setDisplayTopic(found)
        setNotAvailable(false)
      } else {
        setDisplayTopic(initialTopic)
        setNotAvailable(currentLanguage !== 'en')
      }
    }
  }, [availableTopics, initialTopic, currentLanguage, initialize])

  // Record visit once per mount
  useEffect(() => {
    recordVisit(initialTopic.id)
  }, [initialTopic.id, recordVisit])

  // Sync note text when topic changes
  useEffect(() => {
    setNoteLocal(notes[initialTopic.id] ?? '')
  }, [initialTopic.id]) // eslint-disable-line react-hooks/exhaustive-deps

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
          Not available in {LANGUAGE_NAMES[currentLanguage] ?? currentLanguage} — showing English
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
            onClick={() => setContentTab('brief')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              contentTab === 'brief'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Apol. Brief
          </button>
        </div>

        {/* Concise */}
        {contentTab === 'concise' && (
          <div className="rounded-b-2xl rounded-tr-2xl bg-card p-5 shadow-sm border border-t-0 border-border">
            <p className="text-foreground leading-relaxed whitespace-pre-line">{topic.answer}</p>
          </div>
        )}

        {/* Comprehensive */}
        {contentTab === 'comprehensive' && topic.answerFull && (
          <div className="rounded-b-2xl rounded-tr-2xl bg-card p-5 shadow-sm border border-t-0 border-border prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {topic.answerFull}
            </ReactMarkdown>
          </div>
        )}

        {/* Apologetics Brief — compact reference card */}
        {contentTab === 'brief' && (
          <div className="rounded-b-2xl rounded-tr-2xl bg-card border border-t-0 border-border overflow-hidden">
            {topic.scripture.length > 0 && (
              <div className="border-b border-border p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <BookOpen weight="light" size={13} /> Scripture
                </p>
                <div className="space-y-1.5">
                  {topic.scripture.map((v, i) => (
                    <div key={i} className="text-xs">
                      <span className="font-semibold text-primary">{v.reference}</span>
                      {v.version && <span className="text-muted-foreground ml-1">({v.version})</span>}
                      {v.text && <span className="text-foreground ml-2 italic">&ldquo;{v.text.slice(0, 120)}{v.text.length > 120 ? '…' : ''}&rdquo;</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {topic.catechism && topic.catechism.length > 0 && (
              <div className="border-b border-border p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Catechism</p>
                <div className="flex flex-wrap gap-1.5">
                  {topic.catechism.map((c, i) => (
                    <span key={i} className="rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{c}</span>
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
                    <div key={i} className="text-xs">
                      <span className="font-semibold text-foreground">{f.author}:</span>
                      <span className="text-muted-foreground ml-1 italic">&ldquo;{f.quote.slice(0, 140)}{f.quote.length > 140 ? '…' : ''}&rdquo;</span>
                    </div>
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
                    <div key={i} className="text-xs">
                      <span className="font-semibold text-foreground">&ldquo;{o.objection}&rdquo;</span>
                      <span className="text-muted-foreground ml-1">→ {o.response.slice(0, 120)}{o.response.length > 120 ? '…' : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!topic.scripture.length && !topic.catechism?.length && !topic.churchFathers?.length && !topic.objections?.length && (
              <div className="p-6 text-center text-xs text-muted-foreground">No structured references yet.</div>
            )}
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
            Catechism References
          </h2>
          <div className="flex flex-wrap gap-2">
            {topic.catechism.map((ref) => (
              <span
                key={ref}
                className="rounded-lg bg-card border border-border px-3 py-1.5 text-sm font-medium text-foreground shadow-sm"
              >
                {ref}
              </span>
            ))}
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
