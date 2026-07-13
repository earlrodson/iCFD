import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test global setup...')

  // Get browser instances for setup tasks
  const browser = await chromium.launch()
  const context = await browser.newContext()

  try {
    // Setup test data, clean up any previous test artifacts
    console.log('📋 Setting up test environment...')

    // You can add any global setup here like:
    // - Clearing test databases
    // - Setting up test authentication
    // - Preparing test data
    // - Starting any required services

    console.log('✅ Global setup completed')
  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  } finally {
    await context.close()
    await browser.close()
  }
}

export default globalSetup