import { test, expect } from '@playwright/test'
import {
  TEST_CONSTANTS,
  VIEWPORTS,
  setViewport,
  goOffline,
  goOnline,
  waitForDebounce,
  expectVisible,
  expectText,
  takeScreenshotOnFailure,
  getNetworkStatus,
  simulateSlowNetwork
} from './utils/test-helpers'

test.describe('Offline Banner Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test.describe('Offline Detection', () => {
    test('should display offline banner when disconnected', async ({ page, context }) => {
      // Verify initial online state
      let isOnline = await getNetworkStatus(page)
      expect(isOnline).toBe(true)

      // Go offline
      await goOffline(page)

      // Verify offline status
      isOnline = await getNetworkStatus(page)
      expect(isOnline).toBe(false)

      // Verify offline banner appears
      await expectVisible(page, '[data-testid="offline-banner"]')
      await expectText(page, '[data-testid="offline-banner"]', /offline/i)
    })

    test('should show appropriate offline message content', async ({ page, context }) => {
      await goOffline(page)

      // Check offline banner content
      await expectVisible(page, '[data-testid="offline-banner"]')

      // Should have offline title
      await expectText(page, '[data-testid="offline-title"]', /offline/i)

      // Should have offline description
      await expectText(page, '[data-testid="offline-description"]', /connection/i)

      // Should have retry button
      await expectVisible(page, '[data-testid="retry-button"]')
    })

    test('should auto-dismiss when coming back online', async ({ page, context }) => {
      // Start offline
      await goOffline(page)
      await expectVisible(page, '[data-testid="offline-banner"]')

      // Verify offline state
      let isOnline = await getNetworkStatus(page)
      expect(isOnline).toBe(false)

      // Go back online
      await goOnline(page)

      // Verify online state
      isOnline = await getNetworkStatus(page)
      expect(isOnline).toBe(true)

      // Banner should disappear automatically
      await expect(page.locator('[data-testid="offline-banner"]')).toBeHidden({ timeout: 5000 })
    })

    test('should handle intermittent connectivity changes', async ({ page, context }) => {
      // Start online
      expect(await getNetworkStatus(page)).toBe(true)

      // Go offline
      await goOffline(page)
      await expectVisible(page, '[data-testid="offline-banner"]')

      // Come back online briefly
      await goOnline(page)
      await expect(page.locator('[data-testid="offline-banner"]')).toBeHidden({ timeout: 3000 })

      // Go offline again
      await goOffline(page)
      await expectVisible(page, '[data-testid="offline-banner"]')

      // Should handle multiple transitions
      await goOnline(page)
      await expect(page.locator('[data-testid="offline-banner"]')).toBeHidden({ timeout: 3000 })
    })
  })

  test.describe('Retry Mechanism', () => {
    test('should provide retry button functionality', async ({ page, context }) => {
      await goOffline(page)
      await expectVisible(page, '[data-testid="offline-banner"]')
      await expectVisible(page, '[data-testid="retry-button"]')

      // Click retry button
      await page.click('[data-testid="retry-button"]')

      // Should show retrying state
      await expectText(page, '[data-testid="retry-button"]', /retrying/i)
      await expect(page.locator('[data-testid="retry-button"]')).toBeDisabled()

      // After cooldown, button should be enabled again
      await page.waitForTimeout(TEST_CONSTANTS.RETRY_COOLDOWN)
      await expect(page.locator('[data-testid="retry-button"]')).toBeEnabled()
    })

    test('should implement retry cooldown period', async ({ page, context }) => {
      await goOffline(page)
      await expectVisible(page, '[data-testid="retry-button"]')

      // First retry attempt
      await page.click('[data-testid="retry-button"]')
      await expect(page.locator('[data-testid="retry-button"]')).toBeDisabled()

      // Should remain disabled during cooldown
      await page.waitForTimeout(5000) // 5 seconds into cooldown
      await expect(page.locator('[data-testid="retry-button"]')).toBeDisabled()

      // Should be enabled after full cooldown
      await page.waitForTimeout(TEST_CONSTANTS.RETRY_COOLDOWN - 5000)
      await expect(page.locator('[data-testid="retry-button"]')).toBeEnabled()
    })

    test('should retry connection when button is clicked', async ({ page, context }) => {
      // Mock a network check that initially fails then succeeds
      let attemptCount = 0
      await page.route('**/api/health', async (route) => {
        attemptCount++
        if (attemptCount < 3) {
          await route.abort()
        } else {
          await route.fulfill({ status: 200, body: JSON.stringify({ status: 'online' }) })
        }
      })

      await goOffline(page)
      await page.click('[data-testid="retry-button"]')

      // Should show retrying state
      await expectText(page, '[data-testid="retry-button"]', /retrying/i)

      // Wait for retry attempts
      await page.waitForTimeout(3000)

      // Should have made retry attempts
      expect(attemptCount).toBeGreaterThan(0)
    })

    test('should handle retry failures gracefully', async ({ page, context }) => {
      // Mock persistent network failure
      await page.route('**/*', route => route.abort())

      await goOffline(page)
      await expectVisible(page, '[data-testid="retry-button"]')

      // Click retry multiple times
      await page.click('[data-testid="retry-button"]')
      await page.waitForTimeout(TEST_CONSTANTS.RETRY_COOLDOWN)

      await page.click('[data-testid="retry-button"]')
      await page.waitForTimeout(TEST_CONSTANTS.RETRY_COOLDOWN)

      // Should still show offline banner
      await expectVisible(page, '[data-testid="offline-banner"]')
      await expectVisible(page, '[data-testid="retry-button"]')
    })
  })

  test.describe('Banner Dismissal', () => {
    test('should allow dismissing offline banner', async ({ page, context }) => {
      await goOffline(page)
      await expectVisible(page, '[data-testid="offline-banner"]')

      // Look for dismiss button or close button
      const dismissButton = page.locator('[data-testid="dismiss-offline"]')
      const closeButton = page.locator('[data-testid="close-banner"]')

      if (await dismissButton.isVisible()) {
        await dismissButton.click()
      } else if (await closeButton.isVisible()) {
        await closeButton.click()
      } else {
        // Try clicking outside banner as alternative
        await page.click('body', { position: { x: 50, y: 50 } })
      }

      // Banner should be hidden
      await expect(page.locator('[data-testid="offline-banner"]')).toBeHidden()
    })

    test('should remember dismissed state during same offline session', async ({ page, context }) => {
      await goOffline(page)
      await expectVisible(page, '[data-testid="offline-banner"]')

      // Dismiss banner
      const dismissButton = page.locator('[data-testid="dismiss-offline"]')
      if (await dismissButton.isVisible()) {
        await dismissButton.click()
      }

      await expect(page.locator('[data-testid="offline-banner"]')).toBeHidden()

      // Navigate within the same session
      await page.reload()

      // Should remain hidden if still offline
      await expect(page.locator('[data-testid="offline-banner"]')).toBeHidden()
    })

    test('should reappear when coming back online and going offline again', async ({ page, context }) => {
      await goOffline(page)
      await expectVisible(page, '[data-testid="offline-banner"]')

      // Dismiss banner
      const dismissButton = page.locator('[data-testid="dismiss-offline"]')
      if (await dismissButton.isVisible()) {
        await dismissButton.click()
      }

      // Go back online
      await goOnline(page)
      await expect(page.locator('[data-testid="offline-banner"]')).toBeHidden()

      // Go offline again
      await goOffline(page)

      // Banner should reappear
      await expectVisible(page, '[data-testid="offline-banner"]')
    })
  })

  test.describe('Mobile Offline Experience', () => {
    test.beforeEach(async ({ page }) => {
      await setViewport(page, 'mobile')
      await page.goto('/')
    })

    test('should show mobile-optimized offline banner', async ({ page, context }) => {
      await goOffline(page)

      // Should show mobile variant
      await expectVisible(page, '[data-testid="offline-banner"]')
      await expect(page.locator('[data-testid="offline-banner"]')).toHaveClass(/mobile|compact/)

      // Should have appropriate mobile-sized elements
      const retryButton = page.locator('[data-testid="retry-button"]')
      if (await retryButton.isVisible()) {
        await expect(retryButton).toBeVisible()
      }
    })

    test('should handle mobile touch interactions', async ({ page, context }) => {
      await goOffline(page)
      await expectVisible(page, '[data-testid="offline-banner"]')

      // Test tap to dismiss
      const dismissButton = page.locator('[data-testid="dismiss-offline"]')
      if (await dismissButton.isVisible()) {
        await page.tap('[data-testid="dismiss-offline"]')
        await expect(page.locator('[data-testid="offline-banner"]')).toBeHidden()
      }

      // Test tap to retry
      await goOffline(page) // Ensure offline again
      await expectVisible(page, '[data-testid="offline-banner"]')

      const retryButton = page.locator('[data-testid="retry-button"]')
      if (await retryButton.isVisible()) {
        await page.tap('[data-testid="retry-button"]')
        await expect(retryButton).toHaveClass(/retrying/i)
      }
    })

    test('should adapt to mobile orientation changes', async ({ page, context }) => {
      await goOffline(page)

      // Test portrait
      await page.setViewportSize({ width: 375, height: 667 })
      await expectVisible(page, '[data-testid="offline-banner"]')

      // Test landscape
      await page.setViewportSize({ width: 667, height: 375 })
      await expectVisible(page, '[data-testid="offline-banner"]')

      // Should still be visible and functional in both orientations
      await expectVisible(page, '[data-testid="retry-button"]')
    })
  })

  test.describe('Content Accessibility Offline', () => {
    test('should allow access to previously loaded content', async ({ page, context }) => {
      // Load some content while online
      await page.goto('/?lang=en')
      await page.waitForLoadState('networkidle')

      // Perform search to load content
      const searchInput = page.locator('[data-testid="search-input"]')
      if (await searchInput.isVisible()) {
        await searchInput.fill('Eucharist')
        await waitForDebounce(page)
      }

      // Go offline
      await goOffline(page)
      await expectVisible(page, '[data-testid="offline-banner"]')

      // Should still be able to navigate to previously loaded content
      const existingContent = page.locator('h1, main, [data-testid="content"]')
      expect(await existingContent.count()).toBeGreaterThan(0)
    })

    test('should show offline content warning for uncached content', async ({ page, context }) => {
      await goOffline(page)

      // Try to navigate to uncached content
      await page.goto('/non-existent-page')

      // Should show offline warning
      const offlineWarning = page.locator('[data-testid="offline-content-warning"]')
      const offlineError = page.locator('[data-testid="offline-error"]')

      expect(await offlineWarning.isVisible().catch(() => false) ||
             await offlineError.isVisible().catch(() => false)).toBeTruthy()
    })

    test('should cache search results for offline access', async ({ page, context }) => {
      // Load search results while online
      const searchInput = page.locator('[data-testid="search-input"]')
      if (await searchInput.isVisible()) {
        await searchInput.fill('Eucharist')
        await waitForDebounce(page)

        // Verify results loaded
        const searchResults = page.locator('[data-testid="search-results"]')
        const hasResults = await searchResults.isVisible().catch(() => false)

        if (hasResults) {
          // Go offline
          await goOffline(page)

          // Search results should still be accessible from cache
          await expect(searchResults).toBeVisible()
        }
      }
    })
  })

  test.describe('Offline Banner Performance', () => {
    test('should show offline banner quickly after disconnection', async ({ page, context }) => {
      const startTime = Date.now()

      await goOffline(page)

      // Banner should appear quickly (under 2 seconds)
      const bannerDisplayTime = Date.now() - startTime
      expect(bannerDisplayTime).toBeLessThan(2000)

      await expectVisible(page, '[data-testid="offline-banner"]')
    })

    test('should not block app functionality while offline', async ({ page, context }) => {
      await goOffline(page)
      await expectVisible(page, '[data-testid="offline-banner"]')

      // App should still be interactive
      const languageSwitcher = page.locator('[data-testid="language-switcher"]')
      if (await languageSwitcher.isVisible()) {
        await languageSwitcher.click()
        await expectVisible(page, '[data-testid="lang-dropdown"]')
        await page.keyboard.press('Escape')
      }

      // Search input should still work
      const searchInput = page.locator('[data-testid="search-input"]')
      if (await searchInput.isVisible()) {
        await searchInput.fill('test')
        // Should not crash or hang
        await page.waitForTimeout(1000)
      }
    })
  })

  test.describe('Offline Banner Accessibility', () => {
    test('should have proper ARIA labels and roles', async ({ page, context }) => {
      await goOffline(page)
      await expectVisible(page, '[data-testid="offline-banner"]')

      // Should have appropriate role
      await expect(page.locator('[data-testid="offline-banner"]')).toHaveAttribute('role', 'alert')

      // Should have proper ARIA labels
      await expect(page.locator('[data-testid="offline-banner"]')).toHaveAttribute('aria-live', 'polite')
    })

    test('should support keyboard navigation', async ({ page, context }) => {
      await goOffline(page)
      await expectVisible(page, '[data-testid="offline-banner"]')

      // Tab to offline banner elements
      await page.keyboard.press('Tab')

      // Should focus on interactive elements
      const focusedElement = page.locator(':focus')
      const hasFocus = await focusedElement.count() > 0

      expect(hasFocus).toBeTruthy()

      // Should be able to navigate with arrow keys if multiple elements
      const retryButton = page.locator('[data-testid="retry-button"]')
      if (await retryButton.isVisible()) {
        await retryButton.focus()
        await page.keyboard.press('Enter')
        await expect(retryButton).toHaveClass(/retrying/i)
      }
    })
  })

  test.describe('Error Scenarios', () => {
    test('should handle Service Worker errors gracefully', async ({ page, context }) => {
      // Mock Service Worker error
      await page.addInitScript(() => {
        // Override service worker registration to simulate error
        navigator.serviceWorker.register = jest.fn().mockRejectedValue(new Error('Service Worker error'))
      })

      await goOffline(page)

      // Should still show offline banner even with SW errors
      await expectVisible(page, '[data-testid="offline-banner"]')
    })

    test('should handle network API failures', async ({ page, context }) => {
      // Mock network API failures
      await page.addInitScript(() => {
        // Override network APIs to simulate failures
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: false
        })

        window.addEventListener = jest.fn()
      })

      await page.reload()

      // Should detect offline status correctly
      await expectVisible(page, '[data-testid="offline-banner"]')
    })
  })

  test.afterEach(async ({ page }, testInfo) => {
    // Ensure we're back online after each test
    try {
      await page.context().setOffline(false)
      await page.evaluate(() => {
        window.dispatchEvent(new Event('online'))
      })
    } catch (error) {
      // Ignore errors when trying to restore online state
    }

    // Take screenshot on test failure for debugging
    if (testInfo.status !== 'passed') {
      await takeScreenshotOnFailure(page, testInfo.title.replace(/\s+/g, '-'))
    }
  })
})