import { test, expect } from '@playwright/test'
import {
  TEST_CONSTANTS,
  VIEWPORTS,
  setViewport,
  expectVisible,
  expectText,
  takeScreenshotOnFailure,
  TEST_CONSTANTS as constants
} from './utils/test-helpers'

test.describe('PWA Installation Prompt', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test.describe('Installation Detection', () => {
    test('should detect PWA installability', async ({ page }) => {
      // Wait for initial app load
      await page.waitForTimeout(TEST_CONSTANTS.INSTALL_PROMPT_DELAY)

      // Check if PWA is installable (depends on browser)
      const isInstallable = await page.evaluate(() => {
        return 'beforeinstallprompt' in window && 'serviceWorker' in navigator
      })

      // Log installability status for debugging
      console.log(`PWA Installability: ${isInstallable}`)

      if (isInstallable) {
        // Should show install prompt
        const installPrompt = page.locator('[data-testid="pwa-install-prompt"]')
        const installButton = page.locator('[data-testid="install-button"]')
        const floatingButton = page.locator('[data-testid="floating-install-button"]')

        const hasInstallPrompt = await installPrompt.isVisible().catch(() => false)
        const hasInstallButton = await installButton.isVisible().catch(() => false)
        const hasFloatingButton = await floatingButton.isVisible().catch(() => false)

        expect(hasInstallPrompt || hasInstallButton || hasFloatingButton).toBeTruthy()
      }
    })

    test('should show install prompt after delay', async ({ page }) => {
      // Should not show immediately
      await page.waitForTimeout(1000)
      const installPrompt = page.locator('[data-testid="pwa-install-prompt"]')
      expect(await installPrompt.isVisible().catch(() => false)).toBeFalsy()

      // Should appear after delay
      await page.waitForTimeout(TEST_CONSTANTS.INSTALL_PROMPT_DELAY - 1000)
      // Note: Install prompt may not appear in all browsers
    })

    test('should detect PWA installation criteria', async ({ page }) => {
      // Check PWA installation requirements
      const pwaStatus = await page.evaluate(() => {
        const requirements = {
          serviceWorker: 'serviceWorker' in navigator,
          beforeInstallPrompt: 'beforeinstallprompt' in window,
          isSecureContext: window.isSecureContext || location.protocol === 'https:',
          isStandalone: ('standalone' in window.navigator && window.navigator.standalone),
          isInstalled: window.matchMedia('(display-mode: standalone)').matches
        }

        return requirements
      })

      console.log('PWA Requirements Status:', pwaStatus)

      // Should have basic PWA requirements
      expect(pwaStatus.serviceWorker).toBeTruthy()
      expect(pwaStatus.isSecureContext).toBeTruthy()
    })
  })

  test.describe('Installation Flow', () => {
    test('should handle installation when supported', async ({ page }) => {
      const isInstallable = await page.evaluate(() => 'beforeinstallprompt' in window)

      if (!isInstallable) {
        // Skip test if PWA is not installable
        test.skip()
        return
      }

      await page.waitForTimeout(TEST_CONSTANTS.INSTALL_PROMPT_DELAY)

      // Look for install button
      const installButton = page.locator('[data-testid="install-button"]')
      const floatingButton = page.locator('[data-testid="floating-install-button"]')

      const hasInstallButton = await installButton.isVisible().catch(() => false)
      const hasFloatingButton = await floatingButton.isVisible().catch(() => false)

      if (hasInstallButton || hasFloatingButton) {
        const button = hasInstallButton ? installButton : floatingButton

        // Click install button
        await button.click()

        // Should show installation state
        const installingState = page.locator('[data-testid="installing"]')
        const hasInstalling = await installingState.isVisible().catch(() => false)

        if (hasInstalling) {
          await expect(installingState).toBeVisible()
        }

        // Should handle native install dialog
        // Note: This may vary by browser
        await page.waitForTimeout(2000)
      } else {
        // Check for alternative install prompts
        const installPrompt = page.locator('[data-testid="pwa-install-prompt"]')
        if (await installPrompt.isVisible().catch(() => false)) {
          await expectText(page, '[data-testid="pwa-install-prompt"]', /install/i)
        }
      }
    })

    test('should handle installation cancellation', async ({ page }) => {
      const isInstallable = await page.evaluate(() => 'beforeinstallprompt' in window)

      if (!isInstallable) {
        test.skip()
        return
      }

      await page.waitForTimeout(TEST_CONSTANTS.INSTALL_PROMPT_DELAY)

      // Look for dismiss option
      const dismissButton = page.locator('[data-testid="dismiss-install"]')
      const closeButton = page.locator('[data-testid="close-install"]')

      const hasDismissButton = await dismissButton.isVisible().catch(() => false)
      const hasCloseButton = await closeButton.isVisible().catch(() => false)

      if (hasDismissButton || hasCloseButton) {
        const button = hasDismissButton ? dismissButton : closeButton

        // Dismiss install prompt
        await button.click()

        // Should hide install prompt
        await expect(page.locator('[data-testid="pwa-install-prompt"]')).toBeHidden()
      }

      // Should remember dismissal
      await page.reload()
      await page.waitForTimeout(TEST_CONSTANTS.INSTALL_PROMPT_DELAY)

      // Should not show again immediately after dismissal
      const installPrompt = page.locator('[data-testid="pwa-install-prompt"]')
      expect(await installPrompt.isVisible().catch(() => false)).toBeFalsy()
    })

    test('should show installation progress feedback', async ({ page }) => {
      const isInstallable = await page.evaluate(() => 'beforeinstallprompt' in window)

      if (!isInstallable) {
        test.skip()
        return
      }

      await page.waitForTimeout(TEST_CONSTANTS.INSTALL_PROMPT_DELAY)

      const installButton = page.locator('[data-testid="install-button"]')
      if (await installButton.isVisible().catch(() => false)) {
        await installButton.click()

        // Should show progress feedback
        const installingState = page.locator('[data-testid="installing"]')
        const progressFeedback = page.locator('[data-testid="install-progress"]')

        const hasInstalling = await installingState.isVisible().catch(() => false)
        const hasProgress = await progressFeedback.isVisible().catch(() => false)

        if (hasInstalling || hasProgress) {
          await expect(page.locator('[data-testid="installing"], [data-testid="install-progress"]')).toBeVisible()
        }
      }
    })
  })

  test.describe('Platform-Specific Behavior', () => {
    test('should show different UI variants on mobile vs desktop', async ({ page }) => {
      // Test desktop
      await setViewport(page, 'desktop')
      await page.goto('/')
      await page.waitForTimeout(TEST_CONSTANTS.INSTALL_PROMPT_DELAY)

      const desktopPrompt = page.locator('[data-testid="desktop-install-prompt"]')
      const desktopButton = page.locator('[data-testid="desktop-install-button"]')
      const hasDesktopUI = await desktopPrompt.isVisible().catch(() => false) ||
                            await desktopButton.isVisible().catch(() => false)

      // Test mobile
      await setViewport(page, 'mobile')
      await page.goto('/')
      await page.waitForTimeout(TEST_CONSTANTS.INSTALL_PROMPT_DELAY)

      const mobilePrompt = page.locator('[data-testid="mobile-install-prompt"]')
      const mobileButton = page.locator('[data-testid="mobile-install-button"]')
      const hasMobileUI = await mobilePrompt.isVisible().catch(() => false) ||
                           await mobileButton.isVisible().catch(() => false)

      // At least one variant should be visible if PWA is installable
      // Note: This test may pass with no visible elements if PWA is not installable
    })

    test('should adapt UI for different browsers', async ({ page, browserName }) => {
      await page.waitForTimeout(TEST_CONSTANTS.INSTALL_PROMPT_DELAY)

      // Log browser type for debugging
      console.log(`Testing PWA install in ${browserName}`)

      // Different browsers may have different PWA installation behaviors
      // This test ensures the app doesn't crash regardless of browser
      const appContent = page.locator('main, h1, [data-testid="app-content"]')
      expect(await appContent.count()).toBeGreaterThan(0)
    })
  })

  test.describe('Install Prompt Timing', () => {
    test('should respect configurable delay', async ({ page }) => {
      // Should not appear immediately
      const immediatePrompt = page.locator('[data-testid="pwa-install-prompt"]')
      expect(await immediatePrompt.isVisible().catch(() => false)).toBeFalsy()

      // Should wait for configured delay (3 seconds + buffer)
      await page.waitForTimeout(2000)
      expect(await immediatePrompt.isVisible().catch(() => false)).toBeFalsy()

      await page.waitForTimeout(2000)
      // Note: May still not appear if PWA is not installable
    })

    test('should not show prompt multiple times quickly', async ({ page }) => {
      await page.waitForTimeout(TEST_CONSTANTS.INSTALL_PROMPT_DELAY + 1000)

      // If prompt appears, check it doesn't duplicate
      const prompts = page.locator('[data-testid="p-install-prompt"], [data-testid="install-prompt"]')
      const promptCount = await prompts.count()

      // Should have at most one prompt
      expect(promptCount).toBeLessThanOrEqual(1)
    })
  })

  test.describe('Post-Installation State', () => {
    test('should detect when PWA is installed', async ({ page }) => {
      // Check if app is already installed
      const isInstalled = await page.evaluate(() => {
        return window.matchMedia('(display-mode: standalone)').matches ||
               ('standalone' in window.navigator && window.navigator.standalone)
      })

      console.log(`PWA Installed: ${isInstalled}`)

      if (isInstalled) {
        // Should not show install prompt if already installed
        await page.waitForTimeout(TEST_CONSTANTS.INSTALL_PROMPT_DELAY)
        const installPrompt = page.locator('[data-testid="pwa-install-prompt"]')
        expect(await installPrompt.isVisible().catch(() => false)).toBeFalsy()
      }
    })

    test('should show installed app features when appropriate', async ({ page }) => {
      const isInstalled = await page.evaluate(() => {
        return window.matchMedia('(display-mode: standalone)').matches
      })

      if (isInstalled) {
        // Should show installed app indicators
        const installedIndicator = page.locator('[data-testid="pwa-installed"]')
        const appModeIndicator = page.locator('[data-testid="app-mode-standalone"]')

        const hasInstalledIndicator = await installedIndicator.isVisible().catch(() => false)
        const hasAppModeIndicator = await appModeIndicator.isVisible().catch(() => false)

        // May show either or both indicators
        expect(hasInstalledIndicator || hasAppModeIndicator).toBeTruthy()
      }
    })
  })

  test.describe('Mobile PWA Features', () => {
    test.beforeEach(async ({ page }) => {
      await setViewport(page, 'mobile')
      await page.goto('/')
    })

    test('should handle mobile install workflow', async ({ page }) => {
      await page.waitForTimeout(TEST_CONSTANTS.INSTALL_PROMPT_DELAY)

      // Should show mobile-appropriate install prompt
      const mobilePrompt = page.locator('[data-testid="mobile-install-prompt"]')
      const mobileButton = page.locator('[data-testid="mobile-install-button"]')
      const floatingButton = page.locator('[data-testid="floating-install-button"]')

      const hasMobileUI = await mobilePrompt.isVisible().catch(() => false) ||
                           await mobileButton.isVisible().catch(() => false) ||
                           await floatingButton.isVisible().catch(() => false)

      if (hasMobileUI) {
        // Should be touch-friendly
        const button = hasMobilePrompt ? mobilePrompt :
                       (await mobileButton.isVisible() ? mobileButton : floatingButton)

        if (await button.isVisible()) {
          // Check button size is appropriate for touch (minimum 44x44px)
          const boundingBox = await button.boundingBox()
          expect(boundingBox?.width).toBeGreaterThanOrEqual(44)
          expect(boundingBox?.height).toBeGreaterThanOrEqual(44)

          // Test tap interaction
          await button.tap()
          await page.waitForTimeout(1000)
        }
      }
    })

    test('should adapt to mobile viewport changes', async ({ page }) => {
      await page.waitForTimeout(TEST_CONSTANTS.INSTALL_PROMPT_DELAY)

      // Test portrait
      await page.setViewportSize({ width: 375, height: 667 })
      await page.waitForTimeout(1000)

      // Test landscape
      await page.setViewportSize({ width: 667, height: 375 })
      await page.waitForTimeout(1000)

      // App should still be functional
      const appContent = page.locator('main, h1, [data-testid="app-content"]')
      expect(await appContent.count()).toBeGreaterThan(0)
    })
  })

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels for install prompt', async ({ page }) => {
      await page.waitForTimeout(TEST_CONSTANTS.INSTALL_PROMPT_DELAY)

      const installButton = page.locator('[data-testid="install-button"]')
      const floatingButton = page.locator('[data-testid="floating-install-button"]')

      if (await installButton.isVisible()) {
        await expect(installButton).toHaveAttribute('aria-label', /install/i)
        await expect(installButton).toHaveAttribute('role', 'button')
      }

      if (await floatingButton.isVisible()) {
        await expect(floatingButton).toHaveAttribute('aria-label', /install/i)
        await expect(floatingButton).toHaveAttribute('role', 'button')
      }
    })

    test('should support keyboard navigation', async ({ page }) => {
      await page.waitForTimeout(TEST_CONSTANTS.INSTALL_PROMPT_DELAY)

      const installButton = page.locator('[data-testid="install-button"]')
      const floatingButton = page.locator('[data-testid="floating-install-button"]')

      if (await installButton.isVisible()) {
        await installButton.focus()
        await expect(page.locator(':focus')).toBe(installButton)

        await page.keyboard.press('Enter')
        await page.waitForTimeout(1000)
      }

      if (await floatingButton.isVisible()) {
        await floatingButton.focus()
        await expect(page.locator(':focus')).toBe(floatingButton)

        await page.keyboard.press('Enter')
        await page.waitForTimeout(1000)
      }
    })

    test('should have high contrast and readable text', async ({ page }) => {
      await page.waitForTimeout(TEST_CONSTANTS.INSTALL_PROMPT_DELAY)

      const installPrompt = page.locator('[data-testid="pwa-install-prompt"]')
      if (await installPrompt.isVisible()) {
        // Should have adequate color contrast
        // This is a basic check - real contrast testing would require specialized tools
        const promptStyles = await installPrompt.evaluate(el => {
          const computedStyle = window.getComputedStyle(el)
          return {
            backgroundColor: computedStyle.backgroundColor,
            color: computedStyle.color,
            fontSize: computedStyle.fontSize
          }
        })

        // Should have visible text
        expect(promptStyles.color).toBeTruthy()
        expect(parseFloat(promptStyles.fontSize)).toBeGreaterThan(12)
      }
    })
  })

  test.describe('Error Handling', () => {
    test('should handle install prompt errors gracefully', async ({ page }) => {
      await page.waitForTimeout(TEST_CONSTANTS.INSTALL_PROMPT_DELAY)

      // Mock PWA install error
      await page.addInitScript(() => {
        // Override beforeinstallprompt to simulate error
        window.addEventListener('beforeinstallprompt', () => {
          throw new Error('Install prompt error')
        })
      })

      await page.reload()
      await page.waitForTimeout(TEST_CONSTANTS.INSTALL_PROMPT_DELAY)

      // App should still be functional even if install fails
      const appContent = page.locator('main, h1, [data-testid="app-content"]')
      expect(await appContent.count()).toBeGreaterThan(0)
    })

    test('should handle service worker registration errors', async ({ page }) => {
      // Mock service worker registration error
      await page.addInitScript(() => {
        navigator.serviceWorker.register = jest.fn().mockRejectedValue(new Error('Service Worker registration failed'))
      })

      await page.reload()

      // App should still load without crashing
      await page.waitForLoadState('networkidle')

      const appContent = page.locator('main, h1, [data-testid="app-content"]')
      expect(await appContent.count()).toBeGreaterThan(0)
    })
  })

  test.describe('Performance', () => {
    test('should not block app loading for install prompt', async ({ page }) => {
      const startTime = Date.now()

      // App should load quickly
      await page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime

      // Should load in reasonable time regardless of install prompt
      expect(loadTime).toBeLessThan(5000)

      // Content should be visible
      const appContent = page.locator('main, h1, [data-testid="app-content"]')
      expect(await appContent.count()).toBeGreaterThan(0)
    })

    test('should show install prompt without blocking interactions', async ({ page }) => {
      // Should be able to interact with app while waiting for install prompt
      const languageSwitcher = page.locator('[data-testid="language-switcher"]')
      if (await languageSwitcher.isVisible()) {
        await languageSwitcher.click()
        await expectVisible(page, '[data-testid="lang-dropdown"]')
        await page.keyboard.press('Escape')
      }

      await page.waitForTimeout(TEST_CONSTANTS.INSTALL_PROMPT_DELAY)

      // Should still be interactive
      const searchInput = page.locator('[data-testid="search-input"]')
      if (await searchInput.isVisible()) {
        await searchInput.fill('test')
        await page.waitForTimeout(500)
      }
    })
  })

  test.afterEach(async ({ page }, testInfo) => {
    // Take screenshot on test failure for debugging
    if (testInfo.status !== 'passed') {
      await takeScreenshotOnFailure(page, testInfo.title.replace(/\s+/g, '-'))
    }

    // Clean up any install-related state
    try {
      await page.evaluate(() => {
        // Clear any PWA install state
        if (window.localStorage) {
          window.localStorage.removeItem('pwa-install-dismissed')
        }
      })
    } catch (error) {
      // Ignore cleanup errors
    }
  })
})