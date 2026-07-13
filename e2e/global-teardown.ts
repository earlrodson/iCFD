import { FullConfig } from '@playwright/test'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E test global teardown...')

  try {
    // Cleanup any test artifacts, databases, etc.
    console.log('🗑️  Cleaning up test environment...')

    // You can add any global cleanup here like:
    // - Clearing test databases
    // - Removing temporary files
    // - Stopping any test services
    // - Collecting test metrics

    console.log('✅ Global teardown completed')
  } catch (error) {
    console.error('❌ Global teardown failed:', error)
    throw error
  }
}

export default globalTeardown