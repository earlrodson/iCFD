#!/usr/bin/env node

/**
 * Search Index Generation Script
 *
 * This script generates MiniSearch indexes for all languages
 * to improve search performance in the Catholic Faith Defender app.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import MiniSearch from 'minisearch'
import { TopicSchema, HandbookContentSchema } from '../data/schema/topic.schema.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Define the content directory structure
const CONTENT_DIR = path.join(__dirname, '../data/content')
const LANGUAGES = ['en', 'tl'] // Start with English and Tagalog
const OUTPUT_DIR = path.join(__dirname, '../data/search-indexes')

interface SearchIndexData {
  lang: string
  index: any
  version: string
  metadata: {
    totalTopics: number
    generatedAt: string
    fields: string[]
    searchOptions: any
  }
}

class SearchIndexGenerator {
  constructor() {
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    }
  }

  async generateAllIndexes(): Promise<void> {
    console.log('🔍 Generating search indexes...\n')

    for (const language of LANGUAGES) {
      await this.generateLanguageIndex(language)
    }

    console.log('\n✅ Search index generation complete!')
  }

  private async generateLanguageIndex(language: string): Promise<void> {
    console.log(`📚 Processing ${language.toUpperCase()} content...`)

    const handbookPath = path.join(CONTENT_DIR, language, 'handbook.json')

    if (!fs.existsSync(handbookPath)) {
      console.log(`  ⚠️  handbook.json not found for ${language}`)
      return
    }

    try {
      // Load and validate content
      const content = fs.readFileSync(handbookPath, 'utf-8')
      const jsonData = JSON.parse(content)
      const validatedContent = HandbookContentSchema.parse(jsonData)

      // Create MiniSearch instance
      const miniSearch = new MiniSearch({
        fields: ['title', 'question', 'answer', 'tags'],
        storeFields: ['id', 'title', 'category', 'difficulty', 'lang', 'tags'],
        searchOptions: {
          fuzzy: 0.2,
          prefix: true,
          boost: {
            title: 2,
            question: 1.5,
            answer: 1,
            tags: 1.2
          }
        },
        extractField: (document, fieldName) => {
          // Extract and normalize text for search
          const value = (document as any)[fieldName]
          if (Array.isArray(value)) {
            return value.join(' ')
          }
          return value || ''
        }
      })

      // Add all topics to the index
      miniSearch.addAll(validatedContent.topics)

      // Create index data
      const indexData: SearchIndexData = {
        lang: language,
        index: miniSearch.toJSON(),
        version: validatedContent.metadata.version,
        metadata: {
          totalTopics: validatedContent.topics.length,
          generatedAt: new Date().toISOString(),
          fields: ['title', 'question', 'answer', 'tags'],
          searchOptions: {
            fuzzy: 0.2,
            prefix: true,
            boost: {
              title: 2,
              question: 1.5,
              answer: 1,
              tags: 1.2
            }
          }
        }
      }

      // Save index to file
      const indexPath = path.join(OUTPUT_DIR, `${language}.json`)
      fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2))

      // Test the index
      this.testIndex(miniSearch, validatedContent.topics)

      console.log(`  ✓ Generated search index: ${validatedContent.topics.length} topics`)

    } catch (error) {
      console.error(`  ✗ Failed to generate index for ${language}:`, error)
    }
  }

  private testIndex(miniSearch: MiniSearch, topics: any[]): void {
    // Test basic search functionality
    const testQueries = ['sacraments', 'Mary', 'salvation', 'bible']

    testQueries.forEach(query => {
      const results = miniSearch.search(query)
      console.log(`    Test search "${query}": ${results.length} results`)
    })
  }

  async validateIndexes(): Promise<boolean> {
    console.log('\n🔍 Validating generated indexes...')

    let allValid = true

    for (const language of LANGUAGES) {
      const indexPath = path.join(OUTPUT_DIR, `${language}.json`)

      if (!fs.existsSync(indexPath)) {
        console.log(`  ✗ Missing index file: ${language}.json`)
        allValid = false
        continue
      }

      try {
        const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'))

        // Validate index structure
        if (!indexData.lang || !indexData.index || !indexData.metadata) {
          console.log(`  ✗ Invalid index structure: ${language}.json`)
          allValid = false
          continue
        }

        // Try to load the index
        const miniSearch = MiniSearch.loadJSON(indexData.index, {
          fields: ['title', 'question', 'answer', 'tags'],
          storeFields: ['id', 'title', 'category', 'difficulty', 'lang', 'tags'],
          searchOptions: {
            fuzzy: 0.2,
            prefix: true,
            boost: {
              title: 2,
              question: 1.5,
              answer: 1,
              tags: 1.2
            }
          }
        })

        // Test search
        const results = miniSearch.search('test')
        console.log(`  ✓ Valid index: ${language}.json (${indexData.metadata.totalTopics} topics)`)

      } catch (error) {
        console.log(`  ✗ Corrupted index file: ${language}.json`)
        allValid = false
      }
    }

    return allValid
  }

  getIndexStats(): void {
    console.log('\n📊 Search Index Statistics')
    console.log('==========================')

    for (const language of LANGUAGES) {
      const indexPath = path.join(OUTPUT_DIR, `${language}.json`)

      if (fs.existsSync(indexPath)) {
        try {
          const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'))
          console.log(`${language.toUpperCase()}:`)
          console.log(`  Topics: ${indexData.metadata.totalTopics}`)
          console.log(`  Version: ${indexData.version}`)
          console.log(`  Generated: ${new Date(indexData.metadata.generatedAt).toLocaleString()}`)
          console.log(`  Fields: ${indexData.metadata.fields.join(', ')}`)
          console.log('')
        } catch (error) {
          console.log(`${language.toUpperCase()}: Error reading index`)
        }
      } else {
        console.log(`${language.toUpperCase()}: No index found`)
      }
    }
  }
}

// Run index generation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new SearchIndexGenerator()

  generator.generateAllIndexes()
    .then(() => {
      return generator.validateIndexes()
    })
    .then((isValid) => {
      generator.getIndexStats()
      process.exit(isValid ? 0 : 1)
    })
    .catch((error) => {
      console.error('Index generation failed:', error)
      process.exit(1)
    })
}

export { SearchIndexGenerator }
