import { getCategoryIcon } from '@/lib/utils/categories'
import { cn } from '@/lib/utils'

interface CategoryIconProps {
  category: string
  className?: string
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone'
}

export function CategoryIcon({ category, className, weight = 'light' }: CategoryIconProps) {
  const Icon = getCategoryIcon(category)
  return <Icon weight={weight} className={cn('h-4 w-4', className)} />
}
