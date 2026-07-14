import { cn } from '@/lib/utils'
import type { Category, Difficulty } from '@/data/schema/topic.schema'

const categoryColors: Record<Category, string> = {
  bible: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'church-teaching': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  mary: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  tradition: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  saints: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  papacy: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  sacraments: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  salvation: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
}

const difficultyColors: Record<Difficulty, string> = {
  beginner: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  intermediate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  advanced: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

interface BadgeProps {
  variant: 'category' | 'difficulty'
  value: Category | Difficulty
  className?: string
}

export function Badge({ variant, value, className }: BadgeProps) {
  const colorClass =
    variant === 'category'
      ? categoryColors[value as Category]
      : difficultyColors[value as Difficulty]

  const label = value === 'church-teaching' ? 'Church Teaching' : value.charAt(0).toUpperCase() + value.slice(1)

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize',
        colorClass,
        className,
      )}
    >
      {label}
    </span>
  )
}
