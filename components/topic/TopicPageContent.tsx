'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Calendar, BookOpen, User, Heart, Share2, Copy, CheckCircle, Circle, StickyNote, ChevronRight } from 'lucide-react'
import { getCategoryName, getCategoryColor, getCategoryIcon } from '@/lib/utils/categories'
import Link from 'next/link'
import { TopicContent } from '@/components/topic/TopicContent'
import { getCitations } from '@/lib/content/normalize'
import { useCurrentLanguage } from '@/store/useAppStore'
import { useFavoritesStore, useFavoriteActions } from '@/store/useFavoritesStore'
import { useNotesStore } from '@/store/useNotesStore'
import { useProgressStore, useIsRead } from '@/store/useProgressStore'
import { useViewHistoryStore } from '@/store/useViewHistoryStore'
import { usePathsStore } from '@/store/usePathsStore'
import type { Topic } from '@/data/schema/topic.schema'

const NOTE_MAX = 1000

interface TopicPageContentProps {
  topicId: string
  fallbackTopic: Topic
}

export function TopicPageContent({ topicId, fallbackTopic }: TopicPageContentProps) {
  const language = useCurrentLanguage()
  const searchParams = useSearchParams()
  const pathSlug = searchParams.get('path')

  const [topicData, setTopicData] = useState<Topic>(fallbackTopic)
  const [relatedTopics, setRelatedTopics] = useState<Topic[]>([])
  const [copied, setCopied] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteSaved, setNoteSaved] = useState(false)

  const { isFavorite } = useFavoritesStore()
  const { toggleFavorite } = useFavoriteActions()
  const favorited = isFavorite(topicId)

  const { loadNotes, setNote, getNote } = useNotesStore()
  const { loadProgress, markAsRead, markAsUnread, readTopicIds } = useProgressStore()
  const isRead = useIsRead(topicId)
  const { pushView } = useViewHistoryStore()
  const { loadPaths, getNextTopic } = usePathsStore()

  const nextPathTopicId = pathSlug ? getNextTopic(pathSlug, readTopicIds) : undefined
  const nextIsAfterThis = nextPathTopicId !== topicId ? nextPathTopicId : undefined

  // Load stores on mount + track view
  useEffect(() => {
    loadNotes()
    loadProgress()
    loadPaths()
    pushView(topicId)
  }, [loadNotes, loadProgress, loadPaths, pushView, topicId])

  // Sync note text when store loads
  useEffect(() => {
    const stored = getNote(topicId)
    setNoteText(stored)
  }, [getNote, topicId])

  // Reload topic when language changes
  useEffect(() => {
    if (language === 'en') {
      setTopicData(fallbackTopic)
      return
    }

    fetch(`/data/content/${language}/handbook.json`)
      .then(r => r.json())
      .then(data => {
        const found: Topic | undefined = data.topics?.find((t: Topic) => t.id === topicId)
        if (found) setTopicData(found)
        else setTopicData(fallbackTopic)
      })
      .catch(() => setTopicData(fallbackTopic))
  }, [language, topicId, fallbackTopic])

  // Load related topics
  useEffect(() => {
    if (!topicData.relatedTopics?.length) {
      setRelatedTopics([])
      return
    }
    fetch(`/data/content/${language}/handbook.json`)
      .then(r => r.json())
      .then(data => {
        const related = data.topics?.filter((t: Topic) =>
          topicData.relatedTopics!.includes(t.id)
        ) ?? []
        setRelatedTopics(related)
      })
      .catch(() => setRelatedTopics([]))
  }, [language, topicData.relatedTopics])

  const handleFavorite = useCallback(async () => {
    await toggleFavorite(topicId)
  }, [toggleFavorite, topicId])

  const handleShare = useCallback(async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: topicData.title, text: topicData.question, url })
        return
      } catch {
        // fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available
    }
  }, [topicData.title, topicData.question])

  const handleToggleRead = useCallback(async () => {
    if (isRead) await markAsUnread(topicId)
    else await markAsRead(topicId)
  }, [isRead, markAsRead, markAsUnread, topicId])

  const handleNoteSave = useCallback(async () => {
    await setNote(topicId, noteText)
    setNoteSaved(true)
    setTimeout(() => setNoteSaved(false), 2000)
  }, [setNote, topicId, noteText])

  const citations = getCitations(topicData)
  const scriptureCount = citations.filter(c => c.type === 'scripture').length
  const fathersCount = citations.filter(c => c.type === 'church-father').length

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="container mx-auto px-4 py-8 max-w-4xl">

        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Topics
            </Link>
          </Button>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Badge className={getCategoryColor(topicData.category)}>
              <span className="mr-1">{getCategoryIcon(topicData.category)}</span>
              {getCategoryName(topicData.category)}
            </Badge>
            <Badge variant="outline">{topicData.difficulty}</Badge>
            <Badge variant="secondary">{topicData.lang.toUpperCase()}</Badge>
            {isRead && (
              <Badge variant="secondary" className="text-green-600 border-green-200 dark:border-green-800">
                <CheckCircle className="h-3 w-3 mr-1" /> Read
              </Badge>
            )}
          </div>

          <h1 className="text-3xl font-bold mb-4">{topicData.title}</h1>

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 flex-wrap">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(topicData.lastUpdated).toLocaleDateString()}
            </div>
            {scriptureCount > 0 && (
              <div className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                {scriptureCount} Scripture {scriptureCount === 1 ? 'reference' : 'references'}
              </div>
            )}
            {fathersCount > 0 && (
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {fathersCount} Church {fathersCount === 1 ? 'Father' : 'Fathers'}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {topicData.tags.map((tag: string) => (
              <Badge key={tag} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Button
            variant={favorited ? 'default' : 'outline'}
            size="sm"
            onClick={handleFavorite}
          >
            <Heart className={`h-4 w-4 mr-2 ${favorited ? 'fill-current' : ''}`} />
            {favorited ? 'Saved' : 'Add to Favorites'}
          </Button>

          <Button
            variant={isRead ? 'default' : 'outline'}
            size="sm"
            onClick={handleToggleRead}
          >
            {isRead
              ? <><CheckCircle className="h-4 w-4 mr-2" />Read</>
              : <><Circle className="h-4 w-4 mr-2" />Mark as Read</>
            }
          </Button>

          <Button
            variant={showNotes ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowNotes(v => !v)}
          >
            <StickyNote className="h-4 w-4 mr-2" />
            Notes{noteText ? ' ·' : ''}
          </Button>

          <Button variant="outline" size="sm" onClick={handleShare}>
            {copied
              ? <><Copy className="h-4 w-4 mr-2" />Copied!</>
              : <><Share2 className="h-4 w-4 mr-2" />Share</>
            }
          </Button>
        </div>

        {/* Notes panel */}
        {showNotes && (
          <div className="mb-8 border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Personal notes</p>
              <span className={`text-xs ${noteText.length > NOTE_MAX * 0.9 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {noteText.length}/{NOTE_MAX}
              </span>
            </div>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value.slice(0, NOTE_MAX))}
              placeholder="Add your personal notes, reflections, or questions about this topic…"
              className="w-full min-h-[120px] text-sm bg-background border rounded p-3 resize-y focus:outline-none focus:ring-1 focus:ring-primary"
              maxLength={NOTE_MAX}
            />
            <div className="flex justify-end mt-2">
              <Button size="sm" onClick={handleNoteSave} disabled={noteSaved}>
                {noteSaved ? 'Saved!' : 'Save note'}
              </Button>
            </div>
          </div>
        )}

        <TopicContent topic={topicData} />

        {/* Next in Path CTA */}
        {pathSlug && nextIsAfterThis && (
          <div className="mt-8 border rounded-xl p-5 bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Next in path
            </p>
            <Button asChild className="w-full sm:w-auto">
              <Link href={`/${encodeURIComponent(nextIsAfterThis)}?path=${pathSlug}`}>
                Continue Path
                <ChevronRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        )}

        {relatedTopics.length > 0 && (
          <div className="mt-8 border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Related Topics</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {relatedTopics.map((related: Topic) => (
                <Link
                  key={related.id}
                  href={`/${encodeURIComponent(related.id)}`}
                  className="block p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getCategoryColor(related.category)}>
                      {getCategoryIcon(related.category)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {getCategoryName(related.category)}
                    </span>
                  </div>
                  <h3 className="font-medium mb-1">{related.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {related.question}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
