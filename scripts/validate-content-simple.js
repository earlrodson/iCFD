#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const CONTENT_DIR = path.join(__dirname, '../public/data/content')
const LANGUAGES = ['en', 'tl', 'ceb']

// ValidationResult structure definition

class SimpleContentValidator {
  constructor() {
    this.results = {
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
  }

  validateAll() {
    console.log('🔍 Starting simple content validation...\n')

    for (const language of LANGUAGES) {
      this.validateLanguage(language)
    }

    this.printSummary()
    return this.results
  }

  validateLanguage(language) {
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

    this.validateHandbook(language)
    this.validateMetadata(language)

    console.log(`✅ ${language.toUpperCase()} validation complete\n`)
  }

  validateHandbook(language) {
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

      // Basic structure validation
      if (!jsonData.topics || !Array.isArray(jsonData.topics)) {
        throw new Error('Missing or invalid topics array')
      }

      if (!jsonData.metadata || typeof jsonData.metadata.totalTopics !== 'number') {
        throw new Error('Missing or invalid metadata.totalTopics')
      }

      if (jsonData.topics.length !== jsonData.metadata.totalTopics) {
        throw new Error(`Topics count (${jsonData.topics.length}) doesn't match metadata.totalTopics (${jsonData.metadata.totalTopics})`)
      }

      // Validate topic structure
      jsonData.topics.forEach((topic, index) => {
        if (!topic.id || !topic.title || !topic.question || !topic.answer) {
          throw new Error(`Topic ${index + 1}: Missing required fields`)
        }
      })

      this.results.summary.totalTopics += jsonData.topics.length
      this.results.summary.totalFiles += 1
      this.results.summary.validFiles += 1

      console.log(`  ✓ handbook.json: ${jsonData.topics.length} topics`)

    } catch (error) {
      this.results.errors.push({
        file: handbookPath,
        message: `Validation failed`,
        details: error.message
      })
      this.results.valid = false
      this.results.summary.totalFiles += 1
      this.results.summary.invalidFiles += 1
      console.log(`  ✗ handbook.json: Validation failed - ${error.message}`)
    }
  }

  validateMetadata(language) {
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
        details: error.message
      })
      this.results.valid = false
      this.results.summary.totalFiles += 1
      this.results.summary.invalidFiles += 1
      console.log(`  ✗ metadata.json: Validation failed - ${error.message}`)
    }
  }

  printSummary() {
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
if (require.main === module) {
  const validator = new SimpleContentValidator()
  const result = validator.validateAll()
  process.exit(result.valid ? 0 : 1)
}

module.exports = { SimpleContentValidator }