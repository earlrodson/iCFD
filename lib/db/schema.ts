import type { DBSchema, IDBPDatabase } from 'idb'
import type { Topic } from '@/data/schema/topic.schema'

interface DefenderDB extends DBSchema {
  topics: {
    key: string
    value: Topic
    indexes: {
      'by-category': string
      'by-lang': string
      'by-tags': string
      'by-difficulty': string
    }
  }
  favorites: {
    key: string
    value: {
      topicId: string
      addedAt: number
      syncedToCloud: boolean
    }
  }
  settings: {
    key: string
    value: {
      key: string
      language: 'en' | 'tl' | 'ceb'
      theme: 'light' | 'dark' | 'system'
      fontSize: 'small' | 'medium' | 'large'
      autoSync: boolean
      lastSync: string | null
      searchFilters: {
        categories: string[]
        difficulties: string[]
        showScripture: boolean
        showChurchFathers: boolean
      }
    }
  }
  searchIndex: {
    key: string
    value: {
      lang: string
      index: any
      version: string
      timestamp: number
    }
  }
  cache: {
    key: string
    value: {
      key: string
      data: any
      timestamp: number
      expiresAt: number
    }
  }
  bibleChapters: {
    key: string  // "{version}-{book}-{chapter}" e.g. "NABRE-John-3"
    value: {
      key: string
      book: string
      chapter: number
      version: string
      verses: Record<string, string>  // { "1": "In the beginning...", "16": "For God so loved..." }
      fetchedAt: number
      expiresAt: number               // 30-day TTL
    }
  }
}

export type DefenderDBType = IDBPDatabase<DefenderDB>
export type { DefenderDB }
