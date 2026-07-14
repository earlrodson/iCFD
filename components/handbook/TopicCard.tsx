'use client'

import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { Topic } from '@/data/schema/topic.schema'
import { cn } from '@/lib/utils'
import { getCategoryName, getCategoryIcon, type Category } from '@/lib/utils/categories'
import { getDifficultyLabel } from '@/lib/utils/general'

// ── Topic Row — iOS list item ─────────────────────────────────────────────────

interface TopicRowProps {
  topic: Topic
  className?: string
}

export function TopicRow({ topic, className }: TopicRowProps) {
  const router = useRouter()
  const { currentLanguage: language } = useAppStore()

  return (
    <button
      onClick={() => router.push(`/${encodeURIComponent(topic.id)}?lang=${language}`)}
      className={cn(
        'w-full flex items-center px-4 py-3 text-left bg-card transition-colors active:bg-muted',
        className
      )}
    >
      <span className="text-[22px] mr-3 shrink-0 leading-none w-8 text-center">
        {getCategoryIcon(topic.category as Category)}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[16px] font-medium text-foreground leading-snug line-clamp-1">
          {topic.title}
        </p>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          {getCategoryName(topic.category)} · {getDifficultyLabel(topic.difficulty)}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0 ml-2" />
    </button>
  )
}

// ── Topic List — grouped container with dividers ──────────────────────────────

interface TopicListProps {
  topics: Topic[]
  className?: string
}

export function TopicList({ topics, className }: TopicListProps) {
  if (topics.length === 0) return null
  return (
    <div
      className={cn(
        'rounded-2xl bg-card overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.07),0_0_1px_rgba(0,0,0,0.04)]',
        className
      )}
    >
      {topics.map((topic, i) => (
        <div key={topic.id} className={i > 0 ? 'border-t border-border' : undefined}>
          <TopicRow topic={topic} />
        </div>
      ))}
    </div>
  )
}

// ── Topic Card — featured card (Today's Topic, Continue Reading, etc.) ────────

interface TopicCardProps {
  topic: Topic
  className?: string
  // legacy props accepted but ignored — all rendering is unified now
  showCategory?: boolean
  showDifficulty?: boolean
  showExcerpt?: boolean
  compact?: boolean
  onClick?: (topic: Topic) => void
  onFavoriteToggle?: (topicId: string, isFavorited: boolean) => void
  showFavorite?: boolean
}

export function TopicCard({ topic, className, onClick }: TopicCardProps) {
  const router = useRouter()
  const { currentLanguage: language } = useAppStore()

  const handleClick = () => {
    router.push(`/${encodeURIComponent(topic.id)}?lang=${language}`)
    onClick?.(topic)
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full rounded-2xl bg-card p-4 text-left transition-colors active:bg-muted shadow-[0_1px_4px_rgba(0,0,0,0.07),0_0_1px_rgba(0,0,0,0.04)]',
        className
      )}
    >
      <p className="text-[12px] text-muted-foreground font-medium mb-1.5 flex items-center gap-1">
        <span>{getCategoryIcon(topic.category as Category)}</span>
        <span>{getCategoryName(topic.category)}</span>
        <span className="mx-0.5">·</span>
        <span>{getDifficultyLabel(topic.difficulty)}</span>
      </p>
      <h3 className="text-[17px] font-semibold text-foreground leading-snug mb-1.5">
        {topic.title}
      </h3>
      <p className="text-[14px] text-muted-foreground line-clamp-2 leading-relaxed">
        {topic.question}
      </p>
    </button>
  )
}

// ── Topic Card Grid — kept for search results, renders as list ────────────────

interface TopicCardGridProps {
  topics: Topic[]
  loading?: boolean
  onTopicClick?: (topic: Topic) => void
  onFavoriteToggle?: (topicId: string, isFavorited: boolean) => void
  columns?: number
  compact?: boolean
  className?: string
}

export function TopicCardGrid({ topics, loading, className }: TopicCardGridProps) {
  if (loading) {
    return (
      <div className={cn('rounded-2xl bg-card overflow-hidden shadow-sm', className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={cn('flex items-center px-4 py-3', i > 0 && 'border-t border-border')}>
            <div className="w-8 h-8 rounded-lg bg-muted animate-pulse mr-3 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
              <div className="h-3 bg-muted rounded animate-pulse w-1/3" />
            </div>
          </div>
        ))}
      </div>
    )
  }
  return <TopicList topics={topics} className={className} />
}
