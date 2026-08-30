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

// Curated Unsplash photos — one per category, only once verified to actually
// depict the category (a live 200 isn't enough proof — mary/sacraments/saints
// previously pointed at a real, loading photo of the wrong subject entirely).
// Categories missing here fall back to the gradient above until replaced.
const UNSPLASH_IDS: Partial<Record<Category, string>> = {
  bible:            '1504052434569-70ad5836ab65',
  'church-teaching':'1438032005730-c779502df39b',
  tradition:        '1520769945061-0a448c463865',
  papacy:           '1531572753322-ad063cecc140',
  salvation:        '1499209974431-9dddcece7f88',
}

export function categoryImageUrl(category: Category, width = 800): string | undefined {
  const id = UNSPLASH_IDS[category]
  return id ? `https://images.unsplash.com/photo-${id}?w=${width}&auto=format&fit=crop&q=80` : undefined
}
