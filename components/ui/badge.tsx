import { cn } from '@/lib/utils'
import type { Category, Difficulty } from '@/data/schema/topic.schema'

const categoryDot: Record<Category, string> = {
  bible:            'bg-blue-500',
  'church-teaching':'bg-violet-500',
  mary:             'bg-pink-500',
  tradition:        'bg-amber-500',
  saints:           'bg-emerald-500',
  papacy:           'bg-indigo-500',
  sacraments:       'bg-sky-500',
  salvation:        'bg-rose-500',
}

const difficultyDot: Record<Difficulty, string> = {
  beginner:     'bg-emerald-500',
  intermediate: 'bg-amber-500',
  advanced:     'bg-rose-500',
}

interface BadgeProps {
  variant: 'category' | 'difficulty'
  value: Category | Difficulty
  className?: string
}

export function Badge({ variant, value, className }: BadgeProps) {
  const dot = variant === 'category'
    ? categoryDot[value as Category]
    : difficultyDot[value as Difficulty]

  const label =
    value === 'church-teaching'
      ? 'Church Teaching'
      : value.charAt(0).toUpperCase() + value.slice(1)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200',
        'dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dot)} />
      {label}
    </span>
  )
}
