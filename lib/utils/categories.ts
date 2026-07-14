import {
  Drop, Flower, Crown, Heart, BookOpen, Star, Buildings, Scroll
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

export type Category =
  | 'sacraments' | 'mary' | 'papacy' | 'salvation'
  | 'bible' | 'saints' | 'tradition' | 'church-teaching'

export interface CategoryInfo {
  name: string
  description: string
  Icon: Icon
  color: string
}

export const categoryInfo: Record<Category, CategoryInfo> = {
  sacraments: {
    name: 'Sacraments',
    description: 'The seven sacraments of the Catholic Church',
    Icon: Drop,
    color: 'bg-purple-100 text-purple-800',
  },
  mary: {
    name: 'Mary',
    description: 'Teachings about the Blessed Virgin Mary',
    Icon: Flower,
    color: 'bg-pink-100 text-pink-800',
  },
  papacy: {
    name: 'Papacy',
    description: 'The Papacy and Papal Authority',
    Icon: Crown,
    color: 'bg-yellow-100 text-yellow-800',
  },
  salvation: {
    name: 'Salvation',
    description: 'Salvation and Christian Life',
    Icon: Heart,
    color: 'bg-blue-100 text-blue-800',
  },
  bible: {
    name: 'Bible',
    description: 'Scripture and Biblical Interpretation',
    Icon: BookOpen,
    color: 'bg-green-100 text-green-800',
  },
  saints: {
    name: 'Saints',
    description: 'Saints and their teachings',
    Icon: Star,
    color: 'bg-indigo-100 text-indigo-800',
  },
  tradition: {
    name: 'Tradition',
    description: 'Sacred Tradition and Church History',
    Icon: Buildings,
    color: 'bg-orange-100 text-orange-800',
  },
  'church-teaching': {
    name: 'Church Teaching',
    description: 'Official Church Teachings and Documents',
    Icon: Scroll,
    color: 'bg-red-100 text-red-800',
  },
}

export function getCategoryName(category: string): string {
  return categoryInfo[category as Category]?.name ?? category
}

export function getCategoryIcon(category: string): Icon {
  return categoryInfo[category as Category]?.Icon ?? BookOpen
}

export function getCategoryColor(category: string): string {
  return categoryInfo[category as Category]?.color ?? 'bg-gray-100 text-gray-800'
}

export function getCategoryDescription(category: string): string {
  return categoryInfo[category as Category]?.description ?? 'Catholic apologetics content'
}

export function getAllCategories(): Array<{ category: Category } & CategoryInfo> {
  return Object.entries(categoryInfo).map(([category, info]) => ({
    category: category as Category,
    ...info,
  }))
}

export function getSortedCategories(): Array<{ category: Category } & CategoryInfo> {
  return getAllCategories().sort((a, b) => a.name.localeCompare(b.name))
}
