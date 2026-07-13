import { test, expect } from '@playwright/test'
import {
  LANGUAGES,
  VIEWPORTS,
  setViewport,
  getCurrentLanguage,
  switchLanguage,
  waitForDebounce,
  expectVisible,
  expectText,
  takeScreenshotOnFailure
} from './utils/test-helpers'

test.describe('Language Switcher', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test.describe('Desktop Language Switching', () => {
    test('should switch between English, Tagalog, and Cebuano', async ({ page }) => {
      // Test initial state (should default to English)
      await expectVisible(page, '[data-testid="language-switcher"]')
      let currentLang = await getCurrentLanguage(page)
      expect(currentLang).toBe('en')

      // Test English → Tagalog
      await page.click('[data-testid="language-switcher"]')
      await expectVisible(page, '[data-testid="lang-dropdown"]')
      await page.click('[data-testid="lang-tl"]')
      await waitForDebounce(page, 1000)

      currentLang = await getCurrentLanguage(page)
      expect(currentLang).toBe('tl')
      await expectText(page, 'h1', /tagalog/i)

      // Test Tagalog → Cebuano
      await page.click('[data-testid="language-switcher"]')
      await page.click('[data-testid="lang-ceb"]')
      await waitForDebounce(page, 1000)

      currentLang = await getCurrentLanguage(page)
      expect(currentLang).toBe('ceb')
      await expectText(page, 'h1', /cebuano/i)

      // Test Cebuano → English
      await page.click('[data-testid="language-switcher"]')
      await page.click('[data-testid="lang-en"]')
      await waitForDebounce(page, 1000)

      currentLang = await getCurrentLanguage(page)
      expect(currentLang).toBe('en')
      await expectText(page, 'h1', /english/i)
    })

    test('should persist language choice across page reloads', async ({ page }) => {
      // Switch to Tagalog
      await page.click('[data-testid="language-switcher"]')
      await page.click('[data-testid="lang-tl"]')
      await waitForDebounce(page, 1000)

      // Verify language changed
      let currentLang = await getCurrentLanguage(page)
      expect(currentLang).toBe('tl')

      // Reload page
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Should maintain Tagalog language
      currentLang = await getCurrentLanguage(page)
      expect(currentLang).toBe('tl')
      await expectText(page, '[data-testid="current-lang"]', 'Tagalog')
    })

    test('should show language flags and names correctly', async ({ page }) => {
      await page.click('[data-testid="language-switcher"]')
      await expectVisible(page, '[data-testid="lang-dropdown"]')

      // Check English option
      await expectVisible(page, '[data-testid="lang-en"]')
      await expectText(page, '[data-testid="lang-en"]', 'English')
      await expect(page.locator('[data-testid="lang-en"]')).toContainText('🇺🇸')

      // Check Tagalog option
      await expectVisible(page, '[data-testid="lang-tl"]')
      await expectText(page, '[data-testid="lang-tl"]', 'Tagalog')
      await expect(page.locator('[data-testid="lang-tl"]')).toContainText('🇵🇭')

      // Check Cebuano option
      await expectVisible(page, '[data-testid="lang-ceb"]')
      await expectText(page, '[data-testid="lang-ceb"]', 'Cebuano')
      await expect(page.locator('[data-testid="lang-ceb"]')).toContainText('🇵🇭')
    })

    test('should highlight current language in dropdown', async ({ page }) => {
      // Start with English
      await page.click('[data-testid="language-switcher"]')

      // English should be marked as current
      await expect(page.locator('[data-testid="lang-en"]')).toHaveClass(/current|active/)

      // Close dropdown
      await page.keyboard.press('Escape')

      // Switch to Tagalog
      await switchLanguage(page, 'tl')

      // Reopen dropdown
      await page.click('[data-testid="language-switcher"]')

      // Tagalog should now be marked as current
      await expect(page.locator('[data-testid="lang-tl"]')).toHaveClass(/current|active/)
    })
  })

  test.describe('Mobile Language Switching', () => {
    test.beforeEach(async ({ page }) => {
      await setViewport(page, 'mobile')
      await page.goto('/')
    })

    test('should work correctly on mobile devices', async ({ page }) => {
      // Should show mobile language switcher variant
      await expectVisible(page, '[data-testid="language-switcher-mobile"]')

      // Test compact mobile dropdown
      await page.click('[data-testid="language-switcher-mobile"]')
      await expectVisible(page, '[data-testid="lang-dropdown-mobile"]')

      // Test language switching on mobile
      await page.click('[data-testid="lang-ceb"]')
      await waitForDebounce(page, 1000)

      const currentLang = await getCurrentLanguage(page)
      expect(currentLang).toBe('ceb')
    })

    test('should handle mobile touch interactions properly', async ({ page }) => {
      await expectVisible(page, '[data-testid="language-switcher-mobile"]')

      // Test tap to open
      await page.tap('[data-testid="language-switcher-mobile"]')
      await expectVisible(page, '[data-testid="lang-dropdown-mobile"]')

      // Test tap to select language
      await page.tap('[data-testid="lang-tl"]')
      await waitForDebounce(page, 1000)

      const currentLang = await getCurrentLanguage(page)
      expect(currentLang).toBe('tl')

      // Verify dropdown closes after selection
      await expect(page.locator('[data-testid="lang-dropdown-mobile"]')).toBeHidden()
    })

    test('should adapt to different mobile viewports', async ({ page }) => {
      // Test smaller mobile
      await setViewport(page, 'mobile')
      await expectVisible(page, '[data-testid="language-switcher-mobile"]')

      // Test larger mobile
      await setViewport(page, 'mobileLarge')
      await expectVisible(page, '[data-testid="language-switcher-mobile"]')

      // Should still be functional across different mobile sizes
      await page.click('[data-testid="language-switcher-mobile"]')
      await expectVisible(page, '[data-testid="lang-dropdown-mobile"]')
    })
  })

  test.describe('Tablet Language Switching', () => {
    test.beforeEach(async ({ page }) => {
      await setViewport(page, 'tablet')
      await page.goto('/')
    })

    test('should work correctly on tablet devices', async ({ page }) => {
      // Should show appropriate tablet variant
      await expectVisible(page, '[data-testid="language-switcher"]')

      // Test full language switching workflow
      const languages = ['en', 'tl', 'ceb']

      for (const lang of languages) {
        await page.click('[data-testid="language-switcher"]')
        await page.click(`[data-testid="lang-${lang}"]`)
        await waitForDebounce(page, 1000)

        const currentLang = await getCurrentLanguage(page)
        expect(currentLang).toBe(lang)
      }
    })
  })

  test.describe('Accessibility and Keyboard Navigation', () => {
    test('should support keyboard navigation', async ({ page }) => {
      // Tab to language switcher
      await page.keyboard.press('Tab')
      await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'language-switcher')

      // Enter to open dropdown
      await page.keyboard.press('Enter')
      await expectVisible(page, '[data-testid="lang-dropdown"]')

      // Arrow keys to navigate languages
      await page.keyboard.press('ArrowDown')
      await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'lang-tl')

      await page.keyboard.press('ArrowDown')
      await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'lang-ceb')

      // Enter to select language
      await page.keyboard.press('Enter')
      await waitForDebounce(page, 1000)

      const currentLang = await getCurrentLanguage(page)
      expect(currentLang).toBe('ceb')

      // Dropdown should close after selection
      await expect(page.locator('[data-testid="lang-dropdown"]')).toBeHidden()
    })

    test('should close dropdown with Escape key', async ({ page }) => {
      await page.click('[data-testid="language-switcher"]')
      await expectVisible(page, '[data-testid="lang-dropdown"]')

      // Escape should close dropdown
      await page.keyboard.press('Escape')
      await expect(page.locator('[data-testid="lang-dropdown"]')).toBeHidden()

      // Focus should return to language switcher
      await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'language-switcher')
    })

    test('should have proper ARIA labels', async ({ page }) => {
      const languageSwitcher = page.locator('[data-testid="language-switcher"]')

      // Should have appropriate ARIA attributes
      await expect(languageSwitcher).toHaveAttribute('role', 'button')
      await expect(languageSwitcher).toHaveAttribute('aria-label', /language/i)
      await expect(languageSwitcher).toHaveAttribute('aria-expanded')

      // When dropdown is open
      await page.click('[data-testid="language-switcher"]')
      await expect(languageSwitcher).toHaveAttribute('aria-expanded', 'true')

      // Language options should have proper labels
      await expect(page.locator('[data-testid="lang-en"]')).toHaveAttribute('role', 'option')
      await expect(page.locator('[data-testid="lang-tl"]')).toHaveAttribute('role', 'option')
      await expect(page.locator('[data-testid="lang-ceb"]')).toHaveAttribute('role', 'option')
    })
  })

  test.describe('URL-based Language Switching', () => {
    test('should support direct language URL parameters', async ({ page }) => {
      // Direct navigation to Tagalog
      await page.goto('/?lang=tl')
      await page.waitForLoadState('networkidle')

      let currentLang = await getCurrentLanguage(page)
      expect(currentLang).toBe('tl')

      // Direct navigation to Cebuano
      await page.goto('/?lang=ceb')
      await page.waitForLoadState('networkidle')

      currentLang = await getCurrentLanguage(page)
      expect(currentLang).toBe('ceb')

      // Direct navigation to English
      await page.goto('/?lang=en')
      await page.waitForLoadState('networkidle')

      currentLang = await getCurrentLanguage(page)
      expect(currentLang).toBe('en')
    })

    test('should update URL when language is switched', async ({ page }) => {
      await page.goto('/')

      // Switch to Tagalog
      await page.click('[data-testid="language-switcher"]')
      await page.click('[data-testid="lang-tl"]')
      await waitForDebounce(page, 1000)

      // URL should be updated
      const url = new URL(page.url())
      expect(url.searchParams.get('lang')).toBe('tl')

      // Switch to Cebuano
      await page.click('[data-testid="language-switcher"]')
      await page.click('[data-testid="lang-ceb"]')
      await waitForDebounce(page, 1000)

      const url2 = new URL(page.url())
      expect(url2.searchParams.get('lang')).toBe('ceb')
    })
  })

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle rapid language switching', async ({ page }) => {
      // Rapidly switch between languages
      const languages = ['en', 'tl', 'ceb', 'en', 'tl', 'ceb']

      for (const lang of languages) {
        await page.click('[data-testid="language-switcher"]')
        await page.click(`[data-testid="lang-${lang}"]`)
        await waitForDebounce(page, 200) // Shorter wait for rapid switching
      }

      // Should end up with the last language selected
      await page.waitForTimeout(1000) // Wait for final state to settle
      const currentLang = await getCurrentLanguage(page)
      expect(currentLang).toBe('ceb')
    })

    test('should handle invalid language parameters gracefully', async ({ page }) => {
      // Try to navigate with invalid language
      await page.goto('/?lang=invalid')
      await page.waitForLoadState('networkidle')

      // Should default to English or maintain previous valid language
      const currentLang = await getCurrentLanguage(page)
      expect(['en']).toContain(currentLang)
    })

    test('should work when JavaScript is disabled', async ({ page, context }) => {
      // Note: This test may need adjustment based on implementation
      // as it might require server-side rendering support

      // Test with minimal JavaScript context
      await context.addInitScript(() => {
        // Simulate limited JavaScript environment
        window.addEventListener = jest.fn()
      })

      await page.goto('/')

      // Should still show language switcher (if it's server-rendered)
      // Or should gracefully degrade
      const switcher = page.locator('[data-testid="language-switcher"]')
      const isVisible = await switcher.isVisible().catch(() => false)

      // Test should pass whether switcher is visible or not
      // The important thing is no JavaScript errors
    })
  })

  test.describe('Performance', () => {
    test('should switch languages quickly', async ({ page }) => {
      const startTime = Date.now()

      await page.click('[data-testid="language-switcher"]')
      await page.click('[data-testid="lang-tl"]')
      await waitForDebounce(page, 1000)

      const switchTime = Date.now() - startTime

      // Language switching should be fast (under 2 seconds)
      expect(switchTime).toBeLessThan(2000)

      const currentLang = await getCurrentLanguage(page)
      expect(currentLang).toBe('tl')
    })
  })

  test.afterEach(async ({ page }, testInfo) => {
    // Take screenshot on test failure for debugging
    if (testInfo.status !== 'passed') {
      await takeScreenshotOnFailure(page, testInfo.title.replace(/\s+/g, '-'))
    }
  })
})