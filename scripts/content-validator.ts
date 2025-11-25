#!/usr/bin/env node

/**
 * Content Validation Script
 *
 * This script validates the apologetics content JSON files
 * to ensure they meet the required schema and quality standards.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { TopicSchema, HandbookContentSchema } from '../data/schema/topic.schema.js'
import { z } from 'zod'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Define the content directory structure
const CONTENT_DIR = path.join(__dirname, '../data/content')
const LANGUAGES = ['en', 'tl'] // Start with English and Tagalog

interface ValidationResult {
  valid: boolean
  errors: Array<{
    file: string
    message: string
    details?: any
  }>
  warnings: Array<{
    file: string
    message: string
  }>
  summary: {
    totalTopics: number
    totalFiles: number
    validFiles: number
    invalidFiles: number
  }
}

class ContentValidator {
  private results: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    summary: {
      totalTopics: 0,
      totalFiles: 0,
      validFiles: 0,
      invalidFiles: 0
    }
  }

  async validateAll(): Promise<ValidationResult> {
    console.log('🔍 Starting content validation...\n')

    for (const language of LANGUAGES) {
      await this.validateLanguage(language)
    }

    this.printSummary()
    return this.results
  }

  private async validateLanguage(language: string): Promise<void> {
    console.log(`📚 Validating ${language.toUpperCase()} content...`)

    const languageDir = path.join(CONTENT_DIR, language)

    if (!fs.existsSync(languageDir)) {
      this.results.errors.push({
        file: languageDir,
        message: `Language directory not found: ${language}`
      })
      this.results.valid = false
      return
    }

    // Validate handbook.json
    await this.validateHandbook(language)

    // Validate metadata.json
    await this.validateMetadata(language)

    console.log(`✅ ${language.toUpperCase()} validation complete\n`)
  }

  private async validateHandbook(language: string): Promise<void> {
    const handbookPath = path.join(CONTENT_DIR, language, 'handbook.json')

    if (!fs.existsSync(handbookPath)) {
      this.results.errors.push({
        file: handbookPath,
        message: `handbook.json not found for language: ${language}`
      })
      this.results.valid = false
      return
    }

    try {
      const content = fs.readFileSync(handbookPath, 'utf-8')
      const jsonData = JSON.parse(content)

      // Validate with Zod schema
      const validatedContent = HandbookContentSchema.parse(jsonData)

      // Additional quality checks
      this.validateContentQuality(validatedContent, handbookPath)

      this.results.summary.totalTopics += validatedContent.topics.length
      this.results.summary.totalFiles += 1
      this.results.summary.validFiles += 1

      console.log(`  ✓ handbook.json: ${validatedContent.topics.length} topics`)

    } catch (error) {
      this.results.errors.push({
        file: handbookPath,
        message: `Validation failed`,
        details: error instanceof Error ? error.message : String(error)
      })
      this.results.valid = false
      this.results.summary.totalFiles += 1
      this.results.summary.invalidFiles += 1
      console.log(`  ✗ handbook.json: Validation failed`)
    }
  }

  private async validateMetadata(language: string): Promise<void> {
    const metadataPath = path.join(CONTENT_DIR, language, 'metadata.json')

    if (!fs.existsSync(metadataPath)) {
      this.results.warnings.push({
        file: metadataPath,
        message: `metadata.json not found for language: ${language}`
      })
      return
    }

    try {
      const content = fs.readFileSync(metadataPath, 'utf-8')
      const jsonData = JSON.parse(content)

      // Basic structure validation
      if (!jsonData.version || !jsonData.lastUpdated || !jsonData.totalTopics) {
        throw new Error('Missing required metadata fields')
      }

      this.results.summary.totalFiles += 1
      this.results.summary.validFiles += 1
      console.log(`  ✓ metadata.json: Valid`)

    } catch (error) {
      this.results.errors.push({
        file: metadataPath,
        message: `Validation failed`,
        details: error instanceof Error ? error.message : String(error)
      })
      this.results.valid = false
      this.results.summary.totalFiles += 1
      this.results.summary.invalidFiles += 1
      console.log(`  ✗ metadata.json: Validation failed`)
    }
  }

  private validateContentQuality(content: any, filePath: string): void {
    const topics = content.topics

    topics.forEach((topic: any, index: number) => {
      // Check for required fields with meaningful content
      if (!topic.title || topic.title.trim().length < 5) {
        this.results.warnings.push({
          file: filePath,
          message: `Topic ${index + 1}: Title is too short or missing`
        })
      }

      if (!topic.question || topic.question.trim().length < 10) {
        this.results.warnings.push({
          file: filePath,
          message: `Topic ${index + 1}: Question is too short or missing`
        })
      }

      if (!topic.answer || topic.answer.trim().length < 50) {
        this.results.warnings.push({
          file: filePath,
          message: `Topic ${index + 1}: Answer is too short or missing`
        })
      }

      // Check for scripture references
      if (!topic.scripture || topic.scripture.length === 0) {
        this.results.warnings.push({
          file: filePath,
          message: `Topic ${index + 1}: No scripture references found`
        })
      }

      // Check for catechism references
      if (!topic.catechism || topic.catechism.length === 0) {
        this.results.warnings.push({
          file: filePath,
          message: `Topic ${index + 1}: No catechism references found`
        })
      }

      // Check for tags
      if (!topic.tags || topic.tags.length === 0) {
        this.results.warnings.push({
          file: filePath,
          message: `Topic ${index + 1}: No tags found`
        })
      }

      // Validate scripture reference format
      if (topic.scripture) {
        topic.scripture.forEach((ref: any, refIndex: number) => {
          if (!ref.reference || !ref.text) {
            this.results.warnings.push({
              file: filePath,
              message: `Topic ${index + 1}, Scripture ${refIndex + 1}: Missing reference or text`
            })
          }
        })
      }

      // Validate Church Fathers quotes
      if (topic.churchFathers) {
        topic.churchFathers.forEach((quote: any, quoteIndex: number) => {
          if (!quote.author || !quote.quote || !quote.source) {
            this.results.warnings.push({
              file: filePath,
              message: `Topic ${index + 1}, Quote ${quoteIndex + 1}: Missing author, quote, or source`
            })
          }
        })
      }
    })
  }

  private printSummary(): void {
    const { valid, errors, warnings, summary } = this.results

    console.log('📊 VALIDATION SUMMARY')
    console.log('====================')
    console.log(`Total topics: ${summary.totalTopics}`)
    console.log(`Total files: ${summary.totalFiles}`)
    console.log(`Valid files: ${summary.validFiles}`)
    console.log(`Invalid files: ${summary.invalidFiles}`)
    console.log(`Warnings: ${warnings.length}`)
    console.log(`Errors: ${errors.length}`)

    if (warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:')
      warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning.message}`)
      })
    }

    if (errors.length > 0) {
      console.log('\n❌ ERRORS:')
      errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.message}`)
        if (error.details) {
          console.log(`     Details: ${error.details}`)
        }
      })
    }

    if (valid) {
      console.log('\n✅ All content is valid!')
    } else {
      console.log('\n❌ Content validation failed!')
    }
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new ContentValidator()
  validator.validateAll()
    .then((result) => {
      process.exit(result.valid ? 0 : 1)
    })
    .catch((error) => {
      console.error('Validation script failed:', error)
      process.exit(1)
    })
}

export { ContentValidator }