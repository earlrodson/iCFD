import { test, expect } from '@playwright/test'
import {
  TEST_CONSTANTS,
  VIEWPORTS,
  setViewport,
  performSearch,
  waitForDebounce,
  expectVisible,
  expectText,
  takeScreenshotOnFailure,
  SEARCH_QUERIES,
  MOCK_TOPICS
} from './utils/test-helpers'

test.describe('Search Bar Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test.describe('Basic Search Functionality', () => {
    test('should perform real-time search with debouncing', async ({ page }) => {
      await expectVisible(page, '[data-testid="search-input"]')

      // Type search query
      const searchInput = page.locator('[data-testid="search-input"]')
      await searchInput.fill('Eucharist')

      // Wait for debounced results (300ms + buffer)
      await waitForDebounce(page)

      // Verify search results appear
      await expectVisible(page, '[data-testid="search-results"]')
      await expectText(page, '[data-testid="search-result"]', 'Eucharist')
    })

    test('should clear search when input is empty', async ({ page }) => {
      const searchInput = page.locator('[data-testid="search-input"]')

      // Perform search
      await performSearch(page, 'Eucharist')
      await expectVisible(page, '[data-testid="search-results"]')

      // Clear search
      await searchInput.fill('')
      await waitForDebounce(page, 500)

      // Results should disappear
      await expect(page.locator('[data-testid="search-results"]')).toBeHidden()
    })

    test('should handle search with special characters', async ({ page }) => {
      const searchInput = page.locator('[data-testid="search-input"]')

      // Test with special characters
      await searchInput.fill('Eucharist?')
      await waitForDebounce(page)

      // Should still show results
      await expectVisible(page, '[data-testid="search-results"]')

      // Test with Unicode characters (Cebuano)
      await searchInput.fill('Eukaristiya')
      await waitForDebounce(page)

      // Should show Cebuano results
      await expectVisible(page, '[data-testid="search-results"]')
      await expectText(page, '[data-testid="search-result"]', /Eukaristiya/i)
    })

    test('should show no results message for empty search results', async ({ page }) => {
      const searchInput = page.locator('[data-testid="search-input"]')

      // Search for non-existent term
      await searchInput.fill('xyz123nonexistent')
      await waitForDebounce(page)

      // Should show no results message
      await expectVisible(page, '[data-testid="no-results"]')
      await expectText(page, '[data-testid="no-results"]', /no results/i)
    })
  })

  test.describe('Search Suggestions', () => {
    test('should display search suggestions as user types', async ({ page }) => {
      const searchInput = page.locator('[data-testid="search-input"]')

      // Type partial Cebuano term
      await searchInput.fill('Euk')
      await waitForDebounce(page)

      // Verify suggestions dropdown appears
      const suggestions = page.locator('[data-testid="search-suggestions"]')
      await expect(suggestions).toBeVisible()

      const suggestionItems = page.locator('[data-testid="suggestion-item"]')
      expect(await suggestionItems.count()).toBeGreaterThan(0)

      // Should contain relevant suggestions
      await expectText(page, '[data-testid="suggestion-item"]', /Eukaristiya/i)
    })

    test('should allow clicking on suggestions', async ({ page }) => {
      const searchInput = page.locator('[data-testid="search-input"]')

      // Type to trigger suggestions
      await searchInput.fill('Euk')
      await waitForDebounce(page)

      // Click on first suggestion
      const firstSuggestion = page.locator('[data-testid="suggestion-item"]').first()
      await firstSuggestion.click()

      // Should populate search input and show results
      await waitForDebounce(page)
      await expectVisible(page, '[data-testid="search-results"]')
    })

    test('should hide suggestions when clicking outside', async ({ page }) => {
      const searchInput = page.locator('[data-testid="search-input"]')

      // Type to trigger suggestions
      await searchInput.fill('Euk')
      await waitForDebounce(page)

      await expectVisible(page, '[data-testid="search-suggestions"]')

      // Click outside search area
      await page.click('body', { position: { x: 100, y: 100 } })

      // Suggestions should disappear
      await expect(page.locator('[data-testid="search-suggestions"]')).toBeHidden()
    })
  })

  test.describe('Search Result Navigation', () => {
    test('should navigate to topic details from search results', async ({ page }) => {
      await performSearch(page, 'Eucharist')
      await expectVisible(page, '[data-testid="search-results"]')

      // Click first search result
      await page.click('[data-testid="search-result"]').first()

      // Should navigate to topic detail page
      await expect(page).toHaveURL(/\/eucharist-real-presence/)
      await expectText(page, 'h1', 'Eucharist')
      await expectVisible(page, '[data-testid="topic-content"]')
    })

    test('should open topic details in new tab when middle-clicked', async ({ page }) => {
      await performSearch(page, 'Eucharist')
      await expectVisible(page, '[data-testid="search-results"]')

      // Get initial tab count
      const context = page.context()
      const pagesBefore = context.pages()

      // Middle-click first search result
      const firstResult = page.locator('[data-testid="search-result"]').first()
      await firstResult.click({ button: 'middle' })

      // Should open new tab
      await page.waitForTimeout(1000)
      const pagesAfter = context.pages()
      expect(pagesAfter.length).toBe(pagesBefore.length + 1)
    })

    test('should maintain search state when navigating back', async ({ page }) => {
      await performSearch(page, 'Eucharist')
      await expectVisible(page, '[data-testid="search-results"]')

      // Navigate to topic
      await page.click('[data-testid="search-result"]').first()
      await expect(page).toHaveURL(/\/eucharist-real-presence/)

      // Navigate back
      await page.goBack()

      // Should maintain search input and results
      await expectText(page, '[data-testid="search-input"]', 'Eucharist')
      await expectVisible(page, '[data-testid="search-results"]')
    })
  })

  test.describe('Keyboard Navigation', () => {
    test('should handle arrow key navigation in search results', async ({ page }) => {
      await performSearch(page, 'Eucharist')
      await expectVisible(page, '[data-testid="search-results"]')

      // Focus search input
      const searchInput = page.locator('[data-testid="search-input"]')
      await searchInput.focus()

      // Arrow down to first result
      await page.keyboard.press('ArrowDown')

      // Should navigate to first result
      await expect(page.locator('[data-testid="search-result"]').first()).toHaveClass(/focused|selected/)

      // Press Enter to navigate
      await page.keyboard.press('Enter')

      // Should navigate to topic detail
      await expect(page).toHaveURL(/\/eucharist-real-presence/)
    })

    test('should handle Escape key to close search', async ({ page }) => {
      const searchInput = page.locator('[data-testid="search-input"]')

      // Perform search
      await performSearch(page, 'Eucharist')
      await expectVisible(page, '[data-testid="search-results"]')

      // Press Escape
      await searchInput.focus()
      await page.keyboard.press('Escape')

      // Should clear search and hide results
      await expect(searchInput).toHaveValue('')
      await expect(page.locator('[data-testid="search-results"]')).toBeHidden()
    })

    test('should allow Tab navigation through search elements', async ({ page }) => {
      // Tab through page elements to reach search
      let tabCount = 0
      while (tabCount < 10) { // Maximum tabs to prevent infinite loop
        await page.keyboard.press('Tab')
        tabCount++

        if (await page.locator('[data-testid="search-input"]').isVisible()) {
          break
        }
      }

      // Should focus search input
      await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'search-input')

      // Continue tabbing through search results
      await performSearch(page, 'Eucharist')
      await page.keyboard.press('Tab')

      // Should focus first search result
      await expect(page.locator(':focus')).toHaveClass(/result|topic/)
    })
  })

  test.describe('Multi-Language Search', () => {
    test('should search in current language', async ({ page }) => {
      // Test English search
      await performSearch(page, 'Eucharist')
      await expectVisible(page, '[data-testid="search-results"]')
      await expectText(page, '[data-testid="search-result"]', /Eucharist/i)

      // Switch to Tagalog
      await page.click('[data-testid="language-switcher"]')
      await page.click('[data-testid="lang-tl"]')
      await waitForDebounce(page, 1000)

      // Clear and search in Tagalog
      const searchInput = page.locator('[data-testid="search-input"]')
      await searchInput.fill('')
      await performSearch(page, 'Eukaristiya')

      // Should show Tagalog results
      await expectVisible(page, '[data-testid="search-results"]')
      await expectText(page, '[data-testid="search-result"]', /Eukaristiya/i)
    })

    test('should handle Cebuano search terms', async ({ page }) => {
      // Switch to Cebuano
      await page.click('[data-testid="language-switcher"]')
      await page.click('[data-testid="lang-ceb"]')
      await waitForDebounce(page, 1000)

      // Search with Cebuano term
      await performSearch(page, 'Kumpisal')

      // Should show Cebuano results
      await expectVisible(page, '[data-testid="search-results"]')
      await expectText(page, '[data-testid="search-result"]', /Kumpisal/i)
    })

    test('should maintain language context in search results', async ({ page }) => {
      // Switch to Cebuano
      await page.click('[data-testid="language-switcher"]')
      await page.click('[data-testid="lang-ceb"]')
      await waitForDebounce(page, 1000)

      // Search and navigate to result
      await performSearch(page, 'Eukaristiya')
      await page.click('[data-testid="search-result"]').first()

      // Topic content should be in Cebuano
      await expectText(page, '[data-testid="topic-content"]', /Eukaristiya/i)
      await expectText(page, 'h1', /Eukaristiya/i)
    })
  })

  test.describe('Mobile Search', () => {
    test.beforeEach(async ({ page }) => {
      await setViewport(page, 'mobile')
      await page.goto('/')
    })

    test('should work correctly on mobile devices', async ({ page }) => {
      await expectVisible(page, '[data-testid="search-input"]')

      // Test search on mobile
      await performSearch(page, 'Eucharist')
      await expectVisible(page, '[data-testid="search-results"]')

      // Results should be mobile-friendly
      const results = page.locator('[data-testid="search-result"]')
      expect(await results.count()).toBeGreaterThan(0)

      // Test mobile navigation
      await page.tap('[data-testid="search-result"]').first()
      await expect(page).toHaveURL(/\/eucharist-real-presence/)
    })

    test('should handle mobile keyboard properly', async ({ page }) => {
      const searchInput = page.locator('[data-testid="search-input"]')

      // Tap to focus
      await page.tap('[data-testid="search-input"]')

      // Type on mobile keyboard (simulate)
      await searchInput.fill('Eucharist')
      await waitForDebounce(page)

      // Should show mobile-optimized results
      await expectVisible(page, '[data-testid="search-results"]')
      await expectVisible(page, '[data-testid="search-result"]')
    })

    test('should adapt to different mobile orientations', async ({ page }) => {
      // Test portrait
      await page.setViewportSize({ width: 375, height: 667 })
      await performSearch(page, 'Eucharist')
      await expectVisible(page, '[data-testid="search-results"]')

      // Test landscape
      await page.setViewportSize({ width: 667, height: 375 })
      await expectVisible(page, '[data-testid="search-results"]')

      // Results should still be accessible
      const results = page.locator('[data-testid="search-result"]')
      expect(await results.count()).toBeGreaterThan(0)
    })
  })

  test.describe('Search Performance', () => {
    test('should handle large search datasets efficiently', async ({ page }) => {
      const searchInput = page.locator('[data-testid="search-input"]')

      // Test broad search term
      const startTime = Date.now()
      await searchInput.fill('a')
      await waitForDebounce(page)

      const searchTime = Date.now() - startTime

      // Search should complete quickly
      expect(searchTime).toBeLessThan(2000)

      // Verify results are displayed
      await expectVisible(page, '[data-testid="search-results"]')
    })

    test('should debounces search properly to avoid excessive API calls', async ({ page }) => {
      const searchInput = page.locator('[data-testid="search-input"]')

      // Rapid typing
      await searchInput.type('E', { delay: 50 })
      await searchInput.type('u', { delay: 50 })
      await searchInput.type('c', { delay: 50 })
      await searchInput.type('a', { delay: 50 })
      await searchInput.type('r', { delay: 50 })
      await searchInput.type('i', { delay: 50 })
      await searchInput.type('s', { delay: 50 })
      await searchInput.type('t', { delay: 50 })

      // Should not show results immediately due to debouncing
      await expect(page.locator('[data-testid="search-results"]')).toBeHidden()

      // Wait for debounce
      await waitForDebounce(page)

      // Now should show results
      await expectVisible(page, '[data-testid="search-results"]')
    })
  })

  test.describe('Search Accessibility', () => {
    test('should have proper ARIA labels and roles', async ({ page }) => {
      const searchInput = page.locator('[data-testid="search-input"]')

      // Should have proper ARIA attributes
      await expect(searchInput).toHaveAttribute('role', 'searchbox')
      await expect(searchInput).toHaveAttribute('aria-label', /search/i)
      await expect(searchInput).toHaveAttribute('placeholder')

      // Results should have proper roles
      await performSearch(page, 'Eucharist')
      await expect(page.locator('[data-testid="search-results"]')).toHaveAttribute('role', 'listbox')
      await expect(page.locator('[data-testid="search-result"]').first()).toHaveAttribute('role', 'option')
    })

    test('should announce search results to screen readers', async ({ page }) => {
      const searchInput = page.locator('[data-testid="search-input"]')

      // Perform search
      await searchInput.fill('Eucharist')
      await waitForDebounce(page)

      // Should have live region for results
      const resultsContainer = page.locator('[data-testid="search-results"]')
      const hasLiveRegion = await resultsContainer.evaluate(el =>
        el.getAttribute('aria-live') || el.getAttribute('aria-live') !== null
      )

      expect(hasLiveRegion).toBeTruthy()
    })
  })

  test.describe('Search Error Handling', () => {
    test('should handle network errors gracefully', async ({ page, context }) => {
      // Simulate network failure during search
      await page.route('**/search**', route => route.abort())

      const searchInput = page.locator('[data-testid="search-input"]')
      await searchInput.fill('Eucharist')
      await waitForDebounce(page)

      // Should show error state or fallback
      const errorElement = page.locator('[data-testid="search-error"]')
      const noResultsElement = page.locator('[data-testid="no-results"]')

      // Should show either error message or no results gracefully
      expect(await errorElement.isVisible().catch(() => false) ||
             await noResultsElement.isVisible().catch(() => false)).toBeTruthy()
    })

    test('should handle malformed input', async ({ page }) => {
      const searchInput = page.locator('[data-testid="search-input"]')

      // Test with very long input
      const longInput = 'a'.repeat(1000)
      await searchInput.fill(longInput)
      await waitForDebounce(page)

      // Should handle gracefully (either limit input or show no results)
      const hasError = await page.locator('[data-testid="search-error"]').isVisible().catch(() => false)
      const hasNoResults = await page.locator('[data-testid="no-results"]').isVisible().catch(() => false)

      expect(hasError || hasNoResults).toBeTruthy()
    })
  })

  test.afterEach(async ({ page }, testInfo) => {
    // Take screenshot on test failure for debugging
    if (testInfo.status !== 'passed') {
      await takeScreenshotOnFailure(page, testInfo.title.replace(/\s+/g, '-'))
    }

    // Clear any search state between tests
    const searchInput = page.locator('[data-testid="search-input"]')
    await searchInput.fill('')
    await page.keyboard.press('Escape')
  })
})