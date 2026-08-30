import type { Category } from '@/data/schema/topic.schema'

// Gradient fallback shown while/if a category's photo fails to load
export const CATEGORY_GRADIENTS: Record<Category, string> = {
  bible:            'linear-gradient(135deg,#1e3a5f,#2563eb)',
  'church-teaching':'linear-gradient(135deg,#1e3a5f,#7c3aed)',
  mary:             'linear-gradient(135deg,#701a75,#c026d3)',
  tradition:        'linear-gradient(135deg,#713f12,#d97706)',
  saints:           'linear-gradient(135deg,#14532d,#16a34a)',
  papacy:           'linear-gradient(135deg,#1e3a5f,#0891b2)',
  sacraments:       'linear-gradient(135deg,#0c4a6e,#06b6d4)',
  salvation:        'linear-gradient(135deg,#7f1d1d,#dc2626)',
}

// Curated Unsplash photos — one per category
// URL: https://images.unsplash.com/photo-{id}?w=800&auto=format&fit=crop&q=80
const UNSPLASH_IDS: Record<Category, string> = {
  bible:            '1504052434569-70ad5836ab65',
  'church-teaching':'1438032005730-c779502df39b',
  mary:             '1544761634-dc512f2238a3',
  tradition:        '1520769945061-0a448c463865',
  saints:           '1548164557-fd01dc0e7485',
  papacy:           '1531572753322-ad063cecc140',
  sacraments:       '1547592180-85f173990554',
  salvation:        '1499209974431-9dddcece7f88',
}

export function categoryImageUrl(category: Category, width = 800): string {
  return `https://images.unsplash.com/photo-${UNSPLASH_IDS[category]}?w=${width}&auto=format&fit=crop&q=80`
}
