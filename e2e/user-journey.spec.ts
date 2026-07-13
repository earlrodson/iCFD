import { test, expect } from '@playwright/test'
import {
  TEST_CONSTANTS,
  VIEWPORTS,
  setViewport,
  goOffline,
  goOnline,
  performSearch,
  switchLanguage,
  waitForDebounce,
  expectVisible,
  expectText,
  takeScreenshotOnFailure,
  getCurrentLanguage,
  captureConsoleLogs
} from './utils/test-helpers'

test.describe('Complete User Journey', () => {
  test.describe('Search and Navigation Workflow', () => {
    test('should complete full search and navigation workflow', async ({ page }) => {
      // Capture console logs for debugging
      const logs = captureConsoleLogs(page)

      // 1. User lands on homepage
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      await expectVisible(page, 'h1')
      await expectVisible(page, '[data-testid="app-content"]')

      // 2. User performs initial search
      const searchInput = page.locator('[data-testid="search-input"]')
      await expectVisible(page, '[data-testid="search-input"]')

      await searchInput.fill('Eucharist')
      await waitForDebounce(page)

      // Verify search results appear
      await expectVisible(page, '[data-testid="search-results"]')
      await expectText(page, '[data-testid="search-result"]', 'Eucharist')

      // 3. User clicks on search result
      await page.click('[data-testid="search-result"]').first()

      // 4. Verify navigation to topic detail page
      await expect(page).toHaveURL(/\/eucharist-real-presence/)
      await expectText(page, 'h1', 'Eucharist')
      await expectVisible(page, '[data-testid="topic-content"]')

      // 5. User can read topic details
      const topicContent = page.locator('[data-testid="topic-content"]')
      expect(await topicContent.textContent()).toContain('Real Presence')

      // 6. User navigates back to home
      const backButton = page.locator('[data-testid="back-button"]')
      if (await backButton.isVisible()) {
        await backButton.click()
        await expect(page).toHaveURL('/')
      } else {
        // Alternative navigation
        await page.goto('/')
      }

      // 7. User performs another search
      await performSearch(page, 'Mary')
      await expectVisible(page, '[data-testid="search-results"]')
      await expectText(page, '[data-testid="search-result"]', /mary/i)

      console.log('Console logs during test:', logs.slice(-5))
    })

    test('should handle complex search workflow', async ({ page }) => {
      // Test multiple searches in sequence
      const searches = ['Eucharist', 'Mary', 'Papacy', 'Confession', 'Salvation']

      for (const searchTerm of searches) {
        await performSearch(page, searchTerm)
        await expectVisible(page, '[data-testid="search-results"]')

        // Verify results for each search
        const results = page.locator('[data-testid="search-result"]')
        expect(await results.count()).toBeGreaterThan(0)

        // Clear search
        const searchInput = page.locator('[data-testid="search-input"]')
        await searchInput.fill('')
        await waitForDebounce(page, 500)
      }
    })

    test('should handle keyboard navigation throughout search workflow', async ({ page }) => {
      // Navigate to search input
      await page.keyboard.press('Tab')
      const focusedElement = page.locator(':focus')
      expect(await focusedElement.getAttribute('data-testid')).toBe('search-input')

      // Type search query
      await page.keyboard.type('Eucharist')
      await waitForDebounce(page)

      // Navigate to results with keyboard
      await page.keyboard.press('ArrowDown')
      await expect(page.locator(':focus')).toHaveClass(/result|topic/)

      // Navigate to topic
      await page.keyboard.press('Enter')
      await expect(page).toHaveURL(/\/eucharist-real-presence/)

      // Navigate back
      await page.keyboard.press('Alt+ArrowLeft')
      await expect(page).toHaveURL('/')
    })
  })

  test.describe('Multi-Language User Journey', () => {
    test('should complete full language switching workflow', async ({ page }) => {
      // 1. User starts on English homepage
      await page.goto('/')
      await expectText(page, '[data-testid="current-lang"]', /english/i)
      let currentLang = await getCurrentLanguage(page)
      expect(currentLang).toBe('en')

      // 2. User switches to Cebuano
      await page.click('[data-testid="language-switcher"]')
      await page.click('[data-testid="lang-ceb"]')
      await waitForDebounce(page, 1000)

      currentLang = await getCurrentLanguage(page)
      expect(currentLang).toBe('ceb')
      await expectText(page, '[data-testid="current-lang"]', 'Cebuano')

      // 3. User searches in Cebuano
      await performSearch(page, 'Eukaristiya')
      await expectVisible(page, '[data-testid="search-results"]')
      await expectText(page, '[data-testid="search-result"]', /Eukaristiya/i)

      // 4. User navigates to Cebuano topic
      await page.click('[data-testid="search-result"]').first()
      await expect(page).toHaveURL(/\/eucharist-real-presence/)
      await expectText(page, 'h1', /Eukaristiya/i)
      await expectText(page, '[data-testid="topic-content"]', /Eukaristiya/i)

      // 5. User switches to Tagalog
      await page.click('[data-testid="language-switcher"]')
      await page.click('[data-testid="lang-tl"]')
      await waitForDebounce(page, 1000)

      currentLang = await getCurrentLanguage(page)
      expect(currentLang).toBe('tl')
      await expectText(page, '[data-testid="current-lang"]', 'Tagalog')

      // 6. Content should be in Tagalog
      await expectText(page, '[data-testid="topic-content"]', /Eukaristiya/i)

      // 7. User searches in Tagalog
      await performSearch(page, 'Sakramento')
      await expectVisible(page, '[data-testid="search-results"]')
      await expectText(page, '[data-testid="search-result"]', /Sakramento/i)

      // 8. User switches back to English
      await page.click('[data-testid="language-switcher"]')
      await page.click('[data-testid="lang-en"]')
      await waitForDebounce(page, 1000)

      currentLang = await getCurrentLanguage(page)
      expect(currentLang).toBe('en')
      await expectText(page, '[data-testid="current-lang"]', 'English')
    })

    test('should persist language choice across user interactions', async ({ page }) => {
      // Switch to Cebuano
      await switchLanguage(page, 'ceb')
      await expect(await getCurrentLanguage(page)).toBe('ceb')

      // Perform search in Cebuano
      await performSearch(page, 'Kumpisal')
      await expectVisible(page, '[data-testid="search-results"]')

      // Navigate to topic
      await page.click('[data-testid="search-result"]').first()
      await expect(page).toHaveURL(/\/.*-.*-/)

      // Language should persist after navigation
      expect(await getCurrentLanguage(page)).toBe('ceb')

      // Navigate back and verify persistence
      await page.goBack()
      expect(await getCurrentLanguage(page)).toBe('ceb')

      // Reload page and verify persistence
      await page.reload()
      await page.waitForLoadState('networkidle')
      expect(await getCurrentLanguage(page)).toBe('ceb')
    })

    test('should handle rapid language switching', async ({ page }) => {
      const languages = ['en', 'ceb', 'tl', 'en', 'ceb']

      for (const lang of languages) {
        await switchLanguage(page, lang)
        await expect(await getCurrentLanguage(page)).toBe(lang)

        // Perform quick search to verify language is active
        await performSearch(page, 'test')
        await waitForDebounce(page, 500)
      }
    })
  })

  test.describe('Favorites Management Workflow', () => {
    test('should add topics to favorites and manage them', async ({ page }) => {
      // Search for content
      await performSearch(page, 'Eucharist')
      await expectVisible(page, '[data-testid="search-results"]')

      // Add first result to favorites
      const favoriteButtons = page.locator('[data-testid="favorite-button"]')
      const firstFavoriteButton = favoriteButtons.first()
      await firstFavoriteButton.click()

      // Should show favorite state
      await expect(firstFavoriteButton).toHaveClass(/active|favorited/)

      // Navigate to topic details
      await page.click('[data-testid="search-result"]').first()
      await expectVisible(page, '[data-testid="topic-content"]')

      // Verify favorite is marked in detail view
      const detailFavoriteButton = page.locator('[data-testid="favorite-button"]')
      await expect(detailFavoriteButton).toHaveClass(/active|favorited/)

      // Navigate back to search results
      await page.goBack()

      // Should still show favorite state
      await expect(firstFavoriteButton).toHaveClass(/active|favorited/)

      // Toggle favorite off
      await firstFavoriteButton.click()
      await expect(firstFavoriteButton).not.toHaveClass(/active|favorited/)
    })

    test('should access favorites from dedicated section', async ({ page }) => {
      // Add some topics to favorites first
      await performSearch(page, 'Eucharist')
      const favoriteButtons = page.locator('[data-testid="favorite-button"]')
      await favoriteButtons.first().click()

      await performSearch(page, 'Mary')
      await page.locator('[data-testid="favorite-button"]').first().click()

      // Navigate to favorites section
      const favoritesTab = page.locator('[data-testid="favorites-tab"]')
      if (await favoritesTab.isVisible()) {
        await favoritesTab.click()
      } else {
        // Alternative navigation
        await page.goto('/favorites')
      }

      // Should show favorites list
      await expectVisible(page, '[data-testid="favorites-list"]')
      await expectText(page, '[data-testid="favorites-list"]', /Eucharist|Mary/i)
    })

    test('should maintain favorites across language switches', async ({ page }) => {
      // Add topic to favorites in English
      await performSearch(page, 'Eucharist')
      const favoriteButton = page.locator('[data-testid="favorite-button"]').first()
      await favoriteButton.click()

      // Switch to Cebuano
      await switchLanguage(page, 'ceb')

      // Favorites should be preserved
      const favoritesTab = page.locator('[data-testid="favorites-tab"]')
      if (await favoritesTab.isVisible()) {
        await favoritesTab.click()
        await expectVisible(page, '[data-testid="favorites-list"]')
      }

      // Should find favorited topic even in different language
      const favoritesContent = page.locator('[data-testid="favorites-list"]')
      expect(await favoritesContent.textContent()).toContain('Eukaristiya')
    })
  })

  test.describe('Offline-to-Online Workflow', () => {
    test('should handle complete offline scenario gracefully', async ({ page, context }) => {
      // Start online and interact with app
      await page.goto('/')
      await performSearch(page, 'Eucharist')
      await expectVisible(page, '[data-testid="search-results"]')

      // Go offline while using app
      await goOffline(page)
      await expectVisible(page, '[data-testid="offline-banner"]')
      await expectText(page, '[data-testid="offline-banner"]', /offline/i)

      // Should still have access to cached content
      expectVisible(page, '[data-testid="search-results"]')
      const results = page.locator('[data-testid="search-result"]')
      expect(await results.count()).toBeGreaterThan(0)

      // Can still navigate to cached topics
      await page.click('[data-testid="search-result"]').first()
      await expectVisible(page, '[data-testid="topic-content"]')

      // Should show offline warning for uncached navigation
      const offlineWarning = page.locator('[data-testid="offline-content-warning"]')
      if (await offlineWarning.isVisible()) {
        await expectText(page, '[data-testid="offline-content-warning"]', /offline/i)
      }

      // Try to navigate to different content
      await page.goto('/non-existent-topic')
      const errorContent = page.locator('[data-testid="error-content"], [data-testid="offline-error"]')
      expect(await errorContent.count()).toBeGreaterThan(0)
    })

    test('should recover when coming back online', async ({ page, context }) => {
      // Start offline with cached content
      await goOffline(page)
      await page.goto('/')

      await expectVisible(page, '[data-testid="offline-banner"]')

      // Go back online
      await goOnline(page)

      // Banner should disappear
      await expect(page.locator('[data-testid="offline-banner"]')).toBeHidden({ timeout: 5000 })

      // App should be fully functional again
      await performSearch(page, 'Eucharist')
      await expectVisible(page, '[data::-testid="search-results"]')

      // Can navigate to any content
      await page.click('[data-testid="search-result"]').first()
      await expectVisible(page, '[data-testid="topic-content"]')
    })

    test('should handle intermittent connectivity gracefully', async ({ page, context }) => {
      // Online phase
      await performSearch(page, 'Eucharist')
      await expectVisible(page, '[data-testid="search-results"]')

      // Brief offline period
      await goOffline(page)
      await expectVisible(page, '[data-testid="offline-banner"]')

      // Brief online period
      await goOnline(page)
      await expect(page.locator('[data-testid="offline-banner"]')).toBeHidden({ timeout: 3000 })

      // Another offline period
      await goOffline(page)
      await expectVisible(page, '[data-testid="offline-banner"]')

      // Final online period
      await goOnline(page)
      await expect(page.locator('[data-testid="offline-banner"]')).toBeHidden({ timeout: 3000 })

      // Should be fully functional
      await performSearch(page, 'Mary')
      await expectVisible(page, '[data-testid="search-results"]')
    })
  })

  test.describe('Mobile User Journey', () => {
    test.beforeEach(async ({ page }) => {
      await setViewport(page, 'mobile')
      await page.goto('/')
      await page.waitForLoadState('networkidle')
    })

    test('should complete full mobile user journey', async ({ page }) => {
      // 1. User sees mobile-optimized interface
      await expectVisible(page, '[data-testid="mobile-header"]')
      await expectVisible(page, '[data-testid="search-input"]')

      // 2. User searches with mobile keyboard
      const searchInput = page.locator('[data-testid="search-input"]')
      await searchInput.tap()
      await searchInput.fill('Eucharist')
      await waitForDebounce(page)

      // 3. User views mobile search results
      await expectVisible(page, '[data-testid="search-results"]')
      await expectText(page, '[data-testid="search-result"]', 'Eucharist')

      // 4. User taps to view topic
      await page.tap('[data-testid="search-result"]').first()
      await expect(page).toHaveURL(/\/eucharist-real-presence/)

      // 5. User navigates with mobile gestures
      const backButton = page.locator('[data-testid="back-button"]')
      if (await backButton.isVisible()) {
        await backButton.tap()
      } else {
        await page.swipe({ direction: 'right' })
      }

      await expect(page).toHaveURL('/')

      // 6. User interacts with mobile language switcher
      const mobileLangSwitcher = page.locator('[data-testid="language-switcher-mobile"]')
      if (await mobileLangSwitcher.isVisible()) {
        await mobileLangSwitcher.tap()
        await page.tap('[data-testid="lang-ceb"]')
        await waitForDebounce(page, 1000)
        await expect(await getCurrentLanguage(page)).toBe('ceb')
      }
    })

    test('should handle mobile orientation changes', async ({ page }) => {
      // Start in portrait
      await page.setViewportSize({ width: 375, height: 667 })
      await page.waitForLoadState('networkidle')

      // Perform search in portrait
      const searchInput = page.locator('[data-testid="search-input"]')
      await searchInput.fill('Eucharist')
      await waitForDebounce(page)

      // Switch to landscape
      await page.setViewportSize({ width: 667, height: 375 })
      await page.waitForTimeout(1000)

      // Should maintain search state
      expect(searchInput).toHaveValue('Eucharist')
      await expectVisible(page, '[data-testid="search-results"]')

      // Continue with journey in landscape
      await page.tap('[data-testid="search-result"]').first()
      await expect(page).toHaveURL(/\/eucharist-real-presence/)
    })

    test('should handle mobile-specific interactions', async ({ page }) => {
      // Touch-based search
      const searchInput = page.locator('[data-testid="search-input"]')
      await searchInput.tap()
      await searchInput.type('Eucharist')
      await waitForDebounce(page)

      // Swipe through search results
      const results = page.locator('[data-testid="search-result"]')
      const resultCount = await results.count()

      if (resultCount > 1) {
        // Swipe to second result
        await results.nth(1).scrollIntoViewIfNeeded()
        await page.waitForTimeout(500)

        // Tap second result
        await results.nth(1).tap()
        await expect(page).toHaveURL(/\/.*-.*-/)
      }

      // Test mobile navigation
      const navMenu = page.locator('[data-testid="nav-menu"]')
      if (await navMenu.isVisible()) {
        await navMenu.tap()
        // Should show mobile menu options
      }
    })
  })

  test.describe('Accessibility User Journey', () => {
    test('should be accessible using keyboard only', async ({ page }) => {
      // Start on homepage
      await page.goto('/')

      // Navigate entire journey using keyboard
      let tabCount = 0
      while (tabCount < 10) {
        await page.keyboard.press('Tab')
        tabCount++

        const focused = page.locator(':focus')
        const hasFocus = await focused.count() > 0

        if (hasFocus) {
          const elementId = await focused.getAttribute('data-testid') || ''
          if (elementId === 'search-input') {
            break
          }
        }
      }

      // Focus should be on search input
      await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'search-input')

      // Perform search with keyboard
      await page.keyboard.type('Eucharist')
      await waitForDebounce(page)

      // Navigate through results with keyboard
      await page.keyboard.press('ArrowDown')
      await expect(page.locator(':focus')).toHaveClass(/result|topic/)

      // Navigate to topic with keyboard
      await page.keyboard.press('Enter')
      await expect(page).toHaveURL(/\/eucharist-real-presence/)

      // Navigate back with keyboard
      await page.keyboard.press('Alt+ArrowLeft')
      await expect(page).toHaveURL('/')
    })

    test('should support screen reader navigation', async ({ page }) => {
      // Ensure proper ARIA labels are present
      const searchInput = page.locator('[data-testid="search-input"]')
      await expect(searchInput).toHaveAttribute('aria-label')

      const languageSwitcher = page.locator('[data-testid="language-switcher"]')
      if (await languageSwitcher.isVisible()) {
        await expect(languageSwitcher).toHaveAttribute('aria-label', /language/i)
        await expect(languageSwitcher).toHaveAttribute('aria-expanded')
      }

      // Perform search and check ARIA live regions
      await searchInput.fill('Eucharist')
      await waitForDebounce(page)

      const resultsContainer = page.locator('[data-testid="search-results"]')
      if (await resultsContainer.isVisible()) {
        await expect(resultsContainer).toHaveAttribute('role', 'listbox')
      }
    })
  })

  test.describe('Performance and Reliability', () => {
    test('should handle large datasets efficiently', async ({ page }) => {
      const startTime = Date.now()

      // Search with broad term to return many results
      await performSearch(page, 'a')
      await waitForDebounce(page)

      const searchTime = Date.now() - startTime

      // Search should complete quickly
      expect(searchTime).toBeLessThan(3000)

      // Should display results without hanging
      await expectVisible(page, '[data-testid="search-results"]')
      const results = page.locator('[data-testid="search-result"]')
      expect(await results.count()).toBeGreaterThan(0)
    })

    test('should maintain responsiveness during complex workflows', async ({ page }) => {
      // Start with language switch
      const langStartTime = Date.now()
      await switchLanguage(page, 'ceb')
      const langTime = Date.now() - langStartTime
      expect(langTime).toBeLessThan(2000)

      // Follow with search
      const searchStartTime = Date.now()
      await performSearch(page, 'Eukaristiya')
      const searchTime = Date.now() - searchStartTime
      expect(searchTime).toBeLessThan(2000)

      // Complete with navigation
      const navStartTime = Date.now()
      await page.click('[data-testid="search-result"]').first()
      const navTime = Date.now() - navStartTime
      expect(navTime).LessThan(3000)

      // Total workflow should be reasonably fast
      const totalTime = Date.now() - langStartTime
      expect(totalTime).toBeLessThan(10000)
    })

    test('should recover from errors gracefully', async ({ page }) => {
      // Simulate network errors during search
      await page.route('**/api/search**', route => route.abort())

      const searchInput = page.locator('[data-testid="search-input"]')
      await searchInput.fill('test')
      await waitForDebounce(page)

      // Should handle error gracefully
      const errorElement = page.locator('[data-testid="search-error"]')
      const noResultsElement = page.locator('[data-testid="no-results"]')

      expect(await errorElement.isVisible().catch(() => false) ||
             await noResultsElement.isVisible().catch(() => false)).toBeTruthy()

      // App should still be functional
      const languageSwitcher = page.locator('[data-testid="language-switcher"]')
      if (await languageSwitcher.isVisible()) {
        await languageSwitcher.click()
        await expectVisible(page, '[data-testid="lang-dropdown"]')
      }
    })
  })

  test.afterEach(async ({ page }, testInfo) => {
    // Take screenshot on test failure for debugging
    if (testInfo.status !== 'passed') {
      await takeScreenshotOnFailure(page, testInfo.title.replace(/\s+/g, '-'))
    }

    // Clean up state between tests
    try {
      // Clear search input
      const searchInput = page.locator('[data-testid="search-input"]')
      if (await searchInput.isVisible()) {
        await searchInput.fill('')
        await page.keyboard.press('Escape')
      }

      // Return to homepage if not already there
      if (page.url() !== TEST_CONSTANTS.BASE_URL + '/') {
        await page.goto('/')
      }

      // Ensure online state
      await page.context().setOffline(false)
    } catch (error) {
      // Ignore cleanup errors
    }
  })
})