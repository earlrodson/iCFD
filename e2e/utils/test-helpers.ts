import { Page, expect } from '@playwright/test'

/**
 * Common test utilities and helper functions for E2E tests
 */

// Test data constants
export const TEST_CONSTANTS = {
  BASE_URL: 'http://localhost:3002',
  DEBOUNCE_DELAY: 500, // Slightly more than 300ms to ensure debouncing
  INSTALL_PROMPT_DELAY: 3500, // 3 seconds + buffer
  RETRY_COOLDOWN: 11000, // 10 seconds + buffer
  NAVIGATION_TIMEOUT: 10000,
  OFFLINE_TIMEOUT: 5000
}

// Language configuration
export const LANGUAGES = {
  en: { name: 'English', code: 'en', flag: '🇺🇸' },
  tl: { name: 'Tagalog', code: 'tl', flag: '🇵🇭' },
  ceb: { name: 'Cebuano', code: 'ceb', flag: '🇵🇭' }
} as const

// Device viewports for responsive testing
export const VIEWPORTS = {
  desktop: { width: 1200, height: 800 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
  mobileLarge: { width: 414, height: 896 }
} as const

/**
 * Helper to wait for debounced operations
 */
export async function waitForDebounce(page: Page, delay: number = TEST_CONSTANTS.DEBOUNCE_DELAY): Promise<void> {
  await page.waitForTimeout(delay)
}

/**
 * Helper to simulate going offline
 */
export async function goOffline(page: Page): Promise<void> {
  await page.context().setOffline(true)
  await page.evaluate(() => {
    window.dispatchEvent(new Event('offline'))
  })
}

/**
 * Helper to simulate going online
 */
export async function goOnline(page: Page): Promise<void> {
  await page.context().setOffline(false)
  await page.evaluate(() => {
    window.dispatchEvent(new Event('online'))
  })
}

/**
 * Helper to check if element is visible and accessible
 */
export async function expectVisible(page: Page, selector: string): Promise<void> {
  await expect(page.locator(selector)).toBeVisible()
  await expect(page.locator(selector)).toBeEnabled()
}

/**
 * Helper to check if element contains text
 */
export async function expectText(page: Page, selector: string, text: string): Promise<void> {
  await expect(page.locator(selector)).toContainText(text)
}

/**
 * Helper to set viewport for responsive testing
 */
export async function setViewport(page: Page, size: keyof typeof VIEWPORTS): Promise<void> {
  const viewport = VIEWPORTS[size]
  await page.setViewportSize(viewport)
}

/**
 * Helper to get current language from URL or page state
 */
export async function getCurrentLanguage(page: Page): Promise<string> {
  const url = new URL(page.url())
  const langParam = url.searchParams.get('lang')

  if (langParam) {
    return langParam
  }

  // Fallback to checking page content
  const langElement = page.locator('[data-testid="current-lang"]')
  if (await langElement.isVisible()) {
    const langText = await langElement.textContent()
    // Map language text to code
    for (const [code, lang] of Object.entries(LANGUAGES)) {
      if (langText?.includes(lang.name)) {
        return code
      }
    }
  }

  return 'en' // Default fallback
}

/**
 * Helper to switch language via URL
 */
export async function switchLanguage(page: Page, language: keyof typeof LANGUAGES): Promise<void> {
  const currentUrl = new URL(page.url())
  currentUrl.searchParams.set('lang', language)

  await page.goto(currentUrl.toString())
  await page.waitForLoadState('networkidle')

  // Wait for language change to complete
  await waitForDebounce(page, 1000)
}

/**
 * Helper to perform search with debouncing
 */
export async function performSearch(page: Page, query: string): Promise<void> {
  const searchInput = page.locator('[data-testid="search-input"]')
  await expect(searchInput).toBeVisible()

  await searchInput.fill(query)
  await waitForDebounce(page)

  // Wait for search results to appear
  await expect(page.locator('[data-testid="search-results"]')).toBeVisible({ timeout: 5000 })
}

/**
 * Helper to check PWA installability
 */
export async function isPWAInstallable(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return 'beforeinstallprompt' in window
  })
}

/**
 * Helper to wait for service worker registration
 */
export async function waitForServiceWorker(page: Page): Promise<void> {
  await page.evaluate(async () => {
    return new Promise((resolve) => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(resolve)
      } else {
        resolve(null)
      }
    })
  })
}

/**
 * Helper to clear IndexedDB for clean test state
 */
export async function clearIndexedDB(page: Page): Promise<void> {
  await page.evaluate(async () => {
    if ('indexedDB' in window) {
      const databases = await indexedDB.databases()
      await Promise.all(
        databases.map(database => {
          return new Promise<void>((resolve, reject) => {
            const deleteReq = indexedDB.deleteDatabase(database.name!)
            deleteReq.onsuccess = () => resolve()
            deleteReq.onerror = () => reject(deleteReq.error)
          })
        })
      )
    }
  })
}

/**
 * Helper to get network connection status
 */
export async function getNetworkStatus(page: Page): Promise<boolean> {
  return await page.evaluate(() => navigator.onLine)
}

/**
 * Helper to take screenshot on failure
 */
export async function takeScreenshotOnFailure(page: Page, testName: string): Promise<void> {
  try {
    const screenshotPath = `test-results/screenshots/${testName}-failure.png`
    await page.screenshot({ path: screenshotPath, fullPage: true })
    console.log(`📸 Screenshot saved: ${screenshotPath}`)
  } catch (error) {
    console.error('Failed to take screenshot:', error)
  }
}

/**
 * Helper to get console logs for debugging
 */
export async function captureConsoleLogs(page: Page): Promise<string[]> {
  const logs: string[] = []

  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`)
  })

  page.on('pageerror', error => {
    logs.push(`[PAGE ERROR] ${error.message}`)
  })

  return logs
}

/**
 * Helper to simulate slow network conditions
 */
export async function simulateSlowNetwork(page: Page): Promise<void> {
  await page.route('**/*', async (route) => {
    // Add delay to simulate slow connection
    await new Promise(resolve => setTimeout(resolve, 1000))
    await route.continue()
  })
}

/**
 * Helper to test keyboard navigation
 */
export async function testKeyboardNavigation(page: Page, elements: string[]): Promise<void> {
  for (const selector of elements) {
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', selector.replace('[data-testid="', '').replace('"]', ''))
  }
}