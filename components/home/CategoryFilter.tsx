'use client'

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
import type { Category } from '@/data/schema/topic.schema'
import { cn } from '@/lib/utils'

const categories: { value: Category | ''; label: string; Icon: React.ElementType }[] = [
  { value: '', label: 'All', Icon: BookOpen },
  { value: 'bible', label: 'Bible', Icon: BookOpen },
  { value: 'church-teaching', label: 'Church Teaching', Icon: Buildings },
  { value: 'mary', label: 'Mary', Icon: Flower },
  { value: 'tradition', label: 'Tradition', Icon: Scroll },
  { value: 'saints', label: 'Saints', Icon: Star },
  { value: 'papacy', label: 'Papacy', Icon: Crown },
  { value: 'sacraments', label: 'Sacraments', Icon: Drop },
  { value: 'salvation', label: 'Salvation', Icon: Heart },
]

interface CategoryFilterProps {
  selected: Category | ''
  onChange: (cat: Category | '') => void
}

export function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  return (
    <div className="px-4 pb-2">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map(({ value, label, Icon }) => {
          const active = selected === value
          return (
            <button
              key={value || 'all'}
              onClick={() => onChange(value)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/30',
              )}
            >
              <Icon weight={active ? 'fill' : 'light'} size={14} />
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
