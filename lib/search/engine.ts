import MiniSearch from 'minisearch'
import type { Topic } from '@/data/schema/topic.schema'

interface SearchDocument {
  id: string
  title: string
  question: string
  answer: string
  tags: string
  category: string
  difficulty: string
}

export interface SearchResult {
  id: string
  score: number
  match: Record<string, string[]>
}

export class SearchEngine {
  private miniSearch: MiniSearch<SearchDocument>
  private indexed = false

  constructor() {
    this.miniSearch = new MiniSearch<SearchDocument>({
      fields: ['title', 'question', 'answer', 'tags'],
      storeFields: ['id', 'category', 'difficulty'],
      searchOptions: {
        boost: { title: 3, tags: 2, question: 1, answer: 1 },
        fuzzy: 0.2,
        prefix: true,
      },
    })
  }

  index(topics: Topic[]) {
    if (this.indexed) {
      this.miniSearch.removeAll()
    }

    const docs: SearchDocument[] = topics.map((t) => ({
      id: t.id,
      title: t.title,
      question: t.question,
      answer: t.answer,
      tags: t.tags.join(' '),
      category: t.category,
      difficulty: t.difficulty,
    }))

    this.miniSearch.addAll(docs)
    this.indexed = true
  }

  search(query: string): SearchResult[] {
    if (!query.trim() || !this.indexed) return []

    return this.miniSearch.search(query).map((r) => ({
      id: String(r.id),
      score: r.score,
      match: r.match as Record<string, string[]>,
    }))
  }

  isIndexed() {
    return this.indexed
  }
}

// Singleton
export const searchEngine = new SearchEngine()
