export type Category = 'sacraments' | 'mary' | 'papacy' | 'salvation' | 'bible' | 'saints' | 'tradition' | 'church-teaching'

export interface CategoryInfo {
  name: string
  description: string
  icon: string
  color: string
}

export const categoryInfo: Record<Category, CategoryInfo> = {
  sacraments: {
    name: 'Sacraments',
    description: 'The seven sacraments of the Catholic Church',
    icon: '✝️',
    color: 'bg-purple-100 text-purple-800'
  },
  mary: {
    name: 'Mary',
    description: 'Teachings about the Blessed Virgin Mary',
    icon: '🌹',
    color: 'bg-pink-100 text-pink-800'
  },
  papacy: {
    name: 'Papacy',
    description: 'The Papacy and Papal Authority',
    icon: '👑',
    color: 'bg-yellow-100 text-yellow-800'
  },
  salvation: {
    name: 'Salvation',
    description: 'Salvation and Christian Life',
    icon: '🙏',
    color: 'bg-blue-100 text-blue-800'
  },
  bible: {
    name: 'Bible',
    description: 'Scripture and Biblical Interpretation',
    icon: '📖',
    color: 'bg-green-100 text-green-800'
  },
  saints: {
    name: 'Saints',
    description: 'Saints and their teachings',
    icon: '👼',
    color: 'bg-indigo-100 text-indigo-800'
  },
  tradition: {
    name: 'Tradition',
    description: 'Sacred Tradition and Church History',
    icon: '⛪',
    color: 'bg-orange-100 text-orange-800'
  },
  'church-teaching': {
    name: 'Church Teaching',
    description: 'Official Church Teachings and Documents',
    icon: '📜',
    color: 'bg-red-100 text-red-800'
  }
}

/**
 * Get the display name for a category
 */
export function getCategoryName(category: Category): string {
  return categoryInfo[category]?.name || category
}

/**
 * Get the icon for a category
 */
export function getCategoryIcon(category: Category): string {
  return categoryInfo[category]?.icon || '📚'
}

/**
 * Get the color class for a category badge
 */
export function getCategoryColor(category: Category): string {
  return categoryInfo[category]?.color || 'bg-gray-100 text-gray-800'
}

/**
 * Get the description for a category
 */
export function getCategoryDescription(category: Category): string {
  return categoryInfo[category]?.description || 'Catholic apologetics content'
}

/**
 * Get all categories as an array of category information
 */
export function getAllCategories(): Array<{ category: Category } & CategoryInfo> {
  return Object.entries(categoryInfo).map(([category, info]) => ({
    category: category as Category,
    ...info
  }))
}

/**
 * Get categories sorted by display name
 */
export function getSortedCategories(): Array<{ category: Category } & CategoryInfo> {
  return getAllCategories().sort((a, b) => a.name.localeCompare(b.name))
}