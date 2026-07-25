import { cachedLibraryFetch } from '@/lib/libraryCache'

export interface CccParagraph {
  paragraph: number
  text: string
  summary: string
  section: string
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

export const PAGE_SIZE = 1000

export async function fetchParagraphs(from: number, to: number): Promise<CccParagraph[]> {
  try {
    const all: CccParagraph[] = []
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const params = new URLSearchParams({
        paragraph: `gte.${from}`,
        and: `(paragraph.lte.${to})`,
        lang: 'eq.en',
        text: 'not.is.null',
        order: 'paragraph.asc',
        select: 'paragraph,text,summary,section',
        limit: String(PAGE_SIZE),
        offset: String(offset),
      })
      const res = await cachedLibraryFetch(
        `${SUPABASE_URL}/rest/v1/ccc_paragraphs?${params}`,
        { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      )
      if (!res.ok) return all
      const page: CccParagraph[] = await res.json()
      all.push(...page)
      if (page.length < PAGE_SIZE) break
    }
    return all
  } catch {
    return []
  }
}
