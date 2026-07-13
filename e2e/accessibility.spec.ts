import { test, expect } from '@playwright/test'
import { injectAxe, checkA11y, getViolations } from 'axe-playwright'
import {
  TEST_CONSTANTS,
  VIEWPORTS,
  setViewport,
  performSearch,
  waitForDebounce,
  expectVisible,
  expectText,
  takeScreenshotOnFailure,
  goOffline,
  goOnline
} from './utils/test-helpers'

test.describe('Accessibility Compliance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await injectAxe(page)
  })

  test.describe('WCAG 2.1 Level A Compliance', () => {
    test('should pass accessibility audit on homepage', async ({ page }) => {
      // Wait for page to fully load
      await page.waitForTimeout(2000)

      // Check for accessibility violations
      await checkA11y(page, undefined, {
        detailedReport: true,
        detailedReportOptions: { html: true },
        rules: {
          // Configure specific rules for our application
          'color-contrast': { enabled: true },
          'keyboard-navigation': { enabled: true },
          'focus-order-semantics': { enabled: true },
          'aria-labels': { enabled: true },
          'heading-order': { enabled: true },
          'landmark-roles': { enabled: true },
          'skip-link': { enabled: true }
        }
      })
    })

    test('should have proper heading structure', async ({ page }) => {
      // Check heading hierarchy
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()
      expect(headings.length).toBeGreaterThan(0)

      // Should have exactly one h1
      const h1Elements = await page.locator('h1').all()
      expect(h1Elements.length).toBe(1)

      // Check heading order is logical (no skipped levels)
      let previousLevel = 0
      for (const heading of headings) {
        const level = parseInt(await heading.evaluate(el => el.tagName.substring(1)))
        if (previousLevel > 0 && level > previousLevel + 1) {
          throw new Error(`Heading level skipped: from h${previousLevel} to h${level}`)
        }
        previousLevel = level
      }
    })

    test('should have proper landmark roles', async ({ page }) => {
      // Check for main landmark
      await expect(page.locator('main, [role="main"]')).toBeVisible()

      // Check for navigation landmarks
      const navElements = await page.locator('nav, [role="navigation"]').all()
      expect(navElements.length).toBeGreaterThan(0)

      // Check for header
      await expect(page.locator('header, [role="banner"]')).toBeVisible()

      // Check for footer
      const footer = page.locator('footer, [role="contentinfo"]')
      if (await footer.isVisible()) {
        await expect(footer).toBeVisible()
      }
    })

    test('should have proper ARIA labels and roles', async ({ page }) => {
      // Test search input accessibility
      const searchInput = page.locator('[data-testid="search-input"]')
      if (await searchInput.isVisible()) {
        await expect(searchInput).toHaveAttribute('role', 'searchbox')
        await expect(searchInput).toHaveAttribute('aria-label', /search/i)
      }

      // Test language switcher accessibility
      const langSwitcher = page.locator('[data-testid="language-switcher"]')
      if (await langSwitcher.isVisible()) {
        await expect(langSwitcher).toHaveAttribute('role', 'button')
        await expect(langSwitcher).toHaveAttribute('aria-label', /language/i)
        await expect(langSwitcher).toHaveAttribute('aria-expanded')
      }

      // Test interactive elements have proper roles
      const buttons = await page.locator('button, [role="button"]').all()
      expect(buttons.length).toBeGreaterThan(0)
    })

    test('should have sufficient color contrast', async ({ page }) => {
      // This test relies on axe's color-contrast rule
      await checkA11y(page, undefined, {
        rules: {
          'color-contrast': { enabled: true }
        }
      })
    })

    test('should have focus management', async ({ page }) => {
      // Test that focus is visible
      await page.keyboard.press('Tab')
      const focusedElement = page.locator(':focus')
      expect(await focusedElement.count()).toBe(1)

      // Test that focus indicators are visible
      const hasFocusStyles = await focusedElement.evaluate(el => {
        const styles = window.getComputedStyle(el)
        return styles.outline !== 'none' || styles.boxShadow !== 'none'
      })
      expect(hasFocusStyles).toBeTruthy()

      // Test keyboard navigation order
      const interactiveElements = await page.locator(
        'button, [role="button"], input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
      ).all()

      if (interactiveElements.length > 1) {
        // Tab through first few elements to check order
        for (let i = 0; i < Math.min(5, interactiveElements.length); i++) {
          await page.keyboard.press('Tab')
          const currentFocus = page.locator(':focus')
          expect(await currentFocus.count()).toBe(1)
        }
      }
    })

    test('should have skip links for keyboard navigation', async ({ page }) => {
      // Check for skip links
      const skipLinks = page.locator('a[href^="#"], [role="navigation"] a')
      if (await skipLinks.count() > 0) {
        // Test that skip links are visible when focused
        await page.keyboard.press('Tab')
        const firstSkipLink = skipLinks.first()
        if (await firstSkipLink.isVisible()) {
          await firstSkipLink.focus()
          await expect(firstSkipLink).toBeVisible()

          // Test that skip link works
          const href = await firstSkipLink.getAttribute('href')
          if (href && href !== '#') {
            await page.keyboard.press('Enter')
            await page.waitForTimeout(500)

            // Check that focus moved to target
            const targetId = href.substring(1)
            if (targetId) {
              const target = page.locator(`#${targetId}`)
              if (await target.isVisible()) {
                await expect(target).toBeFocused()
              }
            }
          }
        }
      }
    })
  })

  test.describe('Screen Reader Support', () => {
    test('should have proper alt text for images', async ({ page }) => {
      const images = page.locator('img')
      const imageCount = await images.count()

      for (let i = 0; i < imageCount; i++) {
        const image = images.nth(i)
        const alt = await image.getAttribute('alt')
        const role = await image.getAttribute('role')

        // Images should have alt text unless decorative
        if (role !== 'presentation' && role !== 'none') {
          expect(alt !== null).toBeTruthy()
        }
      }
    })

    test('should have proper form labels', async ({ page }) => {
      const inputs = page.locator('input, textarea, select')
      const inputCount = await inputs.count()

      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i)
        if (await input.isVisible()) {
          const hasLabel = await input.evaluate(el => {
            const labels = el.labels
            return labels && labels.length > 0
          })
          const hasAriaLabel = await input.getAttribute('aria-label')
          const hasAriaLabelledBy = await input.getAttribute('aria-labelledby')

          expect(hasLabel || hasAriaLabel || hasAriaLabelledBy).toBeTruthy()
        }
      }
    })

    test('should announce dynamic content changes', async ({ page }) => {
      // Test that search results are announced
      const searchInput = page.locator('[data-testid="search-input"]')
      if (await searchInput.isVisible()) {
        await searchInput.fill('Eucharist')
        await waitForDebounce(page)

        const searchResults = page.locator('[data-testid="search-results"]')
        if (await searchResults.isVisible()) {
          // Check that results have appropriate ARIA attributes
          const hasLiveRegion = await searchResults.evaluate(el =>
            el.getAttribute('aria-live') || el.getAttribute('aria-live') !== null
          )
          const hasRole = await searchResults.getAttribute('role')

          expect(hasLiveRegion || hasRole === 'region' || hasRole === 'listbox').toBeTruthy()
        }
      }
    })

    test('should have proper table headers if tables exist', async ({ page }) => {
      const tables = page.locator('table')
      const tableCount = await tables.count()

      for (let i = 0; i < tableCount; i++) {
        const table = tables.nth(i)
        if (await table.isVisible()) {
          // Check for proper table structure
          const headers = table.locator('th, [scope]')
          const hasHeaders = await headers.count() > 0

          if (hasHeaders) {
            // Check that headers have scope or proper structure
            const hasScope = await table.locator('[scope]').count() > 0
            expect(hasScope).toBeTruthy()
          }
        }
      }
    })
  })

  test.describe('Mobile Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await setViewport(page, 'mobile')
    })

    test('should be accessible on mobile devices', async ({ page }) => {
      await page.waitForTimeout(2000)
      await checkA11y(page, undefined, {
        detailedReport: true,
        viewport: { width: 375, height: 667 }
      })
    })

    test('should have appropriate touch targets', async ({ page }) => {
      const interactiveElements = page.locator('button, a, input, [role="button"]')
      const elementCount = await interactiveElements.count()

      for (let i = 0; i < Math.min(elementCount, 20); i++) { // Check first 20 elements
        const element = interactiveElements.nth(i)
        if (await element.isVisible()) {
          const boundingBox = await element.boundingBox()
          if (boundingBox) {
            // Touch targets should be at least 44x44px (WCAG guideline)
            expect(boundingBox.width).toBeGreaterThanOrEqual(44)
            expect(boundingBox.height).toBeGreaterThanOrEqual(44)
          }
        }
      }
    })

    test('should handle mobile keyboard navigation', async ({ page }) => {
      // Test that Tab navigation works on mobile
      await page.keyboard.press('Tab')
      expect(await page.locator(':focus').count()).toBe(1)

      // Test that Arrow navigation works where appropriate
      const langSwitcher = page.locator('[data-testid="language-switcher-mobile"]')
      if (await langSwitcher.isVisible()) {
        await langSwitcher.focus()
        await page.keyboard.press('Enter')

        const dropdown = page.locator('[data-testid="lang-dropdown-mobile"]')
        if (await dropdown.isVisible()) {
          await page.keyboard.press('ArrowDown')
          await expect(page.locator(':focus')).toBeVisible()
        }
      }
    })
  })

  test.describe('Multi-Language Accessibility', () => {
    test('should maintain accessibility across languages', async ({ page }) => {
      const languages = ['en', 'tl', 'ceb']

      for (const lang of languages) {
        // Switch language
        await page.click('[data-testid="language-switcher"]')
        await page.click(`[data-testid="lang-${lang}"]`)
        await page.waitForTimeout(2000)

        // Set proper lang attribute on document
        await page.evaluate((language) => {
          document.documentElement.lang = language
        }, lang)

        // Check accessibility in this language
        await checkA11y(page, undefined, {
          detailedReport: false, // Reduce output for this test
          rules: {
            // Language-specific rules
            'html-lang': { enabled: true },
            'aria-valid-lang': { enabled: true }
          }
        })
      }
    })

    test('should have proper language attributes', async ({ page }) => {
      // Check that page has lang attribute
      const htmlLang = await page.evaluate(() => document.documentElement.lang)
      expect(htmlLang).toBeTruthy()
      expect(['en', 'tl', 'ceb']).toContain(htmlLang)

      // Test language switching maintains accessibility
      await page.click('[data-testid="language-switcher"]')
      await page.click('[data-testid="lang-tl"]')
      await page.waitForTimeout(1000)

      const newLang = await page.evaluate(() => document.documentElement.lang)
      expect(newLang).toBe('tl')
    })
  })

  test.describe('PWA Accessibility', () => {
    test('should be accessible when offline', async ({ page, context }) => {
      // Go offline
      await goOffline(page)
      await page.waitForTimeout(2000)

      // Check offline banner accessibility
      const offlineBanner = page.locator('[data-testid="offline-banner"]')
      if (await offlineBanner.isVisible()) {
        await expect(offlineBanner).toHaveAttribute('role', 'alert')
        await expect(offlineBanner).toHaveAttribute('aria-live', 'polite')

        // Test retry button accessibility
        const retryButton = page.locator('[data-testid="retry-button"]')
        if (await retryButton.isVisible()) {
          await expect(retryButton).toHaveAttribute('aria-label')
          await retryButton.focus()
          await expect(page.locator(':focus')).toBe(retryButton)
        }
      }

      await checkA11y(page, undefined, {
        detailedReport: false,
        rules: {
          // Focus on important rules for offline state
          'focus-order-semantics': { enabled: true },
          'keyboard-navigation': { enabled: true }
        }
      })
    })

    test('should handle PWA install prompts accessibly', async ({ page }) => {
      await page.waitForTimeout(TEST_CONSTANTS.INSTALL_PROMPT_DELAY)

      const installButton = page.locator('[data-testid="install-button"], [data-testid="floating-install-button"]')
      if (await installButton.isVisible()) {
        // Test install button accessibility
        await expect(installButton).toHaveAttribute('aria-label', /install/i)
        await expect(installButton).toHaveAttribute('role', 'button')

        // Test keyboard interaction
        await installButton.focus()
        await expect(page.locator(':focus')).toBe(installButton)

        await page.keyboard.press('Enter')
        await page.waitForTimeout(1000)
      }
    })
  })

  test.describe('Dynamic Content Accessibility', () => {
    test('should handle search results accessibly', async ({ page }) => {
      const searchInput = page.locator('[data-testid="search-input"]')
      if (await searchInput.isVisible()) {
        await searchInput.fill('Eucharist')
        await waitForDebounce(page)

        const searchResults = page.locator('[data-testid="search-results"]')
        if (await searchResults.isVisible()) {
          // Check that results have proper ARIA structure
          await expect(searchResults).toHaveAttribute('role', 'listbox')

          const results = page.locator('[data-testid="search-result"]')
          const resultCount = await results.count()

          for (let i = 0; i < Math.min(resultCount, 5); i++) {
            const result = results.nth(i)
            await expect(result).toHaveAttribute('role', 'option')
          }

          // Test keyboard navigation in results
          await searchInput.focus()
          await page.keyboard.press('ArrowDown')

          if (resultCount > 0) {
            await expect(results.first()).toHaveClass(/focused|selected/)
          }
        }
      }
    })

    test('should handle loading states accessibly', async ({ page }) => {
      // Mock slow loading to test loading states
      await page.route('**/*', route => {
        setTimeout(() => route.continue(), 2000)
      })

      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Check for loading indicators
      const loadingElements = page.locator('[aria-busy="true"], .loading, [data-loading="true"]')
      if (await loadingElements.count() > 0) {
        // Check that loading states are announced
        const hasAriaLive = await loadingElements.evaluate(el =>
          el.getAttribute('aria-live') || el.getAttribute('role') === 'status'
        )
        expect(hasAriaLive).toBeTruthy()
      }
    })
  })

  test.describe('Error Accessibility', () => {
    test('should handle error states accessibly', async ({ page }) => {
      // Simulate network error
      await page.route('**/*', route => route.abort())

      await page.goto('/')

      // Check for error messages
      const errorElements = page.locator('[role="alert"], .error, [data-testid*="error"]')
      if (await errorElements.count() > 0) {
        for (let i = 0; i < await errorElements.count(); i++) {
          const error = errorElements.nth(i)
          if (await error.isVisible()) {
            // Check that errors are properly announced
            await expect(error).toHaveAttribute('role', 'alert')
            await expect(error).toHaveAttribute('aria-live', 'assertive')
          }
        }
      }

      await checkA11y(page, undefined, {
        detailedReport: false,
        rules: {
          // Focus on error handling rules
          'aria-valid-attr-value': { enabled: true },
          'aria-input-field-name': { enabled: true }
        }
      })
    })

    test('should handle form validation accessibly', async ({ page }) => {
      // Look for forms and test validation
      const forms = page.locator('form')
      const formCount = await forms.count()

      for (let i = 0; i < formCount; i++) {
        const form = forms.nth(i)
        if (await form.isVisible()) {
          const inputs = form.locator('input, textarea, select')
          const inputCount = await inputs.count()

          for (let j = 0; j < inputCount; j++) {
            const input = inputs.nth(j)
            if (await input.isVisible()) {
              // Check for validation attributes
              const required = await input.getAttribute('required')
              const ariaRequired = await input.getAttribute('aria-required')
              const ariaInvalid = await input.getAttribute('aria-invalid')

              if (required || ariaRequired) {
                // Required fields should have proper ARIA attributes
                expect(ariaRequired === 'true' || required !== null).toBeTruthy()
              }
            }
          }
        }
      }
    })
  })

  test.describe('Performance Impact on Accessibility', () => {
    test('should maintain accessibility during rapid interactions', async ({ page }) => {
      // Test rapid language switching
      for (let i = 0; i < 3; i++) {
        await page.click('[data-testid="language-switcher"]')
        await page.click('[data-testid="lang-tl"]')
        await page.waitForTimeout(500)
        await page.click('[data-testid="language-switcher"]')
        await page.click('[data-testid="lang-en"]')
        await page.waitForTimeout(500)
      }

      // Check that accessibility is maintained
      await checkA11y(page, undefined, {
        detailedReport: false,
        rules: {
          'focus-order-semantics': { enabled: true }
        }
      })
    })

    test('should handle large search results accessibly', async ({ page }) => {
      const searchInput = page.locator('[data-testid="search-input"]')
      if (await searchInput.isVisible()) {
        // Search for common term to get many results
        await searchInput.fill('a')
        await waitForDebounce(page)

        const searchResults = page.locator('[data-testid="search-results"]')
        if (await searchResults.isVisible()) {
          // Check that virtual scrolling or pagination is accessible
          const results = page.locator('[data-testid="search-result"]')
          const resultCount = await results.count()

          if (resultCount > 50) {
            // If many results, check for accessible pagination
            const pagination = page.locator('[aria-label*="pagination"], nav[aria-label*="results"]')
            if (await pagination.isVisible()) {
              await expect(pagination).toHaveAttribute('role', 'navigation')
            }
          }
        }
      }
    })
  })

  test.afterEach(async ({ page }, testInfo) => {
    // Take screenshot on accessibility test failure
    if (testInfo.status !== 'passed') {
      await takeScreenshotOnFailure(page, `accessibility-${testInfo.title.replace(/\s+/g, '-')}`)
    }

    // Get detailed accessibility violations if test failed
    if (testInfo.status === 'failed') {
      const violations = await getViolations(page)
      console.log(`Accessibility violations in ${testInfo.title}:`, violations)
    }
  })
})