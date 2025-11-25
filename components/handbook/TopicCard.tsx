'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Heart, BookOpen, Clock } from 'lucide-react'
import { useFavoritesStore, useFavoriteActions } from '@/store/useFavoritesStore'
import type { Topic } from '@/data/schema/topic.schema'
import { cn } from '@/lib/utils'
import { getCategoryName, getCategoryIcon, getDifficultyLabel, formatRelativeTime } from '@/lib/utils'

interface TopicCardProps {
  topic: Topic
  onClick?: (topic: Topic) => void
  onFavoriteToggle?: (topicId: string, isFavorited: boolean) => void
  showFavorite?: boolean
  showCategory?: boolean
  showDifficulty?: boolean
  showExcerpt?: boolean
  compact?: boolean
  className?: string
}

export function TopicCard({
  topic,
  onClick,
  onFavoriteToggle,
  showFavorite = true,
  showCategory = true,
  showDifficulty = true,
  showExcerpt = true,
  compact = false,
  className
}: TopicCardProps) {
  const { isFavorite } = useFavoritesStore()
  const { toggleFavorite } = useFavoriteActions()

  const isFavorited = isFavorite(topic.id)

  const handleCardClick = () => {
    onClick?.(topic)
  }

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const newFavoriteState = await toggleFavorite(topic.id)
    onFavoriteToggle?.(topic.id, newFavoriteState)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleCardClick()
    }
  }

  if (compact) {
    return (
      <Card
        className={cn(
          "topic-card cursor-pointer hover:shadow-md transition-all duration-200",
          className
        )}
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`View topic: ${topic.title}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between space-x-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-lg">{getCategoryIcon(topic.category)}</span>
                <Badge variant="secondary" className="text-xs">
                  {getCategoryName(topic.category)}
                </Badge>
                <Badge variant="outline" className={`difficulty-${topic.difficulty} text-xs`}>
                  {getDifficultyLabel(topic.difficulty)}
                </Badge>
              </div>
              <h3 className="font-semibold text-sm leading-tight line-clamp-2">
                {topic.title}
              </h3>
            </div>
            {showFavorite && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={handleFavoriteClick}
                aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart
                  className={cn(
                    "h-4 w-4",
                    isFavorited ? "fill-red-500 text-red-500" : "text-gray-400"
                  )}
                />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        "topic-card cursor-pointer hover:shadow-lg transition-all duration-300 group",
        className
      )}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View topic: ${topic.title}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between space-y-2">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-lg">{getCategoryIcon(topic.category)}</span>
              <Badge variant="secondary" className="category-sacraments">
                {getCategoryName(topic.category)}
              </Badge>
              {showDifficulty && (
                <Badge variant="outline" className={`difficulty-${topic.difficulty}`}>
                  {getDifficultyLabel(topic.difficulty)}
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
              {topic.title}
            </CardTitle>
          </div>
          {showFavorite && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleFavoriteClick}
              aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart
                className={cn(
                  "h-4 w-4",
                  isFavorited ? "fill-red-500 text-red-500" : "text-gray-400"
                )}
              />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {showExcerpt && (
          <CardDescription className="text-sm leading-relaxed">
            <div className="flex items-start space-x-2">
              <BookOpen className="h-4 w-4 text-catholic-gold mt-0.5 flex-shrink-0" />
              <span className="line-clamp-3">
                {topic.question}
              </span>
            </div>
          </CardDescription>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-4">
            {topic.scripture && topic.scripture.length > 0 && (
              <div className="flex items-center space-x-1">
                <BookOpen className="h-3 w-3" />
                <span>{topic.scripture.length} scripture{topic.scripture.length !== 1 ? 's' : ''}</span>
              </div>
            )}

            {topic.churchFathers && topic.churchFathers.length > 0 && (
              <div className="flex items-center space-x-1">
                <span>📜</span>
                <span>{topic.churchFathers.length} quote{topic.churchFathers.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>{formatRelativeTime(topic.lastUpdated)}</span>
          </div>
        </div>

        {topic.tags && topic.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {topic.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {topic.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{topic.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Topic card grid component
interface TopicCardGridProps {
  topics: Topic[]
  loading?: boolean
  onTopicClick?: (topic: Topic) => void
  onFavoriteToggle?: (topicId: string, isFavorited: boolean) => void
  columns?: 1 | 2 | 3 | 4
  compact?: boolean
  className?: string
}

export function TopicCardGrid({
  topics,
  loading = false,
  onTopicClick,
  onFavoriteToggle,
  columns = 3,
  compact = false,
  className
}: TopicCardGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
  }

  if (loading) {
    return (
      <div className={cn("grid gap-4", gridCols[columns], className)}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (topics.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground text-lg">
          No topics found
        </div>
        <p className="text-muted-foreground text-sm mt-2">
          Try adjusting your search or filters
        </p>
      </div>
    )
  }

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {topics.map((topic) => (
        <TopicCard
          key={topic.id}
          topic={topic}
          onClick={onTopicClick}
          onFavoriteToggle={onFavoriteToggle}
          compact={compact}
        />
      ))}
    </div>
  )
}