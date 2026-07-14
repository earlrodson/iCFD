import { HandbookContentSchema, type HandbookContent, type Language } from '@/data/schema/topic.schema'

class ContentLoader {
  private cache: Map<Language, HandbookContent> = new Map()

  async loadContent(lang: Language): Promise<HandbookContent> {
    const cached = this.cache.get(lang)
    if (cached) return cached

    const response = await fetch(`/data/content/${lang}/handbook.json`)
    if (!response.ok) {
      throw new Error(`Failed to fetch handbook for language "${lang}": ${response.status}`)
    }

    const raw: unknown = await response.json()
    const parsed = HandbookContentSchema.parse(raw)

    this.cache.set(lang, parsed)
    return parsed
  }

  clearCache() {
    this.cache.clear()
  }
}

// Singleton
export const contentLoader = new ContentLoader()
