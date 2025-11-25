import { openDB, IDBPDatabase } from 'idb'
import type { DefenderDB } from './schema'
import type { Topic, HandbookContent } from '@/data/schema/topic.schema'

class DatabaseManager {
  private db: IDBPDatabase<DefenderDB> | null = null
  private readonly DB_NAME = 'catholic-defender'
  private readonly DB_VERSION = 1

  async getDB(): Promise<IDBPDatabase<DefenderDB>> {
    if (!this.db) {
      this.db = await openDB<DefenderDB>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db, oldVersion, newVersion) {
          // Create topics store
          if (!db.objectStoreNames.contains('topics')) {
            const topicsStore = db.createObjectStore('topics', { keyPath: 'id' })
            topicsStore.createIndex('by-category', 'category')
            topicsStore.createIndex('by-lang', 'lang')
            topicsStore.createIndex('by-tags', 'tags', { multiEntry: true })
            topicsStore.createIndex('by-difficulty', 'difficulty')
          }

          // Create favorites store
          if (!db.objectStoreNames.contains('favorites')) {
            db.createObjectStore('favorites', { keyPath: 'topicId' })
          }

          // Create settings store
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' })
          }

          // Create search index store
          if (!db.objectStoreNames.contains('searchIndex')) {
            db.createObjectStore('searchIndex', { keyPath: 'lang' })
          }

          // Create cache store
          if (!db.objectStoreNames.contains('cache')) {
            db.createObjectStore('cache', { keyPath: 'key' })
          }
        },
        blocked() {
          console.warn('Database upgrade blocked')
        },
        blocking() {
          console.warn('Database blocking other connections')
        },
      })
    }
    return this.db
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }

  async clear(): Promise<void> {
    const db = await this.getDB()

    // Clear all object stores
    const stores = ['topics', 'favorites', 'settings', 'searchIndex', 'cache']

    for (const store of stores) {
      await db.clear(store)
    }
  }

  async reset(): Promise<void> {
    await this.close()

    // Delete and recreate database
    if (typeof window !== 'undefined' && window.indexedDB) {
      await window.indexedDB.deleteDatabase(this.DB_NAME)
    }

    // Reinitialize
    await this.getDB()
  }
}

// Export singleton instance
export const dbManager = new DatabaseManager()

// Export typed database operations
export const db = {
  // Topics operations
  topics: {
    getAll: async (): Promise<Topic[]> => {
      const db = await dbManager.getDB()
      return db.getAll('topics')
    },

    get: async (id: string): Promise<Topic | undefined> => {
      const db = await dbManager.getDB()
      return db.get('topics', id)
    },

    getByCategory: async (category: string): Promise<Topic[]> => {
      const db = await dbManager.getDB()
      return db.getAllFromIndex('topics', 'by-category', category)
    },

    getByLanguage: async (lang: string): Promise<Topic[]> => {
      const db = await dbManager.getDB()
      return db.getAllFromIndex('topics', 'by-lang', lang)
    },

    getByTags: async (tags: string[]): Promise<Topic[]> => {
      const db = await dbManager.getDB()
      const allTopics = await db.getAll('topics')
      return allTopics.filter(topic =>
        tags.some(tag => topic.tags.includes(tag))
      )
    },

    getByDifficulty: async (difficulty: string): Promise<Topic[]> => {
      const db = await dbManager.getDB()
      return db.getAllFromIndex('topics', 'by-difficulty', difficulty)
    },

    add: async (topic: Topic): Promise<string> => {
      const db = await dbManager.getDB()
      return db.add('topics', topic)
    },

    addMany: async (topics: Topic[]): Promise<string[]> => {
      const db = await dbManager.getDB()
      const tx = db.transaction('topics', 'readwrite')
      const store = tx.objectStore('topics')
      const results: string[] = []

      for (const topic of topics) {
        results.push(await store.add(topic))
      }

      await tx.done
      return results
    },

    put: async (topic: Topic): Promise<string> => {
      const db = await dbManager.getDB()
      return db.put('topics', topic)
    },

    putMany: async (topics: Topic[]): Promise<string[]> => {
      const db = await dbManager.getDB()
      const tx = db.transaction('topics', 'readwrite')
      const store = tx.objectStore('topics')
      const results: string[] = []

      for (const topic of topics) {
        results.push(await store.put(topic))
      }

      await tx.done
      return results
    },

    delete: async (id: string): Promise<void> => {
      const db = await dbManager.getDB()
      return db.delete('topics', id)
    },

    clear: async (): Promise<void> => {
      const db = await dbManager.getDB()
      return db.clear('topics')
    }
  },

  // Favorites operations
  favorites: {
    getAll: async () => {
      const db = await dbManager.getDB()
      return db.getAll('favorites')
    },

    get: async (topicId: string) => {
      const db = await dbManager.getDB()
      return db.get('favorites', topicId)
    },

    add: async (topicId: string): Promise<void> => {
      const db = await dbManager.getDB()
      const favorite = {
        topicId,
        addedAt: Date.now(),
        syncedToCloud: false
      }
      return db.put('favorites', favorite)
    },

    remove: async (topicId: string): Promise<void> => {
      const db = await dbManager.getDB()
      return db.delete('favorites', topicId)
    },

    toggle: async (topicId: string): Promise<boolean> => {
      const exists = await db.favorites.get(topicId)
      if (exists) {
        await db.favorites.remove(topicId)
        return false
      } else {
        await db.favorites.add(topicId)
        return true
      }
    },

    isFavorite: async (topicId: string): Promise<boolean> => {
      const favorite = await db.favorites.get(topicId)
      return !!favorite
    },

    clear: async (): Promise<void> => {
      const db = await dbManager.getDB()
      return db.clear('favorites')
    }
  },

  // Settings operations
  settings: {
    get: async (key: string) => {
      const db = await dbManager.getDB()
      return db.get('settings', key)
    },

    set: async (key: string, value: any): Promise<void> => {
      const db = await dbManager.getDB()
      return db.put('settings', { key, value })
    },

    remove: async (key: string): Promise<void> => {
      const db = await dbManager.getDB()
      return db.delete('settings', key)
    },

    getAll: async () => {
      const db = await dbManager.getDB()
      return db.getAll('settings')
    },

    // Default settings
    getDefaults: () => ({
      language: 'en' as const,
      theme: 'light' as const,
      fontSize: 'medium' as const,
      autoSync: false,
      lastSync: null,
      searchFilters: {
        categories: [],
        difficulties: [],
        showScripture: true,
        showChurchFathers: true
      }
    })
  },

  // Search index operations
  searchIndex: {
    get: async (lang: string) => {
      const db = await dbManager.getDB()
      return db.get('searchIndex', lang)
    },

    set: async (lang: string, index: any, version: string): Promise<void> => {
      const db = await dbManager.getDB()
      return db.put('searchIndex', {
        lang,
        index,
        version,
        timestamp: Date.now()
      })
    },

    remove: async (lang: string): Promise<void> => {
      const db = await dbManager.getDB()
      return db.delete('searchIndex', lang)
    },

    clear: async (): Promise<void> => {
      const db = await dbManager.getDB()
      return db.clear('searchIndex')
    }
  },

  // Cache operations
  cache: {
    get: async (key: string) => {
      const db = await dbManager.getDB()
      const cached = await db.get('cache', key)

      if (!cached) return null

      // Check if cache is expired
      if (Date.now() > cached.expiresAt) {
        await db.delete('cache', key)
        return null
      }

      return cached.data
    },

    set: async (key: string, data: any, ttlSeconds: number = 3600): Promise<void> => {
      const db = await dbManager.getDB()
      const now = Date.now()
      return db.put('cache', {
        key,
        data,
        timestamp: now,
        expiresAt: now + (ttlSeconds * 1000)
      })
    },

    remove: async (key: string): Promise<void> => {
      const db = await dbManager.getDB()
      return db.delete('cache', key)
    },

    clear: async (): Promise<void> => {
      const db = await dbManager.getDB()
      return db.clear('cache')
    },

    clearExpired: async (): Promise<void> => {
      const db = await dbManager.getDB()
      const now = Date.now()
      const all = await db.getAll('cache')

      const tx = db.transaction('cache', 'readwrite')
      const store = tx.objectStore('cache')

      for (const item of all) {
        if (now > item.expiresAt) {
          await store.delete(item.key)
        }
      }

      await tx.done
    }
  }
}