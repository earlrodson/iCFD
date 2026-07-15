'use client'

import Link from 'next/link'
import {
  BookOpen,
  Buildings,
  Flower,
  Scroll,
  Star,
  Crown,
  Drop,
  Heart,
} from '@phosphor-icons/react'
import type { Topic, Category } from '@/data/schema/topic.schema'
import { Badge } from '@/components/ui/badge'
import { useFavoritesStore } from '@/store/useFavoritesStore'
import { truncate } from '@/lib/utils'

const categoryIcons: Record<Category, React.ElementType> = {
  bible: BookOpen,
  'church-teaching': Buildings,
  mary: Flower,
  tradition: Scroll,
  saints: Star,
  papacy: Crown,
  sacraments: Drop,
  salvation: Heart,
}

interface TopicCardProps {
  topic: Topic
}

export function TopicCard({ topic }: TopicCardProps) {
  const { toggleFavorite, isFavorite } = useFavoritesStore()
  const favorited = isFavorite(topic.id)
  const CategoryIcon = categoryIcons[topic.category]

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleFavorite(topic.id)
  }

  return (
    <Link href={`/${topic.id}`} className="block group">
      <article className="relative h-full rounded-2xl bg-card p-4 shadow-sm border border-border transition-shadow hover:shadow-md">
        {/* Header row */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
              <CategoryIcon weight="light" size={18} />
            </span>
            <Badge variant="category" value={topic.category} />
          </div>

          <button
            onClick={handleFavorite}
            className="shrink-0 p-1 rounded-lg text-muted-foreground hover:text-red-500 transition-colors"
            aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart
              weight={favorited ? 'fill' : 'light'}
              size={18}
              className={favorited ? 'text-red-500' : ''}
            />
          </button>
        </div>

        {/* Title */}
        <h3 className="mb-1 font-semibold text-foreground leading-snug line-clamp-2">
          {topic.title}
        </h3>

        {/* Question excerpt */}
        <p className="mb-3 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {truncate(topic.question, 120)}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <Badge variant="difficulty" value={topic.difficulty} />
          <span className="text-xs text-muted-foreground">
            {topic.scripture.length} verse{topic.scripture.length !== 1 ? 's' : ''}
          </span>
        </div>
      </article>
    </Link>
  )
}
